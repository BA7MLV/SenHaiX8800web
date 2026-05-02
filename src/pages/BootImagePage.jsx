import { useMemo, useState } from 'react';
import { Badge } from '../components/ui/Badge.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Card } from '../components/ui/Card.jsx';
import { PageTitleBar } from '../components/common/PageTitleBar.jsx';
import { Field } from '../components/ui/Field.jsx';
import { Input } from '../components/ui/Input.jsx';
import { PageLayout } from '../components/ui/PageLayout.jsx';
import { Surface } from '../components/ui/Surface.jsx';
import { useAppContext } from '../context/AppContext';
import { BootImageProbeSession } from '../protocol/BootImageProbeSession';
import { decodeChannelBlockSummary } from '../protocol/shx8800.js';

const PRESET_PROBES = [
  { label: '0x48 @ 0x0000', cmd: '48', offset: '0000' },
  { label: '0x48 @ 0x0040', cmd: '48', offset: '0040' },
  { label: '0x49 @ 0x0000', cmd: '49', offset: '0000' },
  { label: '0x49 @ 0x0040', cmd: '49', offset: '0040' },
  { label: '0x4A @ 0x0000', cmd: '4A', offset: '0000' },
  { label: '0x4A @ 0x0040', cmd: '4A', offset: '0040' },
  { label: '0x52 @ 0x0000', cmd: '52', offset: '0000' },
  { label: '0x53 @ 0x0000', cmd: '53', offset: '0000' }
];

const MEMORY_SWEEP_PRESETS = [
  { label: '0x0000 - 0x03C0', start: '0000', count: '16', step: '0040' },
  { label: '0x7C00 - 0x7FC0', start: '7C00', count: '16', step: '0040' },
  { label: '0x8000 - 0x83C0', start: '8000', count: '16', step: '0040' },
  { label: '0xB000 - 0xB3C0', start: 'B000', count: '16', step: '0040' }
];

function parseHexByte(value, fallback = 0) {
  const normalized = value.replace(/[^0-9a-f]/gi, '');
  const parsed = Number.parseInt(normalized || String(fallback), 16);
  return Number.isFinite(parsed) ? parsed & 0xff : fallback;
}

function parseHexWord(value, fallback = 0) {
  const normalized = value.replace(/[^0-9a-f]/gi, '');
  const parsed = Number.parseInt(normalized || String(fallback), 16);
  return Number.isFinite(parsed) ? parsed & 0xffff : fallback;
}

function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

function ResultBadge({ result }) {
  if (!result.packets.length) {
    return <Badge variant="error">No response</Badge>;
  }

  if (result.ackOnly) {
    return <Badge variant="warning">ACK only</Badge>;
  }

  if (result.extraBytes.length > 0) {
    return <Badge variant="success">ACK + data</Badge>;
  }

  return <Badge variant="info">Raw packets</Badge>;
}

export function BootImagePage() {
  const { connected, getTransport, connectionInfo, logs } = useAppContext();
  const [cmdHex, setCmdHex] = useState('48');
  const [offsetHex, setOffsetHex] = useState('0000');
  const [fillHex, setFillHex] = useState('FF');
  const [waitMs, setWaitMs] = useState('300');
  const [idleMs, setIdleMs] = useState('160');
  const [probeBusy, setProbeBusy] = useState(false);
  const [handshakeInfo, setHandshakeInfo] = useState(null);
  const [results, setResults] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [lastError, setLastError] = useState('');
  const [sessionNotes, setSessionNotes] = useState([]);
  const [sweepStartHex, setSweepStartHex] = useState('0000');
  const [sweepCount, setSweepCount] = useState('16');
  const [sweepStepHex, setSweepStepHex] = useState('0040');

  const selectedResult = results[selectedIndex] ?? null;
  const selectedChannelSummary = useMemo(() => {
    const parsed = selectedResult?.parsedPackets?.[0];
    if (!parsed?.looksLikeBlockRead) return null;
    if (parsed.command !== 0x52) return null;
    if (parsed.offset >= 16384) return null;
    return decodeChannelBlockSummary(parsed.offset, parsed.payload);
  }, [selectedResult]);
  const canRun = connected && !probeBusy;
  const transport = getTransport?.();
  const recentProbeLogs = useMemo(
    () => logs.filter((entry) => entry.message?.includes('BOOTIMG_')).slice(-10).reverse(),
    [logs]
  );

  function pushSessionNote(message) {
    const line = `${new Date().toLocaleTimeString()} ${message}`;
    setSessionNotes((prev) => [line, ...prev].slice(0, 16));
  }

  async function runHandshake() {
    if (!transport) {
      throw new Error('Transport unavailable. Connect the device first.');
    }

    pushSessionNote('开始 Boot 握手');
    const session = new BootImageProbeSession(transport);
    const handshake = await session.bootHandshake(true);
    setHandshakeInfo(handshake);
    pushSessionNote(
      `Boot 握手完成 | mode ${handshake.mode} | program ${handshake.programText} | ACK ${handshake.ackHex} | READY ${handshake.readyHex}`
    );
    return handshake;
  }

  async function runSingleProbe({ cmd, offset, handshake = true }) {
    if (!transport) {
      throw new Error('Transport unavailable. Connect the device first.');
    }

    const session = new BootImageProbeSession(transport);
    const result = await session.sendProbe({
      cmd,
      offset,
      totalTimeoutMs: Number.parseInt(waitMs, 10) || 300,
      idleCollectMs: Number.parseInt(idleMs, 10) || 160,
      fillByte: parseHexByte(fillHex, 0xff),
      handshake
    });

    pushSessionNote(
      `Probe 完成 | cmd 0x${cmd.toString(16).padStart(2, '0').toUpperCase()} @ 0x${offset
        .toString(16)
        .padStart(4, '0')
        .toUpperCase()} | packets ${result.packets.length} | extra ${result.extraBytes.length}`
    );
    setResults((prev) => {
      const next = [result, ...prev].slice(0, 24);
      setSelectedIndex(0);
      return next;
    });

    return result;
  }

  async function handleBootHandshake() {
    setProbeBusy(true);
    setLastError('');
    try {
      await runHandshake();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setLastError(message);
      pushSessionNote(`Boot 握手失败 | ${message}`);
    } finally {
      setProbeBusy(false);
    }
  }

  async function handleSingleProbe() {
    setProbeBusy(true);
    setLastError('');
    try {
      const handshake = await runHandshake();
      if (handshake) {
        await runSingleProbe({
          cmd: parseHexByte(cmdHex, 0x48),
          offset: parseHexWord(offsetHex, 0x0000),
          handshake: false
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setLastError(message);
      pushSessionNote(`单条 Probe 失败 | ${message}`);
    } finally {
      setProbeBusy(false);
    }
  }

  async function handlePresetMatrix() {
    setProbeBusy(true);
    setLastError('');
    try {
      await runHandshake();
      for (const probe of PRESET_PROBES) {
        await runSingleProbe({
          cmd: parseHexByte(probe.cmd, 0x48),
          offset: parseHexWord(probe.offset, 0x0000),
          handshake: false
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setLastError(message);
      pushSessionNote(`预设矩阵失败 | ${message}`);
    } finally {
      setProbeBusy(false);
    }
  }

  async function handleReadSweep() {
    setProbeBusy(true);
    setLastError('');
    try {
      await runHandshake();
      const start = parseHexWord(sweepStartHex, 0x0000);
      const count = Math.max(1, Number.parseInt(sweepCount, 10) || 16);
      const step = parseHexWord(sweepStepHex, 0x0040) || 0x0040;

      pushSessionNote(
        `开始 0x52 地址扫描 | start 0x${start.toString(16).padStart(4, '0').toUpperCase()} | count ${count} | step 0x${step
          .toString(16)
          .padStart(4, '0')
          .toUpperCase()}`
      );

      for (let index = 0; index < count; index += 1) {
        const offset = (start + index * step) & 0xffff;
        await runSingleProbe({
          cmd: 0x52,
          offset,
          handshake: false
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setLastError(message);
      pushSessionNote(`0x52 地址扫描失败 | ${message}`);
    } finally {
      setProbeBusy(false);
    }
  }

  function handleExportHex() {
    if (!selectedResult) return;
    const content = [
      `cmd=0x${selectedResult.cmd.toString(16).padStart(2, '0').toUpperCase()}`,
      `offset=0x${selectedResult.offset.toString(16).padStart(4, '0').toUpperCase()}`,
      `roundTripMs=${selectedResult.roundTripMs}`,
      '',
      `frame: ${selectedResult.frameHex}`,
      '',
      ...selectedResult.packetHexList.map((hex, index) => `packet[${index}]: ${hex}`)
    ].join('\n');

    downloadBlob(
      new Blob([content], { type: 'text/plain;charset=utf-8' }),
      `bootimg-probe-${Date.now()}.txt`
    );
  }

  function handleExportBin() {
    if (!selectedResult || !selectedResult.extraBytes.length) return;
    downloadBlob(
      new Blob([selectedResult.extraBytes], { type: 'application/octet-stream' }),
      `bootimg-probe-${selectedResult.cmd.toString(16)}-${selectedResult.offset.toString(16)}.bin`
    );
  }

  return (
    <PageLayout>
      <PageTitleBar title="开机图片" />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_360px]">
        <Card title="探针控制台">
          <div className="space-y-5">
            <Surface variant="muted" className="grid gap-4 p-4 sm:grid-cols-2 xl:grid-cols-4">
              <div className="space-y-1">
                <p className="m-0 text-[11px] uppercase tracking-[0.12em] text-content-muted">设备</p>
                <p className="m-0 text-sm text-content-primary">
                  {connectionInfo?.deviceName || 'walkie-talkie'}
                </p>
              </div>
              <div className="space-y-1">
                <p className="m-0 text-[11px] uppercase tracking-[0.12em] text-content-muted">探针状态</p>
                <div>
                  <Badge variant={probeBusy ? 'info' : 'default'}>
                    {probeBusy ? '运行中' : '就绪'}
                  </Badge>
                </div>
              </div>
              <div className="space-y-1">
                <p className="m-0 text-[11px] uppercase tracking-[0.12em] text-content-muted">握手模式</p>
                <p className="m-0 text-sm text-content-primary">{handshakeInfo?.mode || '-'}</p>
              </div>
              <div className="space-y-1">
                <p className="m-0 text-[11px] uppercase tracking-[0.12em] text-content-muted">握手 ACK</p>
                <p className="m-0 text-sm text-content-primary">{handshakeInfo?.ackHex || '-'}</p>
              </div>
              <div className="space-y-1">
                <p className="m-0 text-[11px] uppercase tracking-[0.12em] text-content-muted">Ready 帧</p>
                <p className="m-0 text-xs text-content-secondary break-all">
                  {handshakeInfo?.readyHex || '-'}
                </p>
              </div>
              <div className="space-y-1">
                <p className="m-0 text-[11px] uppercase tracking-[0.12em] text-content-muted">Program 字串</p>
                <p className="m-0 text-xs text-content-secondary break-all">
                  {handshakeInfo?.programText || '-'}
                </p>
              </div>
            </Surface>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              <Field label="命令字">
                <Input value={cmdHex} onChange={(event) => setCmdHex(event.target.value)} />
              </Field>
              <Field label="Offset">
                <Input value={offsetHex} onChange={(event) => setOffsetHex(event.target.value)} />
              </Field>
              <Field label="填充值">
                <Input value={fillHex} onChange={(event) => setFillHex(event.target.value)} />
              </Field>
              <Field label="总等待 ms">
                <Input value={waitMs} onChange={(event) => setWaitMs(event.target.value)} />
              </Field>
              <Field label="空闲收包 ms">
                <Input value={idleMs} onChange={(event) => setIdleMs(event.target.value)} />
              </Field>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button variant="secondary" onClick={handleBootHandshake} disabled={!canRun}>
                仅做 Boot 握手
              </Button>
              <Button variant="primary" onClick={handleSingleProbe} disabled={!canRun}>
                发送单条 Probe
              </Button>
              <Button onClick={handlePresetMatrix} disabled={!canRun}>
                跑预设矩阵
              </Button>
              <Button onClick={() => setResults([])} disabled={probeBusy || results.length === 0}>
                清空结果
              </Button>
            </div>

            {lastError ? (
              <Surface variant="subtle" className="border-error-border bg-error-bg/80 p-4">
                <p className="m-0 break-all font-code text-xs text-error">{lastError}</p>
              </Surface>
            ) : null}

            <Surface variant="subtle" className="border-info-border bg-info-bg/80 p-4">
              <div className="flex flex-wrap gap-2">
                {PRESET_PROBES.map((probe) => (
                  <Badge key={probe.label} variant="info">
                    {probe.label}
                  </Badge>
                ))}
              </div>
            </Surface>

            <Surface variant="subtle" className="space-y-4 border-line/40 bg-surface-muted/72 p-4">
              <div className="text-sm font-medium text-content-primary">0x52 地址扫描</div>
              <div className="grid gap-4 md:grid-cols-3">
                <Field label="起始地址">
                  <Input value={sweepStartHex} onChange={(event) => setSweepStartHex(event.target.value)} />
                </Field>
                <Field label="块数量">
                  <Input value={sweepCount} onChange={(event) => setSweepCount(event.target.value)} />
                </Field>
                <Field label="步长">
                  <Input value={sweepStepHex} onChange={(event) => setSweepStepHex(event.target.value)} />
                </Field>
              </div>

              <div className="flex flex-wrap gap-2">
                {MEMORY_SWEEP_PRESETS.map((preset) => (
                  <Button
                    key={preset.label}
                    variant="secondary"
                    onClick={() => {
                      setSweepStartHex(preset.start);
                      setSweepCount(preset.count);
                      setSweepStepHex(preset.step);
                    }}
                    disabled={probeBusy}
                  >
                    {preset.label}
                  </Button>
                ))}
                <Button variant="primary" onClick={handleReadSweep} disabled={!canRun}>
                  运行 0x52 扫描
                </Button>
              </div>
            </Surface>
          </div>
        </Card>

        <Card title="状态">
          <div className="flex flex-wrap gap-2">
            <Badge variant={probeBusy ? 'info' : 'default'}>{probeBusy ? '探针运行中' : '就绪'}</Badge>
            <Badge variant={handshakeInfo ? 'info' : 'default'}>{handshakeInfo?.mode || 'idle'}</Badge>
          </div>
        </Card>
      </div>

      <div className="grid gap-5 xl:grid-cols-[380px_minmax(0,1fr)]">
        <Card title={`结果列表 (${results.length})`}>
          <div className="space-y-3">
            {results.length === 0 ? (
              <Surface variant="muted" className="p-4 text-sm text-content-secondary">
                还没有 probe 结果。
              </Surface>
            ) : (
              results.map((result, index) => (
                <button
                  key={`${result.cmd}-${result.offset}-${index}`}
                  type="button"
                  onClick={() => setSelectedIndex(index)}
                  className={`w-full rounded-[var(--radius-card)] border p-4 text-left transition-all duration-150 ease-[var(--ease-apple)] ${
                    selectedIndex === index
                      ? 'border-info-border bg-info-bg/70'
                      : 'border-line-subtle bg-surface-card/80 hover:bg-surface-muted/80'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="m-0 text-sm font-medium text-content-primary">
                      0x{result.cmd.toString(16).padStart(2, '0').toUpperCase()} @ 0x
                      {result.offset.toString(16).padStart(4, '0').toUpperCase()}
                    </p>
                    <ResultBadge result={result} />
                  </div>
                  <p className="mt-2 mb-0 text-xs text-content-muted">
                    packets {result.packets.length} · extra {result.extraBytes.length} byte(s) ·{' '}
                    {result.roundTripMs}ms
                  </p>
                  {result.parsedPackets?.[0]?.isStructured ? (
                    <p className="mt-2 mb-0 text-xs text-content-secondary">
                      parsed cmd 0x
                      {result.parsedPackets[0].command.toString(16).padStart(2, '0').toUpperCase()} ·
                      offset 0x
                      {result.parsedPackets[0].offset.toString(16).padStart(4, '0').toUpperCase()} ·
                      len {result.parsedPackets[0].declaredLength}
                    </p>
                  ) : null}
                </button>
              ))
            )}
          </div>
        </Card>

        <Card
          title="选中结果"
          actions={
            <div className="flex flex-wrap gap-2">
              <Button onClick={handleExportHex} disabled={!selectedResult}>
                导出 Hex
              </Button>
              <Button onClick={handleExportBin} disabled={!selectedResult?.extraBytes.length}>
                导出 Bin
              </Button>
            </div>
          }
        >
          {selectedResult ? (
            <div className="space-y-4">
              <Surface variant="muted" className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-4">
                <div>
                  <p className="m-0 text-[11px] uppercase tracking-[0.12em] text-content-muted">命令</p>
                  <p className="m-0 text-sm text-content-primary">
                    0x{selectedResult.cmd.toString(16).padStart(2, '0').toUpperCase()}
                  </p>
                </div>
                <div>
                  <p className="m-0 text-[11px] uppercase tracking-[0.12em] text-content-muted">Offset</p>
                  <p className="m-0 text-sm text-content-primary">
                    0x{selectedResult.offset.toString(16).padStart(4, '0').toUpperCase()}
                  </p>
                </div>
                <div>
                  <p className="m-0 text-[11px] uppercase tracking-[0.12em] text-content-muted">往返耗时</p>
                  <p className="m-0 text-sm text-content-primary">{selectedResult.roundTripMs} ms</p>
                </div>
                <div>
                  <p className="m-0 text-[11px] uppercase tracking-[0.12em] text-content-muted">额外数据</p>
                  <p className="m-0 text-sm text-content-primary">{selectedResult.extraBytes.length} byte(s)</p>
                </div>
              </Surface>

              {selectedResult.parsedPackets?.length ? (
                <div className="space-y-2">
                  <p className="m-0 text-sm font-medium text-content-primary">结构化回包解析</p>
                  <div className="space-y-2">
                    {selectedResult.parsedPackets.map((packet, index) => (
                      <Surface key={`parsed-${index}`} variant="muted" className="space-y-2 p-4">
                        <p className="m-0 text-xs text-content-secondary">
                          packet[{index}] · cmd 0x{packet.command.toString(16).padStart(2, '0').toUpperCase()} ·
                          offset 0x{packet.offset.toString(16).padStart(4, '0').toUpperCase()} · len {packet.declaredLength}
                        </p>
                        <p className="m-0 text-xs text-content-muted">
                          structured {String(packet.isStructured)} · block-like {String(packet.looksLikeBlockRead)} ·
                          offset-match {packet.headerMatchesExpectedOffset == null ? '-' : String(packet.headerMatchesExpectedOffset)}
                        </p>
                        <textarea
                          readOnly
                          value={packet.payloadHex || 'No payload'}
                          className="min-h-24 w-full rounded-[var(--radius-input)] border border-line/50 bg-surface-inset/70 p-3 font-code text-xs text-content-secondary"
                        />
                      </Surface>
                    ))}
                  </div>
                </div>
              ) : null}

              {selectedChannelSummary ? (
                <div className="space-y-2">
                  <p className="m-0 text-sm font-medium text-content-primary">信道块解码摘要</p>
                  <Surface variant="muted" className="space-y-3 p-4">
                    <p className="m-0 text-xs text-content-secondary">
                      地址 0x{selectedChannelSummary.address.toString(16).padStart(4, '0').toUpperCase()} ·
                      Bank {selectedChannelSummary.bankIndex + 1}
                    </p>
                    <div className="grid gap-3 md:grid-cols-2">
                      {selectedChannelSummary.channels.map((channel) => (
                        <Surface key={channel.channelNumber} variant="subtle" className="space-y-2 p-3">
                          <p className="m-0 text-sm font-medium text-content-primary">
                            CH {channel.channelNumber} / Bank-{channel.bankChannelNumber}
                          </p>
                          <p className="m-0 text-xs text-content-secondary">
                            RX {channel.rxFreq || '-'} · TX {channel.txFreq || '-'}
                          </p>
                          <p className="m-0 text-xs text-content-secondary">
                            Name {channel.name || '-'}
                          </p>
                          <p className="m-0 text-xs text-content-muted">
                            RX Tone {channel.rxTone} · TX Tone {channel.txTone} · Power {channel.txPower} · BW{' '}
                            {channel.bandwidth}
                          </p>
                        </Surface>
                      ))}
                    </div>
                  </Surface>
                </div>
              ) : null}

              <div className="space-y-2">
                <p className="m-0 text-sm font-medium text-content-primary">发送帧</p>
                <textarea
                  readOnly
                  value={selectedResult.frameHex}
                  className="min-h-24 w-full rounded-[var(--radius-input)] border border-line/50 bg-surface-inset/70 p-3 font-code text-xs text-content-secondary"
                />
              </div>

              <div className="space-y-2">
                <p className="m-0 text-sm font-medium text-content-primary">回包列表</p>
                <div className="space-y-2">
                  {selectedResult.packetHexList.length === 0 ? (
                    <Surface variant="muted" className="p-4 text-sm text-content-secondary">
                      没有收到任何回包。
                    </Surface>
                  ) : (
                    selectedResult.packetHexList.map((hex, index) => (
                      <textarea
                        key={`${selectedResult.cmd}-${selectedResult.offset}-${index}`}
                        readOnly
                        value={`packet[${index}] ${hex}`}
                        className="min-h-16 w-full rounded-[var(--radius-input)] border border-line/50 bg-surface-inset/70 p-3 font-code text-xs text-content-secondary"
                      />
                    ))
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <p className="m-0 text-sm font-medium text-content-primary">合并后的额外数据 Hex</p>
                <textarea
                  readOnly
                  value={selectedResult.extraHex || 'No extra payload'}
                  className="min-h-24 w-full rounded-[var(--radius-input)] border border-line/50 bg-surface-inset/70 p-3 font-code text-xs text-content-secondary"
                />
              </div>
            </div>
          ) : (
            <Surface variant="muted" className="p-4 text-sm text-content-secondary">
              -
            </Surface>
          )}
        </Card>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Card title="本页调试轨迹">
          <div className="space-y-2">
            {sessionNotes.length === 0 ? (
              <Surface variant="muted" className="p-4 text-sm text-content-secondary">
                还没有本页级别的调试轨迹。
              </Surface>
            ) : (
              sessionNotes.map((line) => (
                <Surface key={line} variant="muted" className="p-3">
                  <p className="m-0 break-all font-code text-xs text-content-secondary">{line}</p>
                </Surface>
              ))
            )}
          </div>
        </Card>

        <Card title="Boot 协议日志">
          <div className="space-y-2">
            {recentProbeLogs.length === 0 ? (
              <Surface variant="muted" className="p-4 text-sm text-content-secondary">
                还没有收到带 `BOOTIMG_` 前缀的协议日志。
              </Surface>
            ) : (
              recentProbeLogs.map((entry, index) => (
                <Surface key={`${entry.time}-${entry.message}-${index}`} variant="muted" className="p-3">
                  <p className="m-0 text-[11px] uppercase tracking-[0.12em] text-content-muted">
                    {entry.time} · {entry.type}
                  </p>
                  <p className="mt-1 mb-0 break-all font-code text-xs text-content-secondary">
                    {entry.message}
                    {entry.hex ? ` | ${entry.hex}` : ''}
                  </p>
                </Surface>
              ))
            )}
          </div>
        </Card>
      </div>
    </PageLayout>
  );
}

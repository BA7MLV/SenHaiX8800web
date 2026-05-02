import { useRef, useState } from 'react';
import { ArrowDown, ArrowUp, ClipboardPaste, Copy, Download, Scissors, Trash2, Upload } from 'lucide-react';
import { Badge } from '../components/ui/Badge.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Card } from '../components/ui/Card.jsx';
import { PageTitleBar } from '../components/common/PageTitleBar.jsx';
import { Field } from '../components/ui/Field.jsx';
import { Input } from '../components/ui/Input.jsx';
import { PageLayout } from '../components/ui/PageLayout.jsx';
import { Select } from '../components/ui/Select.jsx';
import { useAppContext } from '../context/AppContext';
import {
  clearSelectedChannels,
  copyChannels,
  duplicateChannelsToRange,
  exportChannelsToCsv,
  importChannelsFromCsv,
  moveSelectedChannels,
  pasteChannels
} from '../features/channelEditing.js';
import { CHANNEL_OPTIONS } from '../protocol/shx8800';

const powerOptions = CHANNEL_OPTIONS.power.map((label, value) => ({ label, value: String(value) }));
const bandwidthOptions = CHANNEL_OPTIONS.bandwidth.map((label, value) => ({ label, value: String(value) }));
const scanOptions = CHANNEL_OPTIONS.scanAdd.map((label, value) => ({ label, value: String(value) }));
const busyLockOptions = CHANNEL_OPTIONS.busyLock.map((label, value) => ({ label, value: String(value) }));
const pttOptions = CHANNEL_OPTIONS.pttid.map((label, value) => ({ label, value: String(value) }));

const channelFields = [
  { key: 'name', label: '名称', kind: 'input' },
  { key: 'id', label: '#', kind: 'text' },
  { key: 'rxFreq', label: '接收频率', kind: 'input' },
  { key: 'txFreq', label: '发射频率', kind: 'input' },
  { key: 'rxTone', label: '接收亚音', kind: 'input' },
  { key: 'txTone', label: '发射亚音', kind: 'input' },
  { key: 'txPower', label: '功率', kind: 'select', options: powerOptions },
  { key: 'bandwidth', label: '带宽', kind: 'select', options: bandwidthOptions },
  { key: 'scanAdd', label: '扫描', kind: 'select', options: scanOptions },
  { key: 'busyLock', label: '忙锁', kind: 'select', options: busyLockOptions },
  { key: 'pttid', label: 'PTT ID', kind: 'select', options: pttOptions },
  { key: 'signalGroup', label: '信令组', kind: 'number', min: 0, max: 15 }
];

function updateNumber(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

function InlineProgress({ percent, label, active }) {
  return (
    <div className="min-w-[220px] flex-1 rounded-[4px] border border-line-subtle bg-white px-3 py-2">
      <div className="flex items-center justify-between gap-3 text-[11px] text-content-muted">
        <span>{active ? '进度' : '状态'}</span>
        <span>{percent}%</span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-muted">
        <div
          className="h-full rounded-full bg-interactive transition-all duration-300 ease-[var(--ease-apple)]"
          style={{ width: `${percent}%` }}
        />
      </div>
      <div className="mt-2 truncate text-xs text-content-secondary">{label || '-'}</div>
    </div>
  );
}

export function ChannelsPage() {
  const {
    activeBank,
    busy,
    connected,
    currentBank,
    currentBankIndex,
    fileInputRef,
    handleExportBackup,
    handleImportBackup,
    handleReadRadio,
    handleWriteRadio,
    isRadioDirty,
    progress,
    radioImage,
    replaceBankChannels,
    setActiveBank,
    updateBankName,
    updateChannel
  } = useAppContext();

  const csvFileInputRef = useRef(null);
  const [selectedRows, setSelectedRows] = useState([]);
  const [clipboard, setClipboard] = useState(null);
  const [csvText, setCsvText] = useState('');
  const [rangeStart, setRangeStart] = useState('1');
  const [rangeEnd, setRangeEnd] = useState('4');
  const [importStart, setImportStart] = useState('1');

  const allSelected = selectedRows.length > 0 && selectedRows.length === currentBank.length;
  const pasteStartIndex = selectedRows[0] ?? 0;
  const hasSelection = selectedRows.length > 0;

  const applyBank = (nextBank) => {
    replaceBankChannels(currentBankIndex, nextBank);
  };

  const toggleRow = (rowIndex) => {
    setSelectedRows((prev) =>
      prev.includes(rowIndex) ? prev.filter((index) => index !== rowIndex) : [...prev, rowIndex].sort((a, b) => a - b)
    );
  };

  const toggleAllRows = () => {
    setSelectedRows(allSelected ? [] : currentBank.map((_, index) => index));
  };

  const handleMove = (direction) => {
    if (!hasSelection) return;
    applyBank(moveSelectedChannels(currentBank, selectedRows, direction));
    setSelectedRows((prev) =>
      prev
        .map((index) => {
          if (direction === 'up') return Math.max(0, index - 1);
          return Math.min(currentBank.length - 1, index + 1);
        })
        .sort((left, right) => left - right)
    );
  };

  const handleCopy = (mode) => {
    if (!hasSelection) return;
    const result = copyChannels(currentBank, selectedRows, mode);
    setClipboard(result.clipboard);
    if (mode === 'cut') {
      applyBank(result.nextBank);
      setSelectedRows([]);
    }
  };

  const handlePaste = () => {
    if (!clipboard?.channels?.length) return;
    applyBank(pasteChannels(currentBank, pasteStartIndex, clipboard));
  };

  const handleDuplicateRange = () => {
    if (!hasSelection) return;
    const startIndex = Math.max(0, updateNumber(rangeStart, 1) - 1);
    const endIndex = Math.max(0, updateNumber(rangeEnd, 1) - 1);
    applyBank(duplicateChannelsToRange(currentBank, selectedRows, startIndex, endIndex));
  };

  const handleClearSelected = () => {
    if (!hasSelection) return;
    applyBank(clearSelectedChannels(currentBank, selectedRows));
    setSelectedRows([]);
  };

  const handleExportCsv = async () => {
    const csv = exportChannelsToCsv(currentBank, selectedRows);
    setCsvText(csv);
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(csv);
    }
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${String(radioImage.model ?? 'radio').toLowerCase()}-bank-${currentBankIndex + 1}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const handleImportCsv = () => {
    if (!csvText.trim()) return;
    const parsed = importChannelsFromCsv(csvText, { bankSize: currentBank.length });
    const startIndex = Math.max(0, updateNumber(importStart, 1) - 1);
    applyBank(pasteChannels(currentBank, startIndex, { channels: parsed.channels }));
  };

  const handleCsvFilePicked = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setCsvText(await file.text());
    event.target.value = '';
  };

  const handleReadClipboardCsv = async () => {
    if (!navigator.clipboard?.readText) return;
    setCsvText(await navigator.clipboard.readText());
  };

  return (
    <PageLayout className="gap-4">
      <PageTitleBar
        title="信道管理"
        actions={
          <>
            <Button variant="primary" onClick={handleReadRadio} disabled={!connected || busy}>
              读频
            </Button>
            <Button variant="secondary" onClick={handleWriteRadio} disabled={!connected || busy || !isRadioDirty}>
              写频
            </Button>
            <Button variant="secondary" onClick={handleExportBackup} disabled={busy}>
              导出
            </Button>
            <Button variant="secondary" onClick={() => fileInputRef.current?.click()} disabled={busy}>
              导入
            </Button>
            <input ref={fileInputRef} type="file" accept=".json" hidden onChange={handleImportBackup} />
          </>
        }
      />

      <div className="flex flex-wrap gap-2">
        <Badge variant="default">{`已选 ${selectedRows.length} 条`}</Badge>
        <InlineProgress percent={progress.percent} label={progress.label} active={busy} />
      </div>

      <Card title="Bank 设置">
        <div className="grid gap-4 lg:grid-cols-[160px_240px_minmax(0,1fr)]">
          <Field label="当前 Bank">
            <Select
              value={activeBank}
              onChange={(event) => {
                setActiveBank(event.target.value);
                setSelectedRows([]);
              }}
              options={radioImage.bankNames.map((name, index) => ({
                value: String(index),
                label: name || `Bank ${index + 1}`
              }))}
            />
          </Field>
          <Field label="Bank 名称">
            <Input
              value={radioImage.bankNames[currentBankIndex]}
              onChange={(event) => updateBankName(currentBankIndex, event.target.value)}
            />
          </Field>
          <div />
        </div>
      </Card>

      <Card
        title="高级批量编辑"
        description="支持顺序调整、复制粘贴、批量复制/剪切，以及 CSV 导入导出。复制/剪切以当前勾选行为准。"
      >
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.8fr)_minmax(320px,1fr)]">
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" size="sm" icon={<ArrowUp />} onClick={() => handleMove('up')} disabled={!hasSelection}>
                上移
              </Button>
              <Button variant="secondary" size="sm" icon={<ArrowDown />} onClick={() => handleMove('down')} disabled={!hasSelection}>
                下移
              </Button>
              <Button variant="secondary" size="sm" icon={<Copy />} onClick={() => handleCopy('copy')} disabled={!hasSelection}>
                复制
              </Button>
              <Button variant="secondary" size="sm" icon={<Scissors />} onClick={() => handleCopy('cut')} disabled={!hasSelection}>
                剪切
              </Button>
              <Button
                variant="secondary"
                size="sm"
                icon={<ClipboardPaste />}
                onClick={handlePaste}
                disabled={!clipboard?.channels?.length}
              >
                粘贴到第 {pasteStartIndex + 1} 行
              </Button>
              <Button variant="danger" size="sm" icon={<Trash2 />} onClick={handleClearSelected} disabled={!hasSelection}>
                清空所选
              </Button>
            </div>

            <div className="grid gap-3 md:grid-cols-[120px_120px_auto]">
              <Field label="批量复制起始">
                <Input value={rangeStart} onChange={(event) => setRangeStart(event.target.value)} />
              </Field>
              <Field label="批量复制结束">
                <Input value={rangeEnd} onChange={(event) => setRangeEnd(event.target.value)} />
              </Field>
              <div className="flex items-end">
                <Button variant="secondary" onClick={handleDuplicateRange} disabled={!hasSelection}>
                  区间重复复制
                </Button>
              </div>
            </div>

            <div className="rounded-[4px] border border-line-subtle bg-surface-base/50 px-3 py-2 text-sm text-content-secondary">
              {clipboard?.channels?.length
                ? `剪贴板内有 ${clipboard.channels.length} 条信道，可从第 ${pasteStartIndex + 1} 行开始覆盖粘贴。`
                : '剪贴板为空。'}
            </div>
          </div>

          <div className="space-y-3 rounded-[4px] border border-line-subtle bg-white p-3">
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" size="sm" icon={<Download />} onClick={handleExportCsv}>
                导出 CSV
              </Button>
              <Button variant="secondary" size="sm" icon={<Upload />} onClick={() => csvFileInputRef.current?.click()}>
                读取 CSV 文件
              </Button>
              <Button variant="secondary" size="sm" onClick={handleReadClipboardCsv}>
                读取系统剪贴板
              </Button>
              <input ref={csvFileInputRef} type="file" accept=".csv,text/csv" hidden onChange={handleCsvFilePicked} />
            </div>
            <Field label="CSV 导入起始行">
              <Input value={importStart} onChange={(event) => setImportStart(event.target.value)} />
            </Field>
            <textarea
              value={csvText}
              onChange={(event) => setCsvText(event.target.value)}
              className="min-h-[220px] w-full rounded-[var(--radius-input)] border border-line/50 bg-white px-3 py-2 text-sm text-content-primary"
              placeholder="可直接粘贴 CSV 文本，或先点击“导出 CSV”生成模板。"
            />
            <Button variant="primary" onClick={handleImportCsv} disabled={!csvText.trim()}>
              将 CSV 覆盖写入当前 Bank
            </Button>
          </div>
        </div>
      </Card>

      <Card title="信道表">
        <div className="overflow-hidden rounded-[4px] border border-line-subtle bg-white">
          <div className="overflow-x-auto">
            <table className="min-w-[1360px] w-full border-collapse text-left">
              <thead className="bg-surface-muted text-[11px] text-content-muted">
                <tr>
                  <th className="border-b border-line-subtle px-2.5 py-2 font-medium">
                    <input type="checkbox" checked={allSelected} onChange={toggleAllRows} />
                  </th>
                  {channelFields.map((field) => (
                    <th key={field.key} className="border-b border-line-subtle px-2.5 py-2 font-medium">
                      {field.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {currentBank.map((channel, rowIndex) => (
                  <tr
                    key={channel.id}
                    className={selectedRows.includes(rowIndex) ? 'bg-warning-bg/40' : 'align-top odd:bg-white even:bg-surface-base/50'}
                  >
                    <td className="border-b border-line-subtle px-2.5 py-2 align-middle">
                      <input
                        type="checkbox"
                        checked={selectedRows.includes(rowIndex)}
                        onChange={() => toggleRow(rowIndex)}
                      />
                    </td>
                    {channelFields.map((field) => {
                      if (field.kind === 'text') {
                        return (
                          <td key={field.key} className="border-b border-line-subtle px-2.5 py-2 text-sm text-content-secondary">
                            {channel[field.key]}
                          </td>
                        );
                      }

                      if (field.kind === 'select') {
                        return (
                          <td key={field.key} className="border-b border-line-subtle px-2 py-1.5">
                            <Select
                              value={String(channel[field.key] ?? 0)}
                              onChange={(event) =>
                                updateChannel(currentBankIndex, rowIndex, {
                                  [field.key]: updateNumber(event.target.value, channel[field.key] ?? 0)
                                })
                              }
                              options={field.options}
                              className="min-w-[96px]"
                            />
                          </td>
                        );
                      }

                      if (field.kind === 'number') {
                        return (
                          <td key={field.key} className="border-b border-line-subtle px-2 py-1.5">
                            <Input
                              type="number"
                              min={field.min}
                              max={field.max}
                              value={channel[field.key]}
                              onChange={(event) =>
                                updateChannel(currentBankIndex, rowIndex, {
                                  [field.key]: updateNumber(event.target.value, channel[field.key] ?? 0)
                                })
                              }
                              className="min-w-[88px]"
                            />
                          </td>
                        );
                      }

                      return (
                        <td key={field.key} className="border-b border-line-subtle px-2 py-1.5">
                          <Input
                            value={channel[field.key] ?? ''}
                            onChange={(event) =>
                              updateChannel(currentBankIndex, rowIndex, { [field.key]: event.target.value })
                            }
                            className={field.key === 'name' ? 'min-w-[160px]' : 'min-w-[120px]'}
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Card>
    </PageLayout>
  );
}

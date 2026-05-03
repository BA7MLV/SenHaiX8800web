import { Download, GripVertical, Upload } from 'lucide-react';
import { Button } from '../components/ui/Button.jsx';
import { Input } from '../components/ui/Input.jsx';
import { PageLayout } from '../components/ui/PageLayout.jsx';
import { Select } from '../components/ui/Select.jsx';
import { useAppContext } from '../context/AppContext';
import { downloadCsvTemplate } from '../features/channelEditing.js';
import { CHANNEL_OPTIONS } from '../protocol/shx8800';

const powerOptions = CHANNEL_OPTIONS.power.map((label, value) => ({ label, value: String(value) }));
const bandwidthOptions = CHANNEL_OPTIONS.bandwidth.map((label, value) => ({ label, value: String(value) }));

const channelFields = [
  { key: 'name', label: '信道名称' },
  { key: 'bandwidth', label: '带宽', kind: 'select', options: bandwidthOptions },
  { key: 'rxFreq', label: '接收频率' },
  { key: 'txFreq', label: '发送频率' },
  { key: 'txPower', label: '发送功率', kind: 'select', options: powerOptions },
  { key: 'rxTone', label: '接收亚音' },
  { key: 'txTone', label: '发送亚音' }
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
    updateChannel
  } = useAppContext();

  return (
    <PageLayout className="gap-4">
      <div className="rounded-[8px] border border-line-subtle bg-white">
        <div className="px-6 py-4">
          <h1 className="m-0 text-lg font-semibold text-content-primary">
            信道管理（手台应在开机状态下）
          </h1>
        </div>
        
        <div className="flex items-center justify-between border-t border-line-subtle px-6 py-3">
          <div className="flex items-center gap-3">
            <Button
              variant="primary"
              size="sm"
              icon={<Download className="size-4" />}
              onClick={handleReadRadio}
              disabled={!connected || busy}
            >
              从设备读取
            </Button>
            <Button
              variant="secondary"
              size="sm"
              icon={<Upload className="size-4" />}
              onClick={handleWriteRadio}
              disabled={!connected || busy || !isRadioDirty}
            >
              写入设备
            </Button>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="text-sm text-interactive hover:underline"
              onClick={() => downloadCsvTemplate(radioImage.model)}
            >
              下载导入模版
            </button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={busy}
            >
              导入
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleExportBackup}
              disabled={busy}
            >
              导出
            </Button>
            <input ref={fileInputRef} type="file" accept=".json" hidden onChange={handleImportBackup} />
          </div>
        </div>

        {busy && (
          <div className="border-t border-line-subtle px-6 py-3">
            <InlineProgress percent={progress.percent} label={progress.label} active={busy} />
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead className="bg-surface-muted text-xs text-content-muted">
              <tr>
                <th className="border-b border-line-subtle px-4 py-3 font-medium w-12">
                  排序
                </th>
                <th className="border-b border-line-subtle px-4 py-3 font-medium w-16">
                  #
                </th>
                {channelFields.map((field) => (
                  <th key={field.key} className="border-b border-line-subtle px-4 py-3 font-medium">
                    {field.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {currentBank.map((channel, rowIndex) => (
                <tr key={channel.id} className="odd:bg-white even:bg-surface-base/50">
                  <td className="border-b border-line-subtle px-4 py-3 text-content-muted">
                    <GripVertical className="size-4" />
                  </td>
                  <td className="border-b border-line-subtle px-4 py-3 text-sm text-content-secondary">
                    {rowIndex + 1}
                  </td>
                  {channelFields.map((field) => {
                    if (field.kind === 'select') {
                      return (
                        <td key={field.key} className="border-b border-line-subtle px-4 py-2">
                          <Select
                            value={String(channel[field.key] ?? 0)}
                            onChange={(event) =>
                              updateChannel(currentBankIndex, rowIndex, {
                                [field.key]: updateNumber(event.target.value, channel[field.key] ?? 0)
                              })
                            }
                            options={field.options}
                            className="min-w-[80px]"
                          />
                        </td>
                      );
                    }
                    return (
                      <td key={field.key} className="border-b border-line-subtle px-4 py-2">
                        <Input
                          value={channel[field.key] ?? ''}
                          onChange={(event) =>
                            updateChannel(currentBankIndex, rowIndex, { [field.key]: event.target.value })
                          }
                          className="min-w-[80px]"
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
    </PageLayout>
  );
}

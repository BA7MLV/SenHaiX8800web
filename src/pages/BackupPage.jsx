import { Badge } from '../components/ui/Badge.jsx';
import { Button } from '../components/ui/Button.jsx';
import { PageLayout } from '../components/ui/PageLayout.jsx';
import { useAppContext } from '../context/AppContext';

function getBadgeVariant(type) {
  if (type === 'RX') return 'info';
  if (type === 'TX') return 'success';
  if (type === 'ERROR') return 'error';
  return 'default';
}

export function BackupPage() {
  const { busy, logs, fileInputRef, handleExportBackup, handleImportBackup } = useAppContext();

  return (
    <PageLayout className="gap-4">
      <div className="rounded-[8px] border border-line-subtle bg-white">
        <div className="px-6 py-4">
          <h1 className="m-0 text-lg font-semibold text-content-primary">
            备份 / 还原
          </h1>
        </div>

        <div className="flex items-center gap-3 border-t border-line-subtle px-6 py-3">
          <Button onClick={handleExportBackup} disabled={busy}>
            导出备份
          </Button>
          <Button variant="primary" onClick={() => fileInputRef.current?.click()} disabled={busy}>
            导入备份
          </Button>
          <input ref={fileInputRef} type="file" accept=".json" hidden onChange={handleImportBackup} />
        </div>

        <div className="border-t border-line-subtle px-6 py-4 space-y-4">
          <h3 className="m-0 text-sm font-medium text-content-primary">通信日志</h3>
          <div className="max-h-[560px] overflow-auto space-y-3">
            {logs.length === 0 ? (
              <div className="rounded-[4px] border border-line-subtle bg-surface-muted/50 p-5 text-sm text-content-secondary">
                尚无日志
              </div>
            ) : (
              logs.map((item, index) => (
                <article
                  key={`${item.time}-${item.type}-${index}`}
                  className="rounded-[4px] border border-line-subtle bg-surface-card/80 p-4"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="m-0 text-xs text-content-muted">{item.time}</p>
                    <Badge variant={getBadgeVariant(item.type)}>{item.type}</Badge>
                    <p className="m-0 text-sm text-content-primary">{item.message}</p>
                  </div>
                  {item.hex ? <p className="typo-crypto-code mt-3 mb-0 text-sm text-content-secondary">{item.hex}</p> : null}
                </article>
              ))
            )}
          </div>
        </div>
      </div>
    </PageLayout>
  );
}

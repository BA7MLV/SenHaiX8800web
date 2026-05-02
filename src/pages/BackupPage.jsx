import { Badge } from '../components/ui/Badge.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Card } from '../components/ui/Card.jsx';
import { PageTitleBar } from '../components/common/PageTitleBar.jsx';
import { PageLayout } from '../components/ui/PageLayout.jsx';
import { Surface } from '../components/ui/Surface.jsx';
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
    <PageLayout>
      <PageTitleBar title="备份 / 还原" />

      <Card title="备份操作">
        <div className="flex flex-wrap gap-3">
          <Button onClick={handleExportBackup} disabled={busy}>
            导出备份
          </Button>
          <Button variant="primary" onClick={() => fileInputRef.current?.click()} disabled={busy}>
            导入备份
          </Button>
          <input ref={fileInputRef} type="file" accept=".json" hidden onChange={handleImportBackup} />
        </div>
      </Card>

      <Card title="通信日志">
        <div className="space-y-3 max-h-[560px] overflow-auto">
          {logs.length === 0 ? (
            <Surface variant="subtle" className="p-5 text-sm text-content-secondary">
              尚无日志
            </Surface>
          ) : (
            logs.map((item, index) => (
              <article
                key={`${item.time}-${item.type}-${index}`}
                className="rounded-[var(--radius-card)] border border-line-subtle bg-surface-card/80 p-4"
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
      </Card>
    </PageLayout>
  );
}

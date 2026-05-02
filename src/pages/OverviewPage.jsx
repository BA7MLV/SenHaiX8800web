import { Badge } from '../components/ui/Badge.jsx';
import { Card } from '../components/ui/Card.jsx';
import { PageLayout } from '../components/ui/PageLayout.jsx';
import { useAppContext } from '../context/AppContext';

function InfoRow({ label, value, mono = false }) {
  return (
    <div className="grid gap-1 border-b border-line-subtle py-3 last:border-b-0 sm:grid-cols-[140px_minmax(0,1fr)]">
      <dt className="text-sm text-content-muted">{label}</dt>
      <dd className={mono ? 'm-0 font-code text-sm text-content-primary' : 'm-0 text-sm text-content-primary'}>
        {value}
      </dd>
    </div>
  );
}

export function OverviewPage() {
  const { connected, busy, connectionInfo, progress } = useAppContext();

  return (
    <PageLayout className="gap-4">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
        <Card title="基础信息">
          {!connected ? (
            <p className="m-0 text-sm text-content-secondary">
              欢迎你~，点击右上角"连接"按钮连接手台。
            </p>
          ) : (
            <dl className="space-y-0">
              <InfoRow label="设备名" value={connectionInfo?.deviceName || '-'} />
              <InfoRow label="服务 UUID" value={connectionInfo?.serviceUuid || '-'} mono />
              <InfoRow label="特征 UUID" value={connectionInfo?.characteristicUuid || '-'} mono />
              <InfoRow
                label="通知统计"
                value={
                  connectionInfo
                    ? `${connectionInfo.notificationCount} 次 | ${connectionInfo.lastNotificationAt || 'never'}`
                    : '-'
                }
              />
            </dl>
          )}
        </Card>

        <Card title="当前状态">
          <div className="space-y-4">
            <Badge variant={busy ? 'info' : 'default'}>{busy ? '任务执行中' : '空闲'}</Badge>
            <div className="h-2 overflow-hidden rounded-full bg-surface-muted">
              <div
                className="h-full rounded-full bg-interactive transition-all duration-300 ease-[var(--ease-apple)]"
                style={{ width: `${progress.percent}%` }}
              />
            </div>
            <p className="m-0 text-sm text-content-secondary">{progress.label}</p>
          </div>
        </Card>
      </div>
    </PageLayout>
  );
}

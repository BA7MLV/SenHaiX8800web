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
  const { connected, connectionInfo } = useAppContext();

  return (
    <PageLayout className="gap-4">
      <Card title="8800web">
        <div className="space-y-4">
          <div className="space-y-3 text-sm text-content-secondary">
            <p className="m-0">8800web 是一个基于 Web Bluetooth 的对讲机配置工具。</p>
            <p className="m-0">通过蓝牙连接手台后，可以读取和修改信道、频率、功率等参数。</p>
            <p className="m-0">支持备份和还原配置，以及开机图片自定义等功能。</p>
          </div>
          {!connected ? (
            <p className="m-0 text-sm text-content-secondary">
              点击右上角"连接设备"按钮连接手台。
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
        </div>
      </Card>
    </PageLayout>
  );
}

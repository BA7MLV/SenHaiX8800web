import { Card } from '../components/ui/Card.jsx';
import { PageTitleBar } from '../components/common/PageTitleBar.jsx';
import { PageLayout } from '../components/ui/PageLayout.jsx';

export function ChannelSharePage() {
  return (
    <PageLayout>
      <PageTitleBar title="信道分享" />

      <Card title="状态">
        <div className="text-sm text-content-primary">-</div>
      </Card>
    </PageLayout>
  );
}

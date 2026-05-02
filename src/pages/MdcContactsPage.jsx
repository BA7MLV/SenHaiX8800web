import { Card } from '../components/ui/Card.jsx';
import { PageTitleBar } from '../components/common/PageTitleBar.jsx';
import { PageLayout } from '../components/ui/PageLayout.jsx';

export function MdcContactsPage() {
  return (
    <PageLayout>
      <PageTitleBar title="MDC 联系人" />

      <Card title="状态">
        <div className="text-sm text-content-primary">-</div>
      </Card>
    </PageLayout>
  );
}

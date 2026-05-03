import { PageLayout } from '../components/ui/PageLayout.jsx';

export function MdcContactsPage() {
  return (
    <PageLayout className="gap-4">
      <div className="rounded-[8px] border border-line-subtle bg-white">
        <div className="px-6 py-4">
          <h1 className="m-0 text-lg font-semibold text-content-primary">
            MDC 联系人
          </h1>
        </div>

        <div className="border-t border-line-subtle px-6 py-4">
          <div className="text-sm text-content-secondary">-</div>
        </div>
      </div>
    </PageLayout>
  );
}

import { Field } from '../components/ui/Field.jsx';
import { Input } from '../components/ui/Input.jsx';
import { PageLayout } from '../components/ui/PageLayout.jsx';
import { useAppContext } from '../context/AppContext';

function toNumber(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

export function DtmfContactsPage() {
  const { radioImage, updateDtmf, updateDtmfGroup } = useAppContext();
  const { dtmf } = radioImage;

  return (
    <PageLayout className="gap-4">
      <div className="rounded-[8px] border border-line-subtle bg-white">
        <div className="px-6 py-4">
          <h1 className="m-0 text-lg font-semibold text-content-primary">
            DTMF 联系人
          </h1>
        </div>

        <div className="border-t border-line-subtle px-6 py-4 space-y-6">
          <div className="space-y-4">
            <h3 className="m-0 text-sm font-medium text-content-primary">基础参数</h3>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <Field label="本机 ID">
                <Input value={dtmf.localId} onChange={(event) => updateDtmf({ localId: event.target.value })} />
              </Field>
              <Field label="PTT ID">
                <Input
                  type="number"
                  min={0}
                  max={3}
                  value={dtmf.pttid}
                  onChange={(event) => updateDtmf({ pttid: toNumber(event.target.value, dtmf.pttid) })}
                />
              </Field>
              <Field label="码长">
                <Input
                  type="number"
                  min={1}
                  max={99}
                  value={dtmf.wordTime}
                  onChange={(event) => updateDtmf({ wordTime: toNumber(event.target.value, dtmf.wordTime) })}
                />
              </Field>
              <Field label="间隔">
                <Input
                  type="number"
                  min={1}
                  max={99}
                  value={dtmf.idleTime}
                  onChange={(event) => updateDtmf({ idleTime: toNumber(event.target.value, dtmf.idleTime) })}
                />
              </Field>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="m-0 text-sm font-medium text-content-primary">联系人列表</h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {dtmf.group.map((value, index) => (
                <Field key={index} label={`组 ${index + 1}`}>
                  <Input value={value} onChange={(event) => updateDtmfGroup(index, event.target.value)} />
                </Field>
              ))}
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}

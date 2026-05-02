import { Card } from '../components/ui/Card.jsx';
import { PageTitleBar } from '../components/common/PageTitleBar.jsx';
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
    <PageLayout>
      <PageTitleBar title="DTMF 联系人" />

      <Card title="基础参数">
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
      </Card>

      <Card title="联系人列表">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {dtmf.group.map((value, index) => (
            <Field key={index} label={`组 ${index + 1}`}>
              <Input value={value} onChange={(event) => updateDtmfGroup(index, event.target.value)} />
            </Field>
          ))}
        </div>
      </Card>
    </PageLayout>
  );
}

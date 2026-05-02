import { Button } from '../components/ui/Button.jsx';
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

export function AdvancedPage() {
  const {
    connected,
    busy,
    radioImage,
    sendOptions,
    updateSendOption,
    updateVfo,
    handleReadRadio,
    handleWriteRadio,
    handleHandshake
  } = useAppContext();

  return (
    <PageLayout>
      <PageTitleBar title="高级设置" />

      <Card title="设备控制">
        <div className="flex flex-wrap gap-3">
          <Button variant="primary" onClick={handleReadRadio} disabled={!connected || busy}>
            读频
          </Button>
          <Button variant="secondary" onClick={handleWriteRadio} disabled={!connected || busy}>
            写频
          </Button>
          <Button onClick={handleHandshake} disabled={!connected || busy}>
            自动握手
          </Button>
        </div>
      </Card>

      <Card title="连接与分包参数">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Field label="MTU">
            <Input
              type="number"
              min={6}
              max={512}
              value={sendOptions.mtu}
              onChange={(event) => updateSendOption('mtu', toNumber(event.target.value, sendOptions.mtu))}
            />
          </Field>
          <Field label="分包长度">
            <Input
              type="number"
              min={1}
              max={64}
              value={sendOptions.chunkSize}
              onChange={(event) =>
                updateSendOption('chunkSize', toNumber(event.target.value, sendOptions.chunkSize))
              }
            />
          </Field>
          <Field label="发送间隔">
            <Input
              type="number"
              min={0}
              max={5000}
              value={sendOptions.chunkDelayMs}
              onChange={(event) =>
                updateSendOption('chunkDelayMs', toNumber(event.target.value, sendOptions.chunkDelayMs))
              }
            />
          </Field>
          <Field label="重发次数">
            <Input
              type="number"
              min={1}
              max={10}
              value={sendOptions.retries}
              onChange={(event) => updateSendOption('retries', toNumber(event.target.value, sendOptions.retries))}
            />
          </Field>
        </div>
      </Card>

      <Card title="VFO 设置">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="VFO A 频率">
            <Input
              value={radioImage.vfos.vfoAFreq}
              onChange={(event) => updateVfo({ vfoAFreq: event.target.value })}
            />
          </Field>
          <Field label="VFO B 频率">
            <Input
              value={radioImage.vfos.vfoBFreq}
              onChange={(event) => updateVfo({ vfoBFreq: event.target.value })}
            />
          </Field>
          <Field label="Offset A">
            <Input
              value={radioImage.vfos.vfoAOffset}
              onChange={(event) => updateVfo({ vfoAOffset: event.target.value })}
            />
          </Field>
          <Field label="Offset B">
            <Input
              value={radioImage.vfos.vfoBOffset}
              onChange={(event) => updateVfo({ vfoBOffset: event.target.value })}
            />
          </Field>
        </div>
      </Card>
    </PageLayout>
  );
}

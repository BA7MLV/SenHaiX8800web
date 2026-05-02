import { Badge } from '../components/ui/Badge.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Card } from '../components/ui/Card.jsx';
import { PageTitleBar } from '../components/common/PageTitleBar.jsx';
import { Field } from '../components/ui/Field.jsx';
import { Input } from '../components/ui/Input.jsx';
import { PageLayout } from '../components/ui/PageLayout.jsx';
import { Select } from '../components/ui/Select.jsx';
import { Surface } from '../components/ui/Surface.jsx';
import { Switch } from '../components/ui/Switch.jsx';
import { CHANNEL_OPTIONS } from '../protocol/shx8800';
import { useAppContext } from '../context/AppContext';

const boolOptions = [
  { label: '关闭', value: '0' },
  { label: '开启', value: '1' }
];

const scanModeOptions = [
  { label: 'TO', value: '0' },
  { label: 'CO', value: '1' },
  { label: 'SE', value: '2' }
];

const toneOptions = CHANNEL_OPTIONS.pttid.map((label, value) => ({ label, value: String(value) }));

function toNumber(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

function NumberField({ label, value, min, max, onChange }) {
  return (
    <Field label={label}>
      <Input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(event) => onChange(toNumber(event.target.value, value))}
      />
    </Field>
  );
}

export function SettingsPage() {
  const {
    busy,
    connected,
    isRadioDirty,
    radioImage,
    sendOptions,
    updateFunctionConfig,
    updateSendOption,
    handleHandshake,
    handleReadRadio,
    handleWriteRadio
  } = useAppContext();

  const { functionConfig } = radioImage;

  return (
    <PageLayout>
      <PageTitleBar
        title="设置管理"
        actions={
          <>
            <Badge variant={isRadioDirty ? 'warning' : 'success'}>
              {isRadioDirty ? '未写入' : '已写入'}
            </Badge>
            <Button onClick={handleHandshake} disabled={!connected || busy}>
              自动握手
            </Button>
            <Button variant="secondary" onClick={handleReadRadio} disabled={!connected || busy}>
              读频
            </Button>
            <Button
              variant={isRadioDirty ? 'primary' : 'secondary'}
              onClick={handleWriteRadio}
              disabled={!connected || busy || !isRadioDirty}
            >
              写频
            </Button>
          </>
        }
      />

      <Card title="设备控制">
        <div className="flex flex-wrap gap-3">
          <Button onClick={handleHandshake} disabled={!connected || busy}>
            自动握手
          </Button>
          <Button variant="secondary" onClick={handleReadRadio} disabled={!connected || busy}>
            读频
          </Button>
          <Button
            variant={isRadioDirty ? 'primary' : 'secondary'}
            onClick={handleWriteRadio}
            disabled={!connected || busy || !isRadioDirty}
          >
            写频
          </Button>
        </div>
      </Card>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card title="BLE 参数">
          <div className="grid gap-4">
            <NumberField
              label="MTU"
              min={6}
              max={512}
              value={sendOptions.mtu}
              onChange={(value) => updateSendOption('mtu', value)}
            />
            <NumberField
              label="分包长度"
              min={1}
              max={64}
              value={sendOptions.chunkSize}
              onChange={(value) => updateSendOption('chunkSize', value)}
            />
            <NumberField
              label="发送间隔"
              min={0}
              max={5000}
              value={sendOptions.chunkDelayMs}
              onChange={(value) => updateSendOption('chunkDelayMs', value)}
            />
            <NumberField
              label="重试次数"
              min={1}
              max={10}
              value={sendOptions.retries}
              onChange={(value) => updateSendOption('retries', value)}
            />
          </div>
        </Card>

        <Card title="常用机身设置">
          <div className="grid gap-4">
            <NumberField
              label="静噪等级"
              min={0}
              max={9}
              value={functionConfig.sql}
              onChange={(value) => updateFunctionConfig({ sql: value })}
            />
            <NumberField
              label="VOX 等级"
              min={0}
              max={9}
              value={functionConfig.vox}
              onChange={(value) => updateFunctionConfig({ vox: value })}
            />
            <NumberField
              label="背光时间"
              min={0}
              max={9}
              value={functionConfig.backlight}
              onChange={(value) => updateFunctionConfig({ backlight: value })}
            />
            <Field label="按键提示音">
              <Select
                value={String(functionConfig.beep)}
                options={boolOptions}
                onChange={(event) => updateFunctionConfig({ beep: toNumber(event.target.value, functionConfig.beep) })}
              />
            </Field>
            <Field label="语音提示">
              <Select
                value={String(functionConfig.voiceSw)}
                options={boolOptions}
                onChange={(event) =>
                  updateFunctionConfig({ voiceSw: toNumber(event.target.value, functionConfig.voiceSw) })
                }
              />
            </Field>
            <Field label="扫描模式">
              <Select
                value={String(functionConfig.scanMode)}
                options={scanModeOptions}
                onChange={(event) =>
                  updateFunctionConfig({ scanMode: toNumber(event.target.value, functionConfig.scanMode) })
                }
              />
            </Field>
            <Field label="提示音方案">
              <Select
                value={String(functionConfig.tone)}
                options={toneOptions}
                onChange={(event) => updateFunctionConfig({ tone: toNumber(event.target.value, functionConfig.tone) })}
              />
            </Field>
            <Surface variant="muted" className="flex items-center justify-between gap-4 p-4">
              <div className="text-sm font-medium text-content-primary">双守候</div>
              <div className="flex items-center gap-3 text-sm text-content-secondary">
                <Switch
                  checked={Boolean(functionConfig.dualStandby)}
                  onChange={(checked) => updateFunctionConfig({ dualStandby: checked ? 1 : 0 })}
                  label="双守候"
                />
                {functionConfig.dualStandby ? '开启' : '关闭'}
              </div>
            </Surface>
          </div>
        </Card>
      </div>
    </PageLayout>
  );
}

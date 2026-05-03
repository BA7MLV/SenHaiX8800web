import { Field } from '../components/ui/Field.jsx';
import { Input } from '../components/ui/Input.jsx';
import { PageLayout } from '../components/ui/PageLayout.jsx';
import { Select } from '../components/ui/Select.jsx';
import { CHANNEL_OPTIONS } from '../protocol/shx8800';
import { useAppContext } from '../context/AppContext';

const powerOptions = CHANNEL_OPTIONS.power.map((label, value) => ({ label, value: String(value) }));
const bandwidthOptions = CHANNEL_OPTIONS.bandwidth.map((label, value) => ({ label, value: String(value) }));
const signalOptions = Array.from({ length: 16 }, (_, value) => ({
  label: value === 0 ? '关闭' : `组 ${value}`,
  value: String(value)
}));

function toNumber(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

function VfoSection({ title, prefix, vfos, updateVfo }) {
  return (
    <div className="space-y-4">
      <h3 className="m-0 text-sm font-medium text-content-primary">{title}</h3>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Field label="频率">
          <Input
            value={vfos[`${prefix}Freq`]}
            onChange={(event) => updateVfo({ [`${prefix}Freq`]: event.target.value })}
          />
        </Field>
        <Field label="偏移">
          <Input
            value={vfos[`${prefix}Offset`]}
            onChange={(event) => updateVfo({ [`${prefix}Offset`]: event.target.value })}
          />
        </Field>
        <Field label="接收亚音">
          <Input
            value={vfos[`${prefix}RxTone`]}
            onChange={(event) => updateVfo({ [`${prefix}RxTone`]: event.target.value })}
          />
        </Field>
        <Field label="发射亚音">
          <Input
            value={vfos[`${prefix}TxTone`]}
            onChange={(event) => updateVfo({ [`${prefix}TxTone`]: event.target.value })}
          />
        </Field>
        <Field label="发射功率">
          <Select
            value={String(vfos[`${prefix}TxPower`])}
            options={powerOptions}
            onChange={(event) =>
              updateVfo({ [`${prefix}TxPower`]: toNumber(event.target.value, vfos[`${prefix}TxPower`]) })
            }
          />
        </Field>
        <Field label="带宽">
          <Select
            value={String(vfos[`${prefix}Bandwidth`])}
            options={bandwidthOptions}
            onChange={(event) =>
              updateVfo({ [`${prefix}Bandwidth`]: toNumber(event.target.value, vfos[`${prefix}Bandwidth`]) })
            }
          />
        </Field>
        <Field label="信令组">
          <Select
            value={String(vfos[`${prefix}SignalGroup`])}
            options={signalOptions}
            onChange={(event) =>
              updateVfo({
                [`${prefix}SignalGroup`]: toNumber(event.target.value, vfos[`${prefix}SignalGroup`])
              })
            }
          />
        </Field>
      </div>
    </div>
  );
}

export function RadioPage() {
  const { radioImage, updateFm, updateFmChannel, updateVfo } = useAppContext();
  const { fm, vfos } = radioImage;

  return (
    <PageLayout className="gap-4">
      <div className="rounded-[8px] border border-line-subtle bg-white">
        <div className="px-6 py-4">
          <h1 className="m-0 text-lg font-semibold text-content-primary">
            收音机
          </h1>
        </div>

        <div className="border-t border-line-subtle px-6 py-4 space-y-6">
          <div className="space-y-6">
            <VfoSection title="VFO A" prefix="vfoA" vfos={vfos} updateVfo={updateVfo} />
            <VfoSection title="VFO B" prefix="vfoB" vfos={vfos} updateVfo={updateVfo} />
          </div>

          <div className="space-y-4">
            <h3 className="m-0 text-sm font-medium text-content-primary">FM 预设</h3>
            <div className="grid gap-4 sm:grid-cols-[160px_minmax(0,1fr)] sm:items-center">
              <Field label="当前频点">
                <Input
                  type="number"
                  min={0}
                  max={1080}
                  value={fm.curFreq}
                  onChange={(event) => updateFm({ curFreq: toNumber(event.target.value, fm.curFreq) })}
                />
              </Field>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
              {fm.channels.map((channel, index) => (
                <Field key={index} label={`CH${index + 1}`}>
                  <Input
                    type="number"
                    min={0}
                    max={1080}
                    value={channel}
                    onChange={(event) => updateFmChannel(index, toNumber(event.target.value, channel))}
                  />
                </Field>
              ))}
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}

import { useEffect } from 'react';
import { X } from 'lucide-react';

const CHANNEL_LABELS = {
  name: '名称',
  rxFreq: '接收频率',
  txFreq: '发射频率',
  rxTone: '接收亚音',
  txTone: '发射亚音',
  txPower: '功率',
  bandwidth: '带宽',
  scanAdd: '扫描',
  busyLock: '忙锁',
  pttid: 'PTT ID',
  signalGroup: '信令组'
};

function diffChannels(orig, curr) {
  if (!orig || !curr) return [];
  const diffs = [];
  for (let bank = 0; bank < orig.length; bank++) {
    const origBank = orig[bank] ?? [];
    const currBank = curr[bank] ?? [];
    const len = Math.max(origBank.length, currBank.length);
    for (let ch = 0; ch < len; ch++) {
      const origCh = origBank[ch];
      const currCh = currBank[ch];
      if (!origCh && !currCh) continue;
      const changes = [];
      for (const key of Object.keys(CHANNEL_LABELS)) {
        if ((origCh?.[key] ?? '') !== (currCh?.[key] ?? '')) {
          changes.push({ key, from: origCh?.[key] ?? '', to: currCh?.[key] ?? '' });
        }
      }
      if (changes.length > 0) {
        diffs.push({ bank, ch, label: currCh?.name || `信道 ${ch + 1}`, changes });
      }
    }
  }
  return diffs;
}

function diffArray(orig = [], curr = [], label) {
  const changes = [];
  const len = Math.max(orig.length, curr.length);
  for (let i = 0; i < len; i++) {
    if ((orig[i] ?? '') !== (curr[i] ?? '')) {
      changes.push({ key: `#${i + 1}`, from: orig[i] ?? '', to: curr[i] ?? '' });
    }
  }
  return changes.length ? { label, changes } : null;
}

function diffObject(orig = {}, curr = {}, label, keyLabels = {}) {
  const changes = [];
  const keys = new Set([...Object.keys(orig), ...Object.keys(curr)]);
  for (const k of keys) {
    if (typeof orig[k] === 'object' || typeof curr[k] === 'object') continue;
    if ((orig[k] ?? '') !== (curr[k] ?? '')) {
      changes.push({ key: keyLabels[k] ?? k, from: orig[k] ?? '', to: curr[k] ?? '' });
    }
  }
  return changes.length ? { label, changes } : null;
}

function computeDiff(orig, curr) {
  if (!orig || !curr) return { channelDiffs: [], propertyDiffs: [], changedCount: 0 };
  const channelDiffs = diffChannels(orig.channels, curr.channels);
  const propertyDiffs = [
    orig.model !== curr.model && { label: '机型', changes: [{ key: '型号', from: orig.model, to: curr.model }] },
    diffArray(orig.bankNames, curr.bankNames, '区域名称'),
    diffObject(orig.vfos, curr.vfos, 'VFO'),
    diffObject(orig.functionConfig, curr.functionConfig, '功能配置'),
    diffObject(orig.fm, curr.fm, 'FM 收音机'),
    diffObject(orig.dtmf, curr.dtmf, 'DTMF')
  ].filter(Boolean);
  const changedCount =
    channelDiffs.length + propertyDiffs.reduce((n, g) => n + g.changes.length, 0);
  return { channelDiffs, propertyDiffs, changedCount };
}

function PropertyGroup({ group }) {
  return (
    <div className="space-y-1">
      <p className="m-0 px-3 pt-2 text-xs font-medium text-content-muted">{group.label}</p>
      {group.changes.map((c, i) => (
        <div key={i} className="grid grid-cols-[100px_1fr_1fr] items-start gap-2 border-t border-line-subtle px-3 py-2 text-xs">
          <span className="text-content-muted">{c.key}</span>
          <span className="truncate text-content-faint line-through">{String(c.from)}</span>
          <span className="truncate font-medium text-interactive">{String(c.to)}</span>
        </div>
      ))}
    </div>
  );
}

export function DiffModal({ open, onClose, original, current }) {
  const { channelDiffs, propertyDiffs, changedCount } = computeDiff(original, current);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-modal flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div
        className="relative mx-4 max-h-[80vh] w-full max-w-xl overflow-hidden rounded-lg border border-line bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-line-subtle px-4 py-3">
          <h2 className="m-0 text-sm font-semibold text-content-primary">
            修改详情 {changedCount > 0 && <span className="ml-1 text-content-muted">({changedCount} 项)</span>}
          </h2>
          <button onClick={onClose} className="rounded p-1 text-content-muted hover:bg-surface-muted hover:text-content-primary">
            <X className="size-4" />
          </button>
        </div>

        <div className="max-h-[65vh] overflow-y-auto">
          {changedCount === 0 ? (
            <p className="p-4 text-sm text-content-muted">暂无修改。</p>
          ) : (
            <>
              {channelDiffs.length > 0 && (
                <div>
                  <p className="m-0 px-3 pt-3 text-xs font-medium text-content-muted">
                    信道修改 ({channelDiffs.length} 个信道)
                  </p>
                  {channelDiffs.map((d, i) => (
                    <div key={i} className="border-t border-line-subtle">
                      <p className="m-0 px-3 pt-2 text-xs font-medium text-content-secondary">
                        区域 {d.bank + 1} · {d.label}
                      </p>
                      {d.changes.map((c, j) => (
                        <div key={j} className="grid grid-cols-[100px_1fr_1fr] items-start gap-2 px-3 py-1.5 text-xs">
                          <span className="text-content-muted">{CHANNEL_LABELS[c.key]}</span>
                          <span className="truncate text-content-faint line-through">{String(c.from)}</span>
                          <span className="truncate font-medium text-interactive">{String(c.to)}</span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
              {propertyDiffs.map((g, i) => (
                <div key={i} className="border-t border-line-subtle">
                  <PropertyGroup group={g} />
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const CHANNEL_FIELD_ORDER = [
  'name',
  'rxFreq',
  'txFreq',
  'rxTone',
  'txTone',
  'txPower',
  'bandwidth',
  'scanAdd',
  'busyLock',
  'pttid',
  'signalGroup',
  'isVisible'
];

function sortIndexes(indexes = []) {
  return Array.from(new Set(indexes))
    .filter((index) => Number.isInteger(index) && index >= 0)
    .sort((left, right) => left - right);
}

function createEmptyChannel(id) {
  return {
    id,
    rxFreq: '',
    txFreq: '',
    rxTone: 'OFF',
    txTone: 'OFF',
    txPower: 0,
    bandwidth: 0,
    scanAdd: 0,
    busyLock: 0,
    pttid: 0,
    signalGroup: 0,
    name: '',
    isVisible: false
  };
}

function cloneChannel(channel = {}) {
  return {
    ...createEmptyChannel(channel.id ?? 1),
    ...channel,
    isVisible: channel.isVisible ?? Boolean(channel.rxFreq)
  };
}

function normalizeBank(bank) {
  return bank.map((channel, index) => ({
    ...createEmptyChannel(index + 1),
    ...cloneChannel(channel),
    id: index + 1,
    isVisible: Boolean(channel?.isVisible ?? channel?.rxFreq)
  }));
}

function clearChannelAt(bank, index) {
  bank[index] = createEmptyChannel(index + 1);
}

export function moveSelectedChannels(bank, selectedIndexes, direction) {
  const nextBank = normalizeBank(bank);
  const selected = new Set(sortIndexes(selectedIndexes));

  if (direction === 'up') {
    for (let index = 1; index < nextBank.length; index += 1) {
      if (selected.has(index) && !selected.has(index - 1)) {
        [nextBank[index - 1], nextBank[index]] = [nextBank[index], nextBank[index - 1]];
      }
    }
  }

  if (direction === 'down') {
    for (let index = nextBank.length - 2; index >= 0; index -= 1) {
      if (selected.has(index) && !selected.has(index + 1)) {
        [nextBank[index], nextBank[index + 1]] = [nextBank[index + 1], nextBank[index]];
      }
    }
  }

  return normalizeBank(nextBank);
}

export function copyChannels(bank, selectedIndexes, mode = 'copy') {
  const nextBank = normalizeBank(bank);
  const orderedIndexes = sortIndexes(selectedIndexes);
  const clipboard = {
    channels: orderedIndexes.map((index) => cloneChannel(nextBank[index])),
    sourceIndexes: orderedIndexes,
    mode
  };

  if (mode === 'cut') {
    orderedIndexes.forEach((index) => clearChannelAt(nextBank, index));
  }

  return {
    nextBank: normalizeBank(nextBank),
    clipboard
  };
}

export function pasteChannels(bank, startIndex, clipboard) {
  const nextBank = normalizeBank(bank);
  const sourceChannels = clipboard?.channels ?? [];

  sourceChannels.forEach((channel, offset) => {
    const targetIndex = startIndex + offset;
    if (targetIndex < 0 || targetIndex >= nextBank.length) return;
    nextBank[targetIndex] = {
      ...createEmptyChannel(targetIndex + 1),
      ...cloneChannel(channel),
      id: targetIndex + 1
    };
  });

  return normalizeBank(nextBank);
}

export function duplicateChannelsToRange(bank, selectedIndexes, startIndex, endIndex) {
  const nextBank = normalizeBank(bank);
  const orderedIndexes = sortIndexes(selectedIndexes);
  const sourceChannels = orderedIndexes.map((index) => cloneChannel(nextBank[index]));
  if (!sourceChannels.length) return nextBank;

  const rangeStart = Math.max(0, Math.min(startIndex, endIndex));
  const rangeEnd = Math.min(nextBank.length - 1, Math.max(startIndex, endIndex));

  for (let index = rangeStart; index <= rangeEnd; index += 1) {
    const source = sourceChannels[(index - rangeStart) % sourceChannels.length];
    nextBank[index] = {
      ...createEmptyChannel(index + 1),
      ...cloneChannel(source),
      id: index + 1
    };
  }

  return normalizeBank(nextBank);
}

export function clearSelectedChannels(bank, selectedIndexes) {
  const nextBank = normalizeBank(bank);
  sortIndexes(selectedIndexes).forEach((index) => clearChannelAt(nextBank, index));
  return normalizeBank(nextBank);
}

function escapeCsvValue(value) {
  const text = String(value ?? '');
  if (!/[",\n]/.test(text)) return text;
  return `"${text.replaceAll('"', '""')}"`;
}

function parseCsv(csvText) {
  const rows = [];
  let current = '';
  let row = [];
  let inQuotes = false;

  for (let index = 0; index < csvText.length; index += 1) {
    const char = csvText[index];
    const nextChar = csvText[index + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      row.push(current);
      current = '';
      continue;
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        index += 1;
      }
      row.push(current);
      rows.push(row);
      row = [];
      current = '';
      continue;
    }

    current += char;
  }

  if (current.length > 0 || row.length > 0) {
    row.push(current);
    rows.push(row);
  }

  return rows.filter((cols) => cols.some((value) => value !== ''));
}

function toNumber(value, fallback = 0) {
  const parsed = Number.parseInt(String(value ?? '').trim(), 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

export function exportChannelsToCsv(bank, selectedIndexes = []) {
  const nextBank = normalizeBank(bank);
  const orderedIndexes = sortIndexes(selectedIndexes);
  const rows = (orderedIndexes.length ? orderedIndexes : nextBank.map((_, index) => index)).map((index) => {
    const channel = nextBank[index];
    return [
      index + 1,
      channel.name,
      channel.rxFreq,
      channel.txFreq,
      channel.rxTone,
      channel.txTone,
      channel.txPower,
      channel.bandwidth,
      channel.scanAdd,
      channel.busyLock,
      channel.pttid,
      channel.signalGroup,
      channel.isVisible ? 1 : 0
    ];
  });

  return [
    ['slot', ...CHANNEL_FIELD_ORDER].join(','),
    ...rows.map((row) => row.map(escapeCsvValue).join(','))
  ].join('\n');
}

export function importChannelsFromCsv(csvText, options = {}) {
  const rows = parseCsv(csvText.trim());
  if (rows.length < 2) {
    return { channels: [], warnings: ['CSV 内容为空'] };
  }

  const [header, ...body] = rows;
  
  // 支持中英文表头映射
  const headerMapping = {
    '序号': 'slot',
    '信道名称': 'name',
    '接收频率': 'rxFreq',
    '发送频率': 'txFreq',
    '接收亚音': 'rxTone',
    '发送亚音': 'txTone',
    '发送功率': 'txPower',
    '带宽': 'bandwidth',
    '扫描': 'scanAdd',
    '忙锁': 'busyLock',
    'PTT ID': 'pttid',
    '信令组': 'signalGroup',
    '是否可见': 'isVisible'
  };
  
  const normalizedHeader = header.map((name) => {
    const trimmed = name.trim();
    return headerMapping[trimmed] || trimmed;
  });
  
  const columnIndex = Object.fromEntries(normalizedHeader.map((name, index) => [name, index]));
  const channels = body.slice(0, options.bankSize ?? body.length).map((columns, index) => {
    const channel = createEmptyChannel(index + 1);
    channel.name = columns[columnIndex.name] ?? '';
    channel.rxFreq = columns[columnIndex.rxFreq] ?? '';
    channel.txFreq = columns[columnIndex.txFreq] ?? '';
    channel.rxTone = columns[columnIndex.rxTone] ?? 'OFF';
    channel.txTone = columns[columnIndex.txTone] ?? 'OFF';
    channel.txPower = toNumber(columns[columnIndex.txPower], 0);
    channel.bandwidth = toNumber(columns[columnIndex.bandwidth], 0);
    channel.scanAdd = toNumber(columns[columnIndex.scanAdd], 0);
    channel.busyLock = toNumber(columns[columnIndex.busyLock], 0);
    channel.pttid = toNumber(columns[columnIndex.pttid], 0);
    channel.signalGroup = toNumber(columns[columnIndex.signalGroup], 0);
    channel.isVisible = (columns[columnIndex.isVisible] ?? '') === '1' || Boolean(channel.rxFreq);
    return channel;
  });

  return { channels, warnings: [] };
}

export function generateCsvTemplate() {
  const headers = [
    '序号',
    '信道名称',
    '接收频率',
    '发送频率',
    '接收亚音',
    '发送亚音',
    '发送功率',
    '带宽',
    '扫描',
    '忙锁',
    'PTT ID',
    '信令组',
    '是否可见'
  ];

  const sampleRows = [
    [1, '示例信道1', '462.5625', '467.5625', 'OFF', 'OFF', 0, 0, 0, 0, 0, 0, 1],
    [2, '示例信道2', '462.5875', '467.5875', '67.0', '67.0', 1, 1, 1, 1, 1, 1, 1]
  ];

  return [
    headers.join(','),
    ...sampleRows.map((row) => row.map(escapeCsvValue).join(','))
  ].join('\n');
}

export function downloadCsvTemplate(model = 'radio') {
  const csv = generateCsvTemplate();
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${String(model).toLowerCase()}-channel-template.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

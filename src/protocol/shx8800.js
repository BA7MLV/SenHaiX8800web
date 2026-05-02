import GBK from 'gbk.js';

export const HANDSHAKE_HEX = '50524F4752414D5348585055';
export const HANDSHAKE_ACK_HEX = '46';
export const READ_COMMAND = 0x52;
export const WRITE_COMMAND = 0x57;
export const END_READ_COMMAND = 0x45;
export const BLOCK_SIZE = 64;
export const CHANNEL_BANKS = 8;
export const CHANNELS_PER_BANK = 64;
export const CHANNEL_NAME_BYTES = 12;
export const BANK_NAME_BYTES = 12;
export const READ_ADDRESSES = [
  ...Array.from({ length: 256 }, (_, index) => index * 64),
  32768,
  36864,
  40960,
  41024,
  41088,
  41152,
  41216,
  41472,
  41536,
  45056
];

const DCS_TABLE = [
  'D023N', 'D025N', 'D026N', 'D031N', 'D032N', 'D036N', 'D043N', 'D047N', 'D051N', 'D053N',
  'D054N', 'D065N', 'D071N', 'D072N', 'D073N', 'D074N', 'D114N', 'D115N', 'D116N', 'D122N',
  'D125N', 'D131N', 'D132N', 'D134N', 'D143N', 'D145N', 'D152N', 'D155N', 'D156N', 'D162N',
  'D165N', 'D172N', 'D174N', 'D205N', 'D212N', 'D223N', 'D225N', 'D226N', 'D243N', 'D244N',
  'D245N', 'D246N', 'D251N', 'D252N', 'D255N', 'D261N', 'D263N', 'D265N', 'D266N', 'D271N',
  'D274N', 'D306N', 'D311N', 'D315N', 'D325N', 'D331N', 'D332N', 'D343N', 'D346N', 'D351N',
  'D356N', 'D364N', 'D365N', 'D371N', 'D411N', 'D412N', 'D413N', 'D423N', 'D431N', 'D432N',
  'D445N', 'D446N', 'D452N', 'D454N', 'D455N', 'D462N', 'D464N', 'D465N', 'D466N', 'D503N',
  'D506N', 'D516N', 'D523N', 'D526N', 'D532N', 'D546N', 'D565N', 'D606N', 'D612N', 'D624N',
  'D627N', 'D631N', 'D632N', 'D645N', 'D654N', 'D662N', 'D664N', 'D703N', 'D712N', 'D723N',
  'D731N', 'D732N', 'D734N', 'D743N', 'D754N', 'D023I', 'D025I', 'D026I', 'D031I', 'D032I',
  'D036I', 'D043I', 'D047I', 'D051I', 'D053I', 'D054I', 'D065I', 'D071I', 'D072I', 'D073I',
  'D074I', 'D114I', 'D115I', 'D116I', 'D122I', 'D125I', 'D131I', 'D132I', 'D134I', 'D143I',
  'D145I', 'D152I', 'D155I', 'D156I', 'D162I', 'D165I', 'D172I', 'D174I', 'D205I', 'D212I',
  'D223I', 'D225I', 'D226I', 'D243I', 'D244I', 'D245I', 'D246I', 'D251I', 'D252I', 'D255I',
  'D261I', 'D263I', 'D265I', 'D266I', 'D271I', 'D274I', 'D306I', 'D311I', 'D315I', 'D325I',
  'D331I', 'D332I', 'D343I', 'D346I', 'D351I', 'D356I', 'D364I', 'D365I', 'D371I', 'D411I',
  'D412I', 'D413I', 'D423I', 'D431I', 'D432I', 'D445I', 'D446I', 'D452I', 'D454I', 'D455I',
  'D462I', 'D464I', 'D465I', 'D466I', 'D503I', 'D506I', 'D516I', 'D523I', 'D526I', 'D532I',
  'D546I', 'D565I', 'D606I', 'D612I', 'D624I', 'D627I', 'D631I', 'D632I', 'D645I', 'D654I',
  'D662I', 'D664I', 'D703I', 'D712I', 'D723I', 'D731I', 'D732I', 'D734I', 'D743I', 'D754I'
];

export const CHANNEL_OPTIONS = {
  power: ['High', 'Mid', 'Low'],
  bandwidth: ['Wide', 'Narrow'],
  scanAdd: ['Delete', 'Add'],
  busyLock: ['Off', 'On'],
  pttid: ['None', 'Press PTT', 'Release PTT', 'Press+Release'],
  signalGroup: Array.from({ length: 15 }, (_, index) => String(index + 1))
};

export const RADIO_MODELS = [
  { value: '8600', label: '8600' },
  { value: '8800', label: '8800' },
  { value: '8800Pro', label: '8800 Pro' },
  { value: 'GT12', label: 'GT12' },
  { value: 'SHX8800', label: 'SHX8800' }
];

const DTMF_ALPHABET = '0123456789ABCD*#';

function cloneBytes(input, fillValue = 0xff, length = BLOCK_SIZE) {
  const bytes = new Uint8Array(length).fill(fillValue);
  if (input) {
    bytes.set(input.slice(0, length));
  }
  return bytes;
}

function normalizeAddressKey(address) {
  return Number.parseInt(String(address), 10);
}

function encodeGbk(text, maxLength) {
  const encoded = Uint8Array.from(GBK.encode(text ?? ''));
  return encoded.slice(0, maxLength);
}

function decodeGbk(bytes) {
  const stopIndex = bytes.findIndex((byte) => byte === 0xff || byte === 0x00);
  const visibleBytes = stopIndex === -1 ? bytes : bytes.slice(0, stopIndex);
  if (!visibleBytes.length) return '';
  return GBK.decode(Array.from(visibleBytes));
}

function createDefaultChannel(index) {
  return {
    id: index + 1,
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

function createDefaultDtmf() {
  return {
    localId: '100',
    pttid: 0,
    wordTime: 1,
    idleTime: 1,
    group: Array.from({ length: 15 }, (_, index) => String(101 + index))
  };
}

function createDefaultFunctionConfig() {
  return {
    sql: 3,
    saveMode: 1,
    vox: 1,
    backlight: 5,
    dualStandby: 0,
    tot: 2,
    beep: 1,
    voiceSw: 1,
    sideTone: 0,
    scanMode: 1,
    pttDly: 4,
    chADisType: 0,
    chBDisType: 0,
    autoLock: 2,
    alarmMode: 0,
    localSosTone: 1,
    tailClear: 1,
    rptTailClear: 5,
    rptTailDet: 5,
    roger: 0,
    fmEnable: 0,
    chAWorkmode: 0,
    chBWorkmode: 0,
    keyLock: 0,
    powerOnDisType: 0,
    tone: 2,
    voxDlyTime: 5,
    menuQuitTime: 1,
    micGain: 1,
    pwrOnDlyTime: 0,
    voxSw: 0,
    key2Short: 0,
    key2Long: 1,
    curBankA: 0,
    curBankB: 0,
    btMicGain: 2,
    bluetoothAudioGain: 2,
    callSign: ''
  };
}

function createDefaultVfos() {
  return {
    pttid: 0,
    vfoAFreq: '440.62500',
    vfoAOffset: '000.0000',
    vfoARxTone: 'OFF',
    vfoATxTone: 'OFF',
    vfoABusyLock: 0,
    vfoADir: 0,
    vfoASignalGroup: 0,
    vfoATxPower: 0,
    vfoABandwidth: 0,
    vfoAStep: 0,
    vfoBFreq: '145.62500',
    vfoBOffset: '000.0000',
    vfoBRxTone: 'OFF',
    vfoBTxTone: 'OFF',
    vfoBBusyLock: 0,
    vfoBDir: 0,
    vfoBSignalGroup: 0,
    vfoBTxPower: 0,
    vfoBBandwidth: 0,
    vfoBStep: 0
  };
}

function createDefaultFm() {
  return {
    curFreq: 904,
    channels: new Array(30).fill(0)
  };
}

export function normalizeRadioModel(value) {
  const normalized = String(value ?? '').trim();
  if (!normalized) return 'SHX8800';

  const uppercase = normalized.toUpperCase();
  if (uppercase === 'SHX8600' || uppercase === '8600') return '8600';
  if (uppercase === 'SHX8800' || uppercase === '8800') return '8800';
  if (uppercase === 'SHX8800PRO' || uppercase === '8800PRO' || uppercase === '8800 PRO') {
    return '8800Pro';
  }
  if (uppercase === 'GT12' || uppercase === 'SHXGT12') return 'GT12';
  return normalized;
}

export function bytesToHex(bytes) {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join(' ')
    .toUpperCase();
}

export function hexToBytes(hex) {
  const normalized = hex.replace(/[^0-9a-f]/gi, '');
  if (normalized.length % 2 !== 0) {
    throw new Error('Hex string length must be even');
  }

  return Uint8Array.from(
    normalized.match(/.{1,2}/g)?.map((pair) => Number.parseInt(pair, 16)) ?? []
  );
}

export function buildReadFrame(address) {
  return Uint8Array.of(READ_COMMAND, (address >> 8) & 0xff, address & 0xff, BLOCK_SIZE);
}

export function buildWriteFrame(address, payload) {
  const bytes = cloneBytes(payload, 0x00, BLOCK_SIZE);
  const frame = new Uint8Array(4 + BLOCK_SIZE);
  frame[0] = WRITE_COMMAND;
  frame[1] = (address >> 8) & 0xff;
  frame[2] = address & 0xff;
  frame[3] = BLOCK_SIZE;
  frame.set(bytes, 4);
  return frame;
}

export function frequencyToChannelBytes(freq) {
  const digits = Number.parseInt(String(freq).replace('.', ''), 10);
  if (!Number.isFinite(digits)) {
    return new Uint8Array([0xff, 0xff, 0xff, 0xff]);
  }

  let remaining = digits;
  const bytes = new Uint8Array(4);
  for (let index = 0; index < 4; index += 1) {
    const pair = remaining % 100;
    remaining = Math.floor(remaining / 100);
    bytes[index] = (((Math.floor(pair / 10)) & 0x0f) << 4) | (pair % 10);
  }
  return bytes;
}

export function channelBytesToFrequency(bytes) {
  let value = 0;
  for (let index = 3; index >= 0; index -= 1) {
    const bcd = bytes[index];
    const decimal = ((bcd >> 4) & 0x0f) * 10 + (bcd & 0x0f);
    value = value * 100 + decimal;
  }
  return String(value).padStart(8, '0').replace(/^(\d{3})(\d{5})$/, '$1.$2');
}

function toneStringToBytes(value) {
  if (!value || value === 'OFF') {
    return Uint8Array.of(0x00, 0x00);
  }

  if (value.startsWith('D')) {
    const index = DCS_TABLE.indexOf(value);
    return Uint8Array.of(index === -1 ? 0x00 : index + 1, 0x00);
  }

  const digits = Number.parseInt(value.replace('.', ''), 10);
  return Uint8Array.of(digits & 0xff, (digits >> 8) & 0xff);
}

function bytesToTone(bytes, offset = 0) {
  const low = bytes[offset];
  const high = bytes[offset + 1];

  if (high === 0) {
    if (low > 0 && low <= DCS_TABLE.length) {
      return DCS_TABLE[low - 1];
    }
    return 'OFF';
  }

  if (low !== 0 && low !== 0xff) {
    const value = (high << 8) + low;
    const raw = String(value);
    return `${raw.slice(0, -1)}.${raw.slice(-1)}`;
  }

  return 'OFF';
}

function encodeNameInto(bytes, offset, value, maxLength = CHANNEL_NAME_BYTES) {
  const encoded = encodeGbk(value, maxLength);
  bytes.set(encoded, offset);
}

function decodeFrequencyDigits(bytes, start) {
  let value = 0;
  for (let index = 0; index < 8; index += 1) {
    value *= 10;
    value += bytes[start + index];
  }
  return String(value).padStart(8, '0').replace(/^(\d{3})(\d{5})$/, '$1.$2');
}

function encodeVfoFrequency(freq) {
  const digits = String(freq).replace('.', '').padStart(8, '0').slice(-8);
  return Uint8Array.from(digits.split('').map((digit) => Number.parseInt(digit, 10)));
}

function decodeOffset(bytes, offset) {
  let value = 0;
  for (let index = 0; index < 7; index += 1) {
    value *= 10;
    value += bytes[offset + index];
  }
  return String(value).padStart(7, '0').replace(/^(\d{3})(\d{4})$/, '$1.$2');
}

function encodeOffset(text) {
  const parts = String(text).split('.');
  const numeric = Number.parseInt(parts[0], 10) * 100000 + Number.parseInt(parts[1], 10) * 10;
  let remaining = numeric;
  const bytes = new Uint8Array(7);
  for (let index = 6; index >= 0; index -= 1) {
    bytes[index] = remaining % 10;
    remaining = Math.floor(remaining / 10);
  }
  return bytes;
}

function encodeDtmfWord(word) {
  const bytes = new Uint8Array(16).fill(0xff);
  if (!word) return bytes;
  for (let index = 0; index < Math.min(word.length, 16); index += 1) {
    const mapped = DTMF_ALPHABET.indexOf(word[index].toUpperCase());
    if (mapped === -1) break;
    bytes[index] = mapped;
  }
  return bytes;
}

function decodeDtmfWord(bytes, offset) {
  let result = '';
  for (let index = 0; index < 6 && bytes[offset + index] !== 0xff; index += 1) {
    result += DTMF_ALPHABET[bytes[offset + index] % 16];
  }
  return result;
}

export function createEmptyRadioImage(model = 'SHX8800') {
  return {
    model: normalizeRadioModel(model),
    version: 1,
    bankNames: ['区域一', '区域二', '区域三', '区域四', '区域五', '区域六', '区域七', '区域八'],
    channels: Array.from({ length: CHANNEL_BANKS }, () =>
      Array.from({ length: CHANNELS_PER_BANK }, (_, index) => createDefaultChannel(index))
    ),
    dtmf: createDefaultDtmf(),
    functionConfig: createDefaultFunctionConfig(),
    fm: createDefaultFm(),
    vfos: createDefaultVfos(),
    rawBlocks: {}
  };
}

function decodeChannel(bytes, channel) {
  if (bytes[0] === 0xff || bytes[1] === 0xff || bytes[3] === 0x00) {
    return;
  }

  channel.rxFreq = channelBytesToFrequency(bytes.slice(0, 4));
  channel.txFreq = bytes[4] !== 0xff && bytes[5] !== 0xff ? channelBytesToFrequency(bytes.slice(4, 8)) : '';
  channel.rxTone = bytesToTone(bytes, 8);
  channel.txTone = bytesToTone(bytes, 10);
  channel.signalGroup = bytes[12] % 20;
  channel.pttid = bytes[13] % 4;
  channel.txPower = bytes[14] % 3;
  channel.bandwidth = (bytes[15] >> 6) & 0x01;
  channel.busyLock = (bytes[15] >> 3) & 0x01;
  channel.scanAdd = (bytes[15] >> 2) & 0x01;
  channel.name = decodeGbk(bytes.slice(20, 20 + CHANNEL_NAME_BYTES));
  channel.isVisible = Boolean(channel.rxFreq);
}

function encodeChannel(channel) {
  const bytes = new Uint8Array(32).fill(0xff);
  if (!channel?.rxFreq) {
    return bytes;
  }

  bytes.set(frequencyToChannelBytes(channel.rxFreq), 0);
  if (channel.txFreq) {
    bytes.set(frequencyToChannelBytes(channel.txFreq), 4);
  }
  bytes.set(toneStringToBytes(channel.rxTone), 8);
  bytes.set(toneStringToBytes(channel.txTone), 10);
  bytes[12] = channel.signalGroup ?? 0;
  bytes[13] = channel.pttid ?? 0;
  bytes[14] = channel.txPower ?? 0;
  bytes[15] = ((channel.bandwidth ?? 0) << 6) | ((channel.scanAdd ?? 0) << 2);
  encodeNameInto(bytes, 20, channel.name ?? '', CHANNEL_NAME_BYTES);
  return bytes;
}

function decodeVfos(block) {
  return {
    pttid: block[15] % 4,
    vfoAFreq: decodeFrequencyDigits(block, 0),
    vfoAOffset: decodeOffset(block, 20),
    vfoARxTone: bytesToTone(block, 8),
    vfoATxTone: bytesToTone(block, 10),
    vfoABusyLock: block[13] % 2,
    vfoADir: ((block[14] >> 4) & 0x03) % 3,
    vfoASignalGroup: (block[14] & 0x0f) % 16,
    vfoATxPower: (block[16] & 0x0f) % 3,
    vfoABandwidth: (block[17] >> 6) & 0x01,
    vfoAStep: block[19] % 8,
    vfoBFreq: decodeFrequencyDigits(block.slice(32), 0),
    vfoBOffset: decodeOffset(block, 52),
    vfoBRxTone: bytesToTone(block, 40),
    vfoBTxTone: bytesToTone(block, 42),
    vfoBBusyLock: block[45] % 2,
    vfoBDir: ((block[46] >> 4) & 0x03) % 3,
    vfoBSignalGroup: (block[46] & 0x0f) % 16,
    vfoBTxPower: (block[48] & 0x0f) % 3,
    vfoBBandwidth: (block[49] >> 6) & 0x01,
    vfoBStep: block[51] % 8
  };
}

function encodeVfoHalf(bytes, vfo, prefix) {
  bytes.set(encodeVfoFrequency(vfo[`${prefix}Freq`]), 0);
  bytes.set(toneStringToBytes(vfo[`${prefix}RxTone`]), 8);
  bytes.set(toneStringToBytes(vfo[`${prefix}TxTone`]), 10);
  bytes[13] = vfo[`${prefix}BusyLock`] ?? 0;
  bytes[14] = ((vfo[`${prefix}Dir`] ?? 0) << 4) | (vfo[`${prefix}SignalGroup`] ?? 0);
  bytes[16] = vfo[`${prefix}TxPower`] ?? 0;
  bytes[17] = (vfo[`${prefix}Bandwidth`] ?? 0) << 6;
  bytes[19] = vfo[`${prefix}Step`] ?? 0;
  bytes.set(encodeOffset(vfo[`${prefix}Offset`]), 20);
}

function encodeVfos(vfos) {
  const left = new Uint8Array(32).fill(0xff);
  const right = new Uint8Array(32).fill(0xff);
  left.set([0, 0, 0, 0, 0, 0, 0], 17);
  right.set([0, 0, 0, 0, 0, 0, 0], 17);
  encodeVfoHalf(left, vfos, 'vfoA');
  encodeVfoHalf(right, vfos, 'vfoB');
  return new Uint8Array([...left, ...right]);
}

function decodeFunctionConfig(block, image) {
  return {
    sql: block[0] % 10,
    saveMode: block[1] % 4,
    vox: block[2] % 10,
    backlight: block[3] % 9,
    dualStandby: block[4] % 2,
    tot: block[5] % 9,
    beep: block[6] % 2,
    voiceSw: block[7] % 2,
    sideTone: block[9] % 4,
    scanMode: block[10] % 3,
    pttDly: block[12] % 16,
    chADisType: block[13] % 3,
    chBDisType: block[14] % 3,
    autoLock: block[16] % 7,
    alarmMode: block[17] % 3,
    localSosTone: block[18] % 2,
    tailClear: block[20] % 2,
    rptTailClear: block[21] % 11,
    rptTailDet: block[22] % 11,
    roger: block[23] % 2,
    fmEnable: block[25] % 2,
    chAWorkmode: (block[26] & 0x0f) % 2,
    chBWorkmode: ((block[26] & 0xf0) >> 4) % 2,
    keyLock: block[27] % 2,
    powerOnDisType: block[28] % 22,
    tone: block[30] % 4,
    voxDlyTime: block[32] % 16,
    menuQuitTime: block[33] % 11,
    micGain: block[34] % 3,
    pwrOnDlyTime: block[36] % 15,
    voxSw: block[37] % 2,
    key2Short: block[42] % 5,
    key2Long: block[43] % 5,
    curBankA: block[46] % 8,
    curBankB: block[47] % 8,
    btMicGain: block[49] % 5,
    bluetoothAudioGain: block[50] % 5,
    callSign: decodeGbk(block.slice(52, 58)),
    pttid: image.vfos.pttid
  };
}

function encodeFunctionConfig(config, pttid) {
  const bytes = new Uint8Array(64).fill(0x00);
  bytes[0] = config.sql ?? 0;
  bytes[1] = config.saveMode ?? 0;
  bytes[2] = config.vox ?? 0;
  bytes[3] = config.backlight ?? 0;
  bytes[4] = config.dualStandby ?? 0;
  bytes[5] = config.tot ?? 0;
  bytes[6] = config.beep ?? 0;
  bytes[7] = config.voiceSw ?? 0;
  bytes[9] = config.sideTone ?? 0;
  bytes[10] = config.scanMode ?? 0;
  bytes[11] = pttid ?? 0;
  bytes[12] = config.pttDly ?? 0;
  bytes[13] = config.chADisType ?? 0;
  bytes[14] = config.chBDisType ?? 0;
  bytes[16] = config.autoLock ?? 0;
  bytes[17] = config.alarmMode ?? 0;
  bytes[18] = config.localSosTone ?? 0;
  bytes[20] = config.tailClear ?? 0;
  bytes[21] = config.rptTailClear ?? 0;
  bytes[22] = config.rptTailDet ?? 0;
  bytes[23] = config.roger ?? 0;
  bytes[25] = config.fmEnable ?? 0;
  bytes[26] = (config.chAWorkmode ?? 0) | ((config.chBWorkmode ?? 0) << 4);
  bytes[27] = config.keyLock ?? 0;
  bytes[28] = config.powerOnDisType ?? 0;
  bytes[30] = config.tone ?? 0;
  bytes[32] = config.voxDlyTime ?? 0;
  bytes[33] = config.menuQuitTime ?? 0;
  bytes[34] = config.micGain ?? 0;
  bytes[36] = config.pwrOnDlyTime ?? 0;
  bytes[37] = config.voxSw ?? 0;
  bytes[42] = config.key2Short ?? 0;
  bytes[43] = config.key2Long ?? 0;
  bytes[46] = config.curBankA ?? 0;
  bytes[47] = config.curBankB ?? 0;
  bytes[49] = config.btMicGain ?? 0;
  bytes[50] = config.bluetoothAudioGain ?? 0;
  encodeNameInto(bytes, 52, config.callSign ?? '', 6);
  return bytes;
}

function decodeDtmfBlocks(blockMap) {
  const dtmf = createDefaultDtmf();
  const first = blockMap[40960] ?? new Uint8Array(64);
  dtmf.localId = decodeDtmfWord(first, 0);
  dtmf.pttid = first[6] ?? 0;
  dtmf.wordTime = first[7] ?? 1;
  dtmf.idleTime = first[8] ?? 1;

  const positions = [
    [40960, 32],
    [40960, 48],
    [41024, 0],
    [41024, 16],
    [41024, 32],
    [41024, 48],
    [41088, 0],
    [41088, 16],
    [41088, 32],
    [41088, 48],
    [41152, 0],
    [41152, 16],
    [41152, 32],
    [41152, 48],
    [41216, 0]
  ];

  positions.forEach(([address, offset], index) => {
    const block = blockMap[address] ?? new Uint8Array(64);
    dtmf.group[index] = decodeDtmfWord(block, offset);
  });

  return dtmf;
}

function encodeDtmfBlocks(dtmf) {
  const blocks = {
    40960: new Uint8Array(64).fill(0xff),
    41024: new Uint8Array(64).fill(0xff),
    41088: new Uint8Array(64).fill(0xff),
    41152: new Uint8Array(64).fill(0xff),
    41216: new Uint8Array(64).fill(0xff)
  };

  blocks[40960].set(encodeDtmfWord(dtmf.localId), 0);
  blocks[40960][5] = 0xff;
  blocks[40960][6] = dtmf.pttid ?? 0;
  blocks[40960][7] = dtmf.wordTime ?? 1;
  blocks[40960][8] = dtmf.idleTime ?? 1;

  const positions = [
    [40960, 32],
    [40960, 48],
    [41024, 0],
    [41024, 16],
    [41024, 32],
    [41024, 48],
    [41088, 0],
    [41088, 16],
    [41088, 32],
    [41088, 48],
    [41152, 0],
    [41152, 16],
    [41152, 32],
    [41152, 48],
    [41216, 0]
  ];

  positions.forEach(([address, offset], index) => {
    blocks[address].set(encodeDtmfWord(dtmf.group[index]), offset);
  });

  return blocks;
}

function decodeBankNames(blocks) {
  const names = new Array(8).fill('');
  [41472, 41536].forEach((address, groupIndex) => {
    const block = blocks[address] ?? new Uint8Array(64).fill(0xff);
    for (let index = 0; index < 4; index += 1) {
      names[groupIndex * 4 + index] = decodeGbk(
        block.slice(index * 16, index * 16 + BANK_NAME_BYTES)
      );
    }
  });
  return names;
}

function encodeBankBlocks(bankNames) {
  const first = new Uint8Array(64).fill(0xff);
  const second = new Uint8Array(64).fill(0xff);

  for (let index = 0; index < 4; index += 1) {
    encodeNameInto(first, index * 16, bankNames[index], BANK_NAME_BYTES);
    encodeNameInto(second, index * 16, bankNames[index + 4], BANK_NAME_BYTES);
  }

  return { 41472: first, 41536: second };
}

function decodeFm(block) {
  const fm = createDefaultFm();
  if (block[0] !== 0xff && block[1] !== 0xff) {
    fm.curFreq = block[0] + (block[1] << 8);
  }
  for (let index = 0; index < 30; index += 1) {
    const offset = 2 + index * 2;
    const value = block[offset] + (block[offset + 1] << 8);
    fm.channels[index] = value >= 650 && value <= 1080 ? value : 0;
  }
  return fm;
}

function encodeFm(fm) {
  const block = new Uint8Array(64).fill(0x00);
  block[0] = fm.curFreq ?? 0;
  block[1] = (fm.curFreq ?? 0) >> 8;
  for (let index = 0; index < 30; index += 1) {
    const offset = 2 + index * 2;
    const value = fm.channels[index] ?? 0;
    block[offset] = value & 0xff;
    block[offset + 1] = (value >> 8) & 0xff;
  }
  return block;
}

export function normalizeBlocks(rawBlocks = {}) {
  return Object.fromEntries(
    Object.entries(rawBlocks).map(([key, value]) => [normalizeAddressKey(key), cloneBytes(value)])
  );
}

export function decodeRadioImageFromBlocks(rawBlocks) {
  const image = createEmptyRadioImage();
  const blocks = normalizeBlocks(rawBlocks);
  image.rawBlocks = blocks;

  for (let address = 0, channelIndex = 0; address < 16384; address += 64) {
    const block = blocks[address] ?? new Uint8Array(64).fill(0xff);
    const first = block.slice(0, 32);
    const second = block.slice(32, 64);
    const bankIndex = Math.floor(channelIndex / CHANNELS_PER_BANK);
    const inBankIndex = channelIndex % CHANNELS_PER_BANK;
    decodeChannel(first, image.channels[bankIndex][inBankIndex]);
    channelIndex += 1;
    const nextBankIndex = Math.floor(channelIndex / CHANNELS_PER_BANK);
    const nextInBankIndex = channelIndex % CHANNELS_PER_BANK;
    decodeChannel(second, image.channels[nextBankIndex][nextInBankIndex]);
    channelIndex += 1;
  }

  image.vfos = decodeVfos(blocks[32768] ?? new Uint8Array(64).fill(0xff));
  image.functionConfig = decodeFunctionConfig(
    blocks[36864] ?? new Uint8Array(64).fill(0x00),
    image
  );
  image.dtmf = decodeDtmfBlocks(blocks);
  image.bankNames = decodeBankNames(blocks).map((name, index) => name || image.bankNames[index]);
  image.fm = decodeFm(blocks[45056] ?? new Uint8Array(64).fill(0x00));

  return image;
}

export function decodeChannelBlockSummary(address, block) {
  const bytes = cloneBytes(block, 0xff, BLOCK_SIZE);
  if (address < 0 || address >= 16384) {
    return null;
  }

  const firstIndex = Math.floor(address / 64) * 2;
  const secondIndex = firstIndex + 1;
  const firstChannel = createDefaultChannel(firstIndex);
  const secondChannel = createDefaultChannel(secondIndex);

  decodeChannel(bytes.slice(0, 32), firstChannel);
  decodeChannel(bytes.slice(32, 64), secondChannel);

  return {
    address,
    bankIndex: Math.floor(firstIndex / CHANNELS_PER_BANK),
    channels: [firstChannel, secondChannel].map((channel, index) => ({
      slot: index,
      globalIndex: firstIndex + index,
      channelNumber: firstIndex + index + 1,
      bankChannelNumber: ((firstIndex + index) % CHANNELS_PER_BANK) + 1,
      ...channel
    }))
  };
}

export function applyRadioImageToBlocks(image, rawBlocks = {}) {
  const blocks = normalizeBlocks(rawBlocks);

  for (let address = 0, channelIndex = 0; address < 16384; address += 64) {
    const block = new Uint8Array(64).fill(0xff);
    const firstChannel = image.channels[Math.floor(channelIndex / CHANNELS_PER_BANK)][
      channelIndex % CHANNELS_PER_BANK
    ];
    block.set(encodeChannel(firstChannel), 0);
    channelIndex += 1;
    const secondChannel = image.channels[Math.floor(channelIndex / CHANNELS_PER_BANK)][
      channelIndex % CHANNELS_PER_BANK
    ];
    block.set(encodeChannel(secondChannel), 32);
    channelIndex += 1;
    blocks[address] = block;
  }

  blocks[32768] = encodeVfos(image.vfos);
  blocks[36864] = encodeFunctionConfig(image.functionConfig, image.vfos.pttid);
  Object.assign(blocks, encodeDtmfBlocks(image.dtmf));
  Object.assign(blocks, encodeBankBlocks(image.bankNames));
  blocks[45056] = encodeFm(image.fm);

  return blocks;
}

function mapChannelLike(channel, index) {
  return {
    id: channel.id ?? index + 1,
    rxFreq: channel.rxFreq ?? channel.RxFreq ?? '',
    txFreq: channel.txFreq ?? channel.TxFreq ?? '',
    rxTone: channel.rxTone ?? channel.strRxCtsDcs ?? channel.StrRxCtsDcs ?? 'OFF',
    txTone: channel.txTone ?? channel.strTxCtsDcs ?? channel.StrTxCtsDcs ?? 'OFF',
    txPower: channel.txPower ?? channel.TxPower ?? 0,
    bandwidth: channel.bandwidth ?? channel.Bandwide ?? 0,
    scanAdd: channel.scanAdd ?? channel.ScanAdd ?? 0,
    busyLock: channel.busyLock ?? channel.BusyLock ?? 0,
    pttid: channel.pttid ?? channel.Pttid ?? 0,
    signalGroup: channel.signalGroup ?? channel.SignalGroup ?? 0,
    name: channel.name ?? channel.Name ?? '',
    isVisible: channel.isVisible ?? channel.IsVisable ?? Boolean(channel.RxFreq || channel.rxFreq)
  };
}

export function importBackupFromJson(json) {
  const parsed = typeof json === 'string' ? JSON.parse(json) : json;
  const image = createEmptyRadioImage(parsed.model ?? parsed.Model);

  image.bankNames = parsed.bankNames ?? parsed.BankName ?? image.bankNames;
  const sourceChannels = parsed.channels ?? parsed.ChannelList;
  if (Array.isArray(sourceChannels)) {
    image.channels = Array.from({ length: CHANNEL_BANKS }, (_, bankIndex) =>
      Array.from({ length: CHANNELS_PER_BANK }, (_, channelIndex) =>
        mapChannelLike(sourceChannels[bankIndex]?.[channelIndex] ?? {}, channelIndex)
      )
    );
  }

  const sourceVfos = parsed.vfos ?? parsed.Vfos;
  if (sourceVfos) {
    image.vfos = {
      ...image.vfos,
      pttid: sourceVfos.pttid ?? sourceVfos.Pttid ?? image.vfos.pttid,
      vfoAFreq: sourceVfos.vfoAFreq ?? sourceVfos.VfoAFreq ?? image.vfos.vfoAFreq,
      vfoAOffset: sourceVfos.vfoAOffset ?? sourceVfos.VfoAOffset ?? image.vfos.vfoAOffset,
      vfoARxTone: sourceVfos.vfoARxTone ?? sourceVfos.StrVfoaRxCtsDcs ?? image.vfos.vfoARxTone,
      vfoATxTone: sourceVfos.vfoATxTone ?? sourceVfos.StrVfoaTxCtsDcs ?? image.vfos.vfoATxTone,
      vfoABusyLock: sourceVfos.vfoABusyLock ?? sourceVfos.VfoABusyLock ?? image.vfos.vfoABusyLock,
      vfoADir: sourceVfos.vfoADir ?? sourceVfos.VfoADir ?? image.vfos.vfoADir,
      vfoASignalGroup:
        sourceVfos.vfoASignalGroup ?? sourceVfos.VfoASignalGroup ?? image.vfos.vfoASignalGroup,
      vfoATxPower: sourceVfos.vfoATxPower ?? sourceVfos.VfoATxPower ?? image.vfos.vfoATxPower,
      vfoABandwidth:
        sourceVfos.vfoABandwidth ?? sourceVfos.VfoABandwide ?? image.vfos.vfoABandwidth,
      vfoAStep: sourceVfos.vfoAStep ?? sourceVfos.VfoAStep ?? image.vfos.vfoAStep,
      vfoBFreq: sourceVfos.vfoBFreq ?? sourceVfos.VfoBFreq ?? image.vfos.vfoBFreq,
      vfoBOffset: sourceVfos.vfoBOffset ?? sourceVfos.VfoBOffset ?? image.vfos.vfoBOffset,
      vfoBRxTone: sourceVfos.vfoBRxTone ?? sourceVfos.StrVfobRxCtsDcs ?? image.vfos.vfoBRxTone,
      vfoBTxTone: sourceVfos.vfoBTxTone ?? sourceVfos.StrVfobTxCtsDcs ?? image.vfos.vfoBTxTone,
      vfoBBusyLock: sourceVfos.vfoBBusyLock ?? sourceVfos.VfoBBusyLock ?? image.vfos.vfoBBusyLock,
      vfoBDir: sourceVfos.vfoBDir ?? sourceVfos.VfoBDir ?? image.vfos.vfoBDir,
      vfoBSignalGroup:
        sourceVfos.vfoBSignalGroup ?? sourceVfos.VfoBSignalGroup ?? image.vfos.vfoBSignalGroup,
      vfoBTxPower: sourceVfos.vfoBTxPower ?? sourceVfos.VfoBTxPower ?? image.vfos.vfoBTxPower,
      vfoBBandwidth:
        sourceVfos.vfoBBandwidth ?? sourceVfos.VfoBBandwide ?? image.vfos.vfoBBandwidth,
      vfoBStep: sourceVfos.vfoBStep ?? sourceVfos.VfoBStep ?? image.vfos.vfoBStep
    };
  }

  image.functionConfig = {
    ...image.functionConfig,
    ...(parsed.functionConfig ?? parsed.FunCfgs ?? {})
  };
  image.dtmf = {
    ...image.dtmf,
    ...(parsed.dtmf ?? parsed.Dtmfs ?? {})
  };
  image.fm = {
    ...image.fm,
    ...(parsed.fm ?? parsed.Fms ?? {})
  };
  image.rawBlocks = normalizeBlocks(parsed.rawBlocks ?? parsed.RawBlocks ?? {});
  return image;
}

export function exportBackupToJson(image) {
  const model = normalizeRadioModel(image.model);
  return JSON.stringify(
    {
      model,
      version: image.version ?? 1,
      Model: model,
      Version: image.version ?? 1,
      BankName: image.bankNames,
      ChannelList: image.channels.map((bank) =>
        bank.map((channel) => ({
          Id: channel.id,
          RxFreq: channel.rxFreq,
          StrRxCtsDcs: channel.rxTone,
          TxFreq: channel.txFreq,
          StrTxCtsDcs: channel.txTone,
          TxPower: channel.txPower,
          Bandwide: channel.bandwidth,
          ScanAdd: channel.scanAdd,
          BusyLock: channel.busyLock,
          Pttid: channel.pttid,
          SignalGroup: channel.signalGroup,
          Name: channel.name,
          IsVisable: channel.isVisible
        }))
      ),
      Vfos: {
        Pttid: image.vfos.pttid,
        VfoAFreq: image.vfos.vfoAFreq,
        VfoAOffset: image.vfos.vfoAOffset,
        StrVfoaRxCtsDcs: image.vfos.vfoARxTone,
        StrVfoaTxCtsDcs: image.vfos.vfoATxTone,
        VfoABusyLock: image.vfos.vfoABusyLock,
        VfoADir: image.vfos.vfoADir,
        VfoASignalGroup: image.vfos.vfoASignalGroup,
        VfoATxPower: image.vfos.vfoATxPower,
        VfoABandwide: image.vfos.vfoABandwidth,
        VfoAStep: image.vfos.vfoAStep,
        VfoBFreq: image.vfos.vfoBFreq,
        VfoBOffset: image.vfos.vfoBOffset,
        StrVfobRxCtsDcs: image.vfos.vfoBRxTone,
        StrVfobTxCtsDcs: image.vfos.vfoBTxTone,
        VfoBBusyLock: image.vfos.vfoBBusyLock,
        VfoBDir: image.vfos.vfoBDir,
        VfoBSignalGroup: image.vfos.vfoBSignalGroup,
        VfoBTxPower: image.vfos.vfoBTxPower,
        VfoBBandwide: image.vfos.vfoBBandwidth,
        VfoBStep: image.vfos.vfoBStep
      },
      FunCfgs: image.functionConfig,
      Dtmfs: image.dtmf,
      Fms: image.fm,
      RawBlocks: Object.fromEntries(
        Object.entries(image.rawBlocks ?? {}).map(([address, block]) => [address, Array.from(block)])
      )
    },
    null,
    2
  );
}

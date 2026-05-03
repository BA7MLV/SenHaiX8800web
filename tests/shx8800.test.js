import test from 'node:test';
import assert from 'node:assert/strict';

import {
  HANDSHAKE_HEX,
  buildReadFrame,
  buildWriteFrame,
  channelBytesToFrequency,
  createEmptyRadioImage,
  decodeChannelBlockSummary,
  decodeRadioImageFromBlocks,
  exportBackupToJson,
  frequencyToChannelBytes,
  hexToBytes,
  importBackupFromJson
} from '../src/protocol/shx8800.js';
import {
  BootImageProbeSession,
  buildBootProbeFrame
} from '../src/protocol/BootImageProbeSession.js';
import {
  BootImageSession
} from '../src/protocol/BootImageSession.js';
import {
  BOOT_IMAGE_DATA_SIZE,
  packRgb565,
  unpackRgb565,
  rgb565DataToImageData,
  encodeImageToRgb565,
  computeCrc16,
  buildProPacket,
  parseProPacket,
  validateProPacketCrc,
  createEmptyBootImage
} from '../src/protocol/bootImage.js';
import { Shx8800Session } from '../src/protocol/Shx8800Session.js';

test('buildReadFrame creates the expected 4-byte read command', () => {
  assert.deepEqual(Array.from(buildReadFrame(0x0040)), [0x52, 0x00, 0x40, 0x40]);
});

test('buildWriteFrame creates the expected 68-byte write command', () => {
  const payload = new Uint8Array(64).fill(0xaa);
  const frame = buildWriteFrame(0x9000, payload);

  assert.equal(frame.length, 68);
  assert.deepEqual(Array.from(frame.slice(0, 4)), [0x57, 0x90, 0x00, 0x40]);
  assert.deepEqual(Array.from(frame.slice(4, 8)), [0xaa, 0xaa, 0xaa, 0xaa]);
});

test('frequency channel bytes round-trip matches the desktop format', () => {
  const bytes = frequencyToChannelBytes('440.62500');
  assert.deepEqual(Array.from(bytes), [0x00, 0x25, 0x06, 0x44]);
  assert.equal(channelBytesToFrequency(bytes), '440.62500');
});

test('backup export/import preserves edited radio image fields', () => {
  const image = createEmptyRadioImage();
  image.bankNames[0] = '测试一区';
  image.channels[0][0].rxFreq = '439.50000';
  image.channels[0][0].txFreq = '430.50000';
  image.channels[0][0].name = '中继1';
  image.channels[0][0].isVisible = true;
  image.vfos.vfoAFreq = '145.62500';

  const json = exportBackupToJson(image);
  const imported = importBackupFromJson(json);

  assert.equal(imported.bankNames[0], '测试一区');
  assert.equal(imported.channels[0][0].rxFreq, '439.50000');
  assert.equal(imported.channels[0][0].name, '中继1');
  assert.equal(imported.vfos.vfoAFreq, '145.62500');
});

test('decodeRadioImageFromBlocks parses channel and bank name payloads', () => {
  const blocks = {
    0: new Uint8Array(64),
    41472: new Uint8Array(64).fill(0xff)
  };

  blocks[0].set(frequencyToChannelBytes('438.50000'), 0);
  blocks[0].set(frequencyToChannelBytes('430.50000'), 4);
  blocks[0][12] = 3;
  blocks[0][13] = 1;
  blocks[0][14] = 2;
  blocks[0][15] = 0b01000100;
  blocks[0].set([0x54, 0x45, 0x53, 0x54], 20);
  blocks[41472].set([0x42, 0x41, 0x4e, 0x4b, 0x31], 0);

  const image = decodeRadioImageFromBlocks(blocks);

  assert.equal(image.channels[0][0].rxFreq, '438.50000');
  assert.equal(image.channels[0][0].txFreq, '430.50000');
  assert.equal(image.channels[0][0].name, 'TEST');
  assert.equal(image.bankNames[0], 'BANK1');
});

test('decodeChannelBlockSummary decodes two channels from a 64-byte block', () => {
  const block = new Uint8Array(64).fill(0xff);

  block.set(frequencyToChannelBytes('145.96250'), 0);
  block.set(frequencyToChannelBytes('435.24500'), 4);
  block[10] = 0x9e;
  block[11] = 0x02;
  block.set([0x41, 0x4f, 0x2d, 0x39, 0x31, 0x2d, 0x41, 0x32], 20);

  block.set(frequencyToChannelBytes('145.96000'), 32);
  block.set(frequencyToChannelBytes('435.25000'), 36);
  block[42] = 0x9e;
  block[43] = 0x02;
  block.set([0x41, 0x4f, 0x2d, 0x39, 0x31], 52);

  const summary = decodeChannelBlockSummary(0x03c0, block);

  assert.equal(summary.bankIndex, 0);
  assert.equal(summary.channels[0].channelNumber, 31);
  assert.equal(summary.channels[0].rxFreq, '145.96250');
  assert.equal(summary.channels[0].txFreq, '435.24500');
  assert.equal(summary.channels[0].name, 'AO-91-A2');
  assert.equal(summary.channels[0].txTone, '67.0');
  assert.equal(summary.channels[1].channelNumber, 32);
  assert.equal(summary.channels[1].rxFreq, '145.96000');
  assert.equal(summary.channels[1].txFreq, '435.25000');
  assert.equal(summary.channels[1].name, 'AO-91');
  assert.equal(summary.channels[1].txTone, '67.0');
});

test('handshake sends PROGRAMSHXPU and 0x46 after receiving ACK', async () => {
  class FakeTransport {
    constructor() {
      this.sent = [];
      this.logs = [];
      this.notifications = [
        Uint8Array.of(0x06),
        new Uint8Array(16).fill(0x31)
      ];
    }

    on(eventName, listener) {
      if (eventName === 'log') this.logListener = listener;
      return () => {};
    }

    emitLog(entry) {
      this.logs.push(entry);
      this.logListener?.(entry);
    }

    async send(data) {
      this.sent.push(Array.from(data));
    }

    async waitForNotification() {
      return this.notifications.shift();
    }
  }

  const transport = new FakeTransport();
  const session = new Shx8800Session(transport);
  const result = await session.handshake();

  assert.equal(result.ackHex, '06');
  assert.equal(result.replyHex, '31 31 31 31 31 31 31 31 31 31 31 31 31 31 31 31');
  assert.deepEqual(transport.sent[0], Array.from(hexToBytes(HANDSHAKE_HEX)));
  assert.deepEqual(transport.sent[1], [0x46]);
});

test('buildBootProbeFrame creates a 68-byte candidate frame', () => {
  const frame = buildBootProbeFrame({ cmd: 0x48, offset: 0x0040, fillByte: 0xaa });

  assert.equal(frame.length, 68);
  assert.deepEqual(Array.from(frame.slice(0, 4)), [0x48, 0x00, 0x40, 0x40]);
  assert.deepEqual(Array.from(frame.slice(4, 8)), [0xaa, 0xaa, 0xaa, 0xaa]);
});

test('BootImageProbeSession performs boot handshake and merges extra packets', async () => {
  class FakeTransport {
    constructor() {
      this.sent = [];
      this.logs = [];
      this.notificationRounds = [
        [Uint8Array.of(0x06), new Uint8Array(8).fill(0x31)],
        [Uint8Array.of(0x06), Uint8Array.of(0xde, 0xad), Uint8Array.of(0xbe, 0xef)]
      ];
      this.queue = [];
    }

    emitLog(entry) {
      this.logs.push(entry);
    }

    clearNotificationQueue() {
      this.queue = [];
      const nextRound = this.notificationRounds.shift();
      if (nextRound) {
        this.queue.push(...nextRound);
      }
    }

    async send(data) {
      this.sent.push(Array.from(data));
    }

    async waitForNotification() {
      const packet = this.queue.shift();
      if (!packet) {
        throw new Error('Timed out waiting for notification');
      }
      return packet;
    }
  }

  const transport = new FakeTransport();
  const session = new BootImageProbeSession(transport, {
    timeoutMs: 20,
    idleCollectMs: 5
  });

  const result = await session.sendProbe({
    cmd: 0x48,
    offset: 0x0000,
    totalTimeoutMs: 20,
    idleCollectMs: 5,
    handshake: true
  });

  assert.equal(result.ackHex, '06');
  assert.equal(result.ackOnly, false);
  assert.equal(result.extraHex, 'DE AD BE EF');
  assert.deepEqual(transport.sent[0], Array.from(new TextEncoder().encode('PROGROMSHXU')));
  assert.deepEqual(transport.sent[1], [0x46]);
  assert.deepEqual(transport.sent[2], Array.from(buildBootProbeFrame({ cmd: 0x48, offset: 0x0000 })));
});

test('BootImageProbeSession falls back to normal BLE handshake when boot handshake times out', async () => {
  class FakeTransport {
    constructor() {
      this.sent = [];
      this.logs = [];
      this.notificationRounds = [
        [],
        [Uint8Array.of(0x06), new Uint8Array(16).fill(0x32)]
      ];
      this.queue = [];
    }

    emitLog(entry) {
      this.logs.push(entry);
    }

    clearNotificationQueue() {
      this.queue = [];
      const nextRound = this.notificationRounds.shift();
      if (nextRound) {
        this.queue.push(...nextRound);
      }
    }

    async send(data) {
      this.sent.push(Array.from(data));
    }

    async waitForNotification() {
      const packet = this.queue.shift();
      if (!packet) {
        throw new Error('Timed out waiting for notification');
      }
      return packet;
    }
  }

  const transport = new FakeTransport();
  const session = new BootImageProbeSession(transport, {
    timeoutMs: 20,
    idleCollectMs: 5
  });

  const result = await session.bootHandshake(true);

  assert.equal(result.mode, 'normal-ble');
  assert.equal(result.ackHex, '06');
  assert.equal(result.readyHex, '32 32 32 32 32 32 32 32 32 32 32 32 32 32 32 32');
  assert.deepEqual(transport.sent[0], Array.from(new TextEncoder().encode('PROGROMSHXU')));
  assert.deepEqual(transport.sent[1], Array.from(new TextEncoder().encode('PROGRAMSHXPU')));
  assert.deepEqual(transport.sent[2], [0x46]);
});

test('radio image import/export preserves non-SHX8800 model metadata', () => {
  const image = createEmptyRadioImage('8800Pro');
  image.bankNames[0] = 'Pro一区';
  image.channels[0][0].rxFreq = '439.50000';
  image.channels[0][0].name = 'PRO-1';
  image.channels[0][0].isVisible = true;

  const json = exportBackupToJson(image);
  const imported = importBackupFromJson(json);

  assert.equal(imported.model, '8800Pro');
  assert.equal(imported.bankNames[0], 'Pro一区');
  assert.equal(imported.channels[0][0].name, 'PRO-1');
});

test('moveSelectedChannels reorders rows and keeps ids aligned to slots', async () => {
  const { moveSelectedChannels } = await import('../src/features/channelEditing.js');
  const image = createEmptyRadioImage();
  image.channels[0][0].name = 'A';
  image.channels[0][0].rxFreq = '430.00000';
  image.channels[0][1].name = 'B';
  image.channels[0][1].rxFreq = '431.00000';
  image.channels[0][2].name = 'C';
  image.channels[0][2].rxFreq = '432.00000';

  const nextBank = moveSelectedChannels(image.channels[0], [1], 'up');

  assert.deepEqual(nextBank.slice(0, 3).map((channel) => channel.name), ['B', 'A', 'C']);
  assert.deepEqual(nextBank.slice(0, 3).map((channel) => channel.id), [1, 2, 3]);
});

test('copyCutPasteChannels supports copy, cut, and overwrite paste', async () => {
  const { copyChannels, pasteChannels } = await import('../src/features/channelEditing.js');
  const image = createEmptyRadioImage();
  image.channels[0][0] = { ...image.channels[0][0], name: 'A', rxFreq: '430.00000', isVisible: true };
  image.channels[0][1] = { ...image.channels[0][1], name: 'B', rxFreq: '431.00000', isVisible: true };
  image.channels[0][3] = { ...image.channels[0][3], name: 'D', rxFreq: '433.00000', isVisible: true };

  const copied = copyChannels(image.channels[0], [0, 1], 'copy');
  assert.deepEqual(copied.clipboard.channels.map((channel) => channel.name), ['A', 'B']);
  assert.equal(copied.nextBank[0].name, 'A');

  const cut = copyChannels(image.channels[0], [1], 'cut');
  assert.equal(cut.nextBank[1].name, '');
  assert.equal(cut.nextBank[1].rxFreq, '');

  const pasted = pasteChannels(cut.nextBank, 2, copied.clipboard);
  assert.deepEqual(pasted.slice(2, 4).map((channel) => channel.name), ['A', 'B']);
  assert.deepEqual(pasted.slice(0, 4).map((channel) => channel.id), [1, 2, 3, 4]);
});

test('duplicateChannelsToRange repeats the selection across a target range', async () => {
  const { duplicateChannelsToRange } = await import('../src/features/channelEditing.js');
  const image = createEmptyRadioImage();
  image.channels[0][0] = { ...image.channels[0][0], name: 'A', rxFreq: '430.00000', isVisible: true };
  image.channels[0][1] = { ...image.channels[0][1], name: 'B', rxFreq: '431.00000', isVisible: true };

  const nextBank = duplicateChannelsToRange(image.channels[0], [0, 1], 2, 5);

  assert.deepEqual(nextBank.slice(2, 6).map((channel) => channel.name), ['A', 'B', 'A', 'B']);
});

test('channel CSV export/import round-trips names and frequencies', async () => {
  const { exportChannelsToCsv, importChannelsFromCsv } = await import('../src/features/channelEditing.js');
  const image = createEmptyRadioImage();
  image.channels[0][0] = {
    ...image.channels[0][0],
    name: 'Alpha',
    rxFreq: '430.12500',
    txFreq: '431.12500',
    rxTone: '67.0',
    txTone: 'OFF',
    txPower: 1,
    bandwidth: 0,
    scanAdd: 1,
    busyLock: 1,
    pttid: 2,
    signalGroup: 3,
    isVisible: true
  };

  const csv = exportChannelsToCsv(image.channels[0], [0]);
  const imported = importChannelsFromCsv(csv, { bankSize: image.channels[0].length });

  assert.equal(imported.channels[0].name, 'Alpha');
  assert.equal(imported.channels[0].rxFreq, '430.12500');
  assert.equal(imported.channels[0].busyLock, 1);
  assert.equal(imported.channels[0].scanAdd, 1);
});

test('packRgb565 encodes and unpackRgb565 decodes correctly', () => {
  const packed = packRgb565(255, 128, 64);
  const { r, g, b } = unpackRgb565(packed);

  assert.ok(Math.abs(r - 248) <= 8, `r=${r}, expected ~248`);
  assert.ok(Math.abs(g - 128) <= 4, `g=${g}, expected ~128`);
  assert.ok(Math.abs(b - 64) <= 8, `b=${b}, expected ~64`);
});

test('packRgb565 for pure white', () => {
  const packed = packRgb565(255, 255, 255);
  assert.equal(packed, 0xffff);
});

test('packRgb565 for pure black', () => {
  const packed = packRgb565(0, 0, 0);
  assert.equal(packed, 0x0000);
});

test('encodeImageToRgb565 produces correct size and valid data', () => {
  const imageData = new Uint8Array(256 * 256 * 4);
  for (let i = 0; i < imageData.length; i += 4) {
    imageData[i] = 255;
    imageData[i + 1] = 0;
    imageData[i + 2] = 0;
    imageData[i + 3] = 255;
  }

  const result = encodeImageToRgb565({ data: imageData, width: 256, height: 256 });

  assert.equal(result.length, BOOT_IMAGE_DATA_SIZE);
  assert.equal(result.length, 128 * 128 * 2);
  assert.equal(result[0], 0x00);
  assert.equal(result[1], 0xf8);
});

test('rgb565DataToImageData round-trip via encodeImageToRgb565', () => {
  if (typeof ImageData === 'undefined') {
    return;
  }

  const srcData = new Uint8Array(128 * 128 * 4);
  for (let i = 0; i < srcData.length; i += 4) {
    srcData[i] = 128;
    srcData[i + 1] = 64;
    srcData[i + 2] = 32;
    srcData[i + 3] = 255;
  }

  const encoded = encodeImageToRgb565({ data: srcData, width: 128, height: 128 });
  const imageData = rgb565DataToImageData(encoded);

  assert.equal(imageData.width, 128);
  assert.equal(imageData.height, 128);
  assert.equal(imageData.data[3], 255);
});

test('createEmptyBootImage creates white-filled RGB565', () => {
  const img = createEmptyBootImage();
  assert.equal(img.length, BOOT_IMAGE_DATA_SIZE);
  assert.equal(img[0], 0xff);
  assert.equal(img[1], 0xff);
});

test('computeCrc16 matches known CRC-CCITT values', () => {
  const data = Uint8Array.from([0x31, 0x32, 0x33, 0x34, 0x35, 0x36, 0x37, 0x38, 0x39]);
  const crc = computeCrc16(data);
  assert.ok(crc >= 0 && crc <= 0xffff, `CRC-16 result ${crc} is valid`);

  const data2 = new Uint8Array(5);
  const crc2 = computeCrc16(data2);
  assert.ok(crc2 >= 0 && crc2 <= 0xffff, `CRC-16 of zeroes ${crc2} is valid`);
});

test('buildProPacket creates a valid 0xA5 framed packet with CRC-16', () => {
  const data = Uint8Array.from([0x50, 0x52, 0x4f, 0x47, 0x52, 0x41, 0x4d]);
  const packet = buildProPacket(0x02, 0, data, data.length);

  assert.equal(packet.length, 8 + 7);
  assert.equal(packet[0], 0xa5);
  assert.equal(packet[1], 0x02);
  assert.equal(packet[2], 0x00);
  assert.equal(packet[3], 0x00);
  assert.equal(packet[4], 0x00);
  assert.equal(packet[5], 0x07);

  const valid = validateProPacketCrc(packet);
  assert.ok(valid, 'CRC-16 validation should pass');
});

test('parseProPacket parses a valid packet', () => {
  const data = Uint8Array.from([0x59, 0x02]);
  const packet = buildProPacket(0x57, 1, data, data.length);

  const parsed = parseProPacket(packet);

  assert.ok(parsed, 'Should parse successfully');
  assert.equal(parsed.cmd, 0x57);
  assert.equal(parsed.packageId, 1);
  assert.equal(parsed.dataLen, 2);
  assert.deepEqual(Array.from(parsed.data), [0x59, 0x02]);
  assert.ok(parsed.validCrc, 'CRC should be valid');
});

test('parseProPacket returns null for non-0xA5 header', () => {
  const result = parseProPacket(Uint8Array.from([0x06]));
  assert.equal(result, null);
});

test('parseProPacket returns null for too-short data', () => {
  const result = parseProPacket(Uint8Array.from([0xa5, 0x02, 0x00]));
  assert.equal(result, null);
});

test('BootImageSession builds 8x00 first packet correctly', () => {
  const data = createEmptyBootImage();
  data.fill(0xaa);

  class FakeTransport {
    sent = [];
    logs = [];
    emitLog(e) { this.logs.push(e); }
    clearNotificationQueue() {}
    async send(d) { this.sent.push(Array.from(d)); }
    async waitForNotification() { return Uint8Array.of(0x06); }
    setLoggingMode() {}
  }

  const transport = new FakeTransport();
  const session = new BootImageSession(transport, { deviceModel: 'SHX8800' });
  const firstPacket = session.buildFirstPacket(data);

  assert.equal(firstPacket.length, 68);
  assert.deepEqual(Array.from(firstPacket.slice(0, 4)), [0x17, 0x09, 0x22, 0x30]);
  assert.deepEqual(Array.from(firstPacket.slice(16, 20)), [0xaa, 0xaa, 0xaa, 0xaa]);
});

test('BootImageSession builds 8x00 regular packet correctly', () => {
  const data = createEmptyBootImage();
  data.fill(0xbb);

  class FakeTransport {
    sent = [];
    logs = [];
    emitLog(e) { this.logs.push(e); }
    clearNotificationQueue() {}
    async send(d) { this.sent.push(Array.from(d)); }
    async waitForNotification() { return Uint8Array.of(0x06); }
    setLoggingMode() {}
  }

  const transport = new FakeTransport();
  const session = new BootImageSession(transport, { deviceModel: 'SHX8800' });
  const packet = session.buildRegularPacket(0x0040, data);

  assert.equal(packet.length, 68);
  assert.deepEqual(Array.from(packet.slice(0, 4)), [0x49, 0x00, 0x40, 0x40]);
  assert.deepEqual(Array.from(packet.slice(4, 8)), [0xbb, 0xbb, 0xbb, 0xbb]);
});

test('BootImageSession detects Pro models', () => {
  class FakeTransport {
    sent = [];
    logs = [];
    emitLog(e) { this.logs.push(e); }
    clearNotificationQueue() {}
    async send(d) { this.sent.push(Array.from(d)); }
    async waitForNotification() { return Uint8Array.of(0x06); }
    setLoggingMode() {}
  }

  const transport = new FakeTransport();
  assert.equal(new BootImageSession(transport, { deviceModel: 'SHX8800' }).isPro(), false);
  assert.equal(new BootImageSession(transport, { deviceModel: '8800Pro' }).isPro(), true);
  assert.equal(new BootImageSession(transport, { deviceModel: '8600Pro' }).isPro(), true);
});

test('BootImageSession write rejects wrong-size data', async () => {
  class FakeTransport {
    sent = [];
    logs = [];
    emitLog(e) { this.logs.push(e); }
    clearNotificationQueue() {}
    async send(d) { this.sent.push(Array.from(d)); }
    async waitForNotification() { return Uint8Array.of(0x06); }
    setLoggingMode() {}
  }

  const transport = new FakeTransport();
  const session = new BootImageSession(transport, { deviceModel: 'SHX8800' });

  try {
    await session.writeBootImage(new Uint8Array(100));
    assert.fail('Should have thrown');
  } catch (error) {
    assert.ok(error.message.includes('Invalid boot image data size'));
  }
});

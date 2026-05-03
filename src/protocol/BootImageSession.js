import { bytesToHex } from './shx8800.js';
import {
  BOOT_IMAGE_DATA_SIZE,
  buildProPacket,
  parseProPacket
} from './bootImage.js';

const BOOT_HANDSHAKE_TEXT = 'PROGROMSHXU';
const BOOT_ACK_BYTE = 0x06;
const BOOT_8X00_READY_SEND = 0x46;
const BOOT_PRO_READY_SEND = 0x44;

const PACKET_SIZE = 68;
const FIRST_PACKET_DATA_SIZE = 48;
const REGULAR_PACKET_DATA_SIZE = 64;
const PRO_CHUNK_SIZE = 1024;
const PRO_FLASH_ADDRESS = 0x10000;
const PRO_TIMEOUT_MS = 1200;

const PRO_CMD = {
  HANDSHAKE: 0x02,
  SET_ADDRESS: 0x03,
  ERASE: 0x04,
  WRITE: 0x57,
  OVER: 0x06
};

function asciiBytes(text) {
  return new TextEncoder().encode(text);
}

export class BootImageSession {
  constructor(transport, options = {}) {
    this.transport = transport;
    this.timeoutMs = options.timeoutMs ?? 1200;
    this.probeTimeoutMs = options.probeTimeoutMs ?? 600;
    this.idleCollectMs = options.idleCollectMs ?? 160;
    this.deviceModel = options.deviceModel ?? 'SHX8800';
    this.retries = options.retries ?? 3;
    this._cancelToken = null;
    this.lastHandshake = null;
  }

  emitStatus(message, extra = {}) {
    this.transport.emitLog?.({
      type: 'STATUS',
      message,
      time: new Date().toLocaleTimeString(),
      ...extra
    });
  }

  cancel() {
    if (this._cancelToken) {
      this._cancelToken.cancelled = true;
    }
  }

  _checkCancel() {
    if (this._cancelToken?.cancelled) {
      throw new Error('Boot image operation cancelled');
    }
  }

  async _waitForAck(timeoutMs = this.timeoutMs) {
    const packet = await this.transport.waitForNotification({
      timeoutMs,
      matcher: (p) => p.length >= 1
    });
    if (packet[0] !== BOOT_ACK_BYTE) {
      throw new Error(`Expected ACK 0x06, got ${bytesToHex(packet)}`);
    }
    return packet;
  }

  async _waitForPacket(minLength, timeoutMs = this.timeoutMs) {
    return this.transport.waitForNotification({
      timeoutMs,
      matcher: (p) => p.length >= minLength
    });
  }

  async _sendAndWaitAck(data, timeoutMs = this.timeoutMs) {
    this.transport.clearNotificationQueue();
    await this.transport.send(data, { chunkDelayMs: 0, chunkSize: data.length, log: true });
    return this._waitForAck(timeoutMs);
  }

  async _sendAndWaitPacket(data, minLength, timeoutMs = this.timeoutMs) {
    this.transport.clearNotificationQueue();
    await this.transport.send(data, { chunkDelayMs: 0, chunkSize: data.length, log: true });
    return this._waitForPacket(minLength, timeoutMs);
  }

  isPro() {
    return this.deviceModel.endsWith('Pro') || this.deviceModel.startsWith('8800Pro');
  }

  async handshake(force = false) {
    if (this.lastHandshake && !force) {
      return this.lastHandshake;
    }

    this.transport.clearNotificationQueue();
    this.emitStatus('BOOTIMG_HANDSHAKE_SEND');

    const isPro = this.isPro();
    await this.transport.send(asciiBytes(BOOT_HANDSHAKE_TEXT), {
      chunkDelayMs: 0,
      chunkSize: BOOT_HANDSHAKE_TEXT.length,
      log: true
    });

    const ack = await this._waitForAck();
    this.emitStatus('BOOTIMG_HANDSHAKE_ACK', { hex: bytesToHex(ack) });

    const readySend = isPro ? BOOT_PRO_READY_SEND : BOOT_8X00_READY_SEND;
    const minReadyLen = isPro ? 8 : 8;

    await this.transport.send(Uint8Array.of(readySend), {
      chunkDelayMs: 0,
      chunkSize: 1,
      log: true
    });

    const ready = await this._waitForPacket(minReadyLen);

    const result = {
      mode: isPro ? 'pro' : '8x00',
      programText: BOOT_HANDSHAKE_TEXT,
      ackHex: bytesToHex(ack),
      readyHex: bytesToHex(ready)
    };

    this.lastHandshake = result;
    this.emitStatus('BOOTIMG_HANDSHAKE_READY', { hex: result.readyHex });
    return result;
  }

  buildFirstPacket(imageData) {
    const buffer = new Uint8Array(PACKET_SIZE).fill(0xff);
    buffer[0] = 0x17;
    buffer[1] = 0x09;
    buffer[2] = 0x22;
    buffer[3] = 0x30;
    const copyLen = Math.min(FIRST_PACKET_DATA_SIZE, imageData.length);
    buffer.set(imageData.slice(0, copyLen), 16);
    return buffer;
  }

  buildRegularPacket(imageOffset, imageData) {
    const buffer = new Uint8Array(PACKET_SIZE).fill(0xff);
    buffer[0] = 0x49;
    buffer[1] = (imageOffset >> 8) & 0xff;
    buffer[2] = imageOffset & 0xff;
    buffer[3] = 0x40;
    const remaining = imageData.length - imageOffset;
    const copyLen = Math.min(REGULAR_PACKET_DATA_SIZE, remaining);
    buffer.set(imageData.slice(imageOffset, imageOffset + copyLen), 4);
    return buffer;
  }

  async writeBootImage8x00(imageData, onProgress) {
    await this.handshake(true);
    this._cancelToken = { cancelled: false };
    this.transport.setLoggingMode({ sendLogs: false, notificationLogs: false });

    try {
      this.emitStatus('BOOTIMG_WRITE_FIRST_PACKET');
      const firstPacket = this.buildFirstPacket(imageData);
      await this._sendAndWaitAck(firstPacket);
      onProgress?.({ phase: 'bootimg', current: 0, total: imageData.length, bytesWritten: FIRST_PACKET_DATA_SIZE });

      let imageOffset = FIRST_PACKET_DATA_SIZE;
      let blockCounter = FIRST_PACKET_DATA_SIZE + 16;
      let packetIndex = 1;

      while (imageOffset < imageData.length) {
        this._checkCancel();

        const packet = this.buildRegularPacket(blockCounter, imageData);
        await this._sendAndWaitAck(packet);

        imageOffset += REGULAR_PACKET_DATA_SIZE;
        blockCounter += REGULAR_PACKET_DATA_SIZE;

        onProgress?.({
          phase: 'bootimg',
          current: packetIndex,
          total: Math.ceil((imageData.length - FIRST_PACKET_DATA_SIZE) / REGULAR_PACKET_DATA_SIZE),
          bytesWritten: Math.min(imageOffset, imageData.length)
        });

        packetIndex += 1;
      }

      this.emitStatus('BOOTIMG_WRITE_COMPLETE', { bytesWritten: imageData.length });
      return imageData.length;
    } finally {
      this.transport.setLoggingMode({ sendLogs: true, notificationLogs: true });
      this._cancelToken = null;
    }
  }

  async writeBootImagePro(imageData, onProgress) {
    await this.handshake(true);
    this._cancelToken = { cancelled: false };
    this.transport.setLoggingMode({ sendLogs: false, notificationLogs: false });

    try {
      let packageId = 0;

      this.emitStatus('BOOTIMG_PRO_HANDSHAKE');
      const hsPacket = buildProPacket(PRO_CMD.HANDSHAKE, packageId, asciiBytes('PROGRAM'), 7);
      const hsResp = await this._sendAndWaitProResponse(hsPacket, packageId);
      if (!hsResp || hsResp.data[0] !== 0x59) {
        throw new Error(`Pro handshake failed: ${hsResp ? bytesToHex(hsResp.data) : 'no response'}`);
      }
      this.emitStatus('BOOTIMG_PRO_HANDSHAKE_OK', { status: bytesToHex(hsResp.data) });
      packageId += 1;

      this.emitStatus('BOOTIMG_PRO_SET_ADDRESS');
      const addrBytes = new Uint8Array(4);
      addrBytes[0] = (PRO_FLASH_ADDRESS >> 24) & 0xff;
      addrBytes[1] = (PRO_FLASH_ADDRESS >> 16) & 0xff;
      addrBytes[2] = (PRO_FLASH_ADDRESS >> 8) & 0xff;
      addrBytes[3] = PRO_FLASH_ADDRESS & 0xff;
      const addrPacket = buildProPacket(PRO_CMD.SET_ADDRESS, packageId, addrBytes);
      const addrResp = await this._sendAndWaitProResponse(addrPacket, packageId);
      if (!addrResp || addrResp.data[0] !== 0x59) {
        throw new Error(`Pro set address failed: ${addrResp ? bytesToHex(addrResp.data) : 'no response'}`);
      }
      this.emitStatus('BOOTIMG_PRO_SET_ADDRESS_OK', { status: bytesToHex(addrResp.data) });
      packageId += 1;

      this.emitStatus('BOOTIMG_PRO_ERASE');
      const erasePayload = new Uint8Array(6);
      erasePayload[0] = (PRO_FLASH_ADDRESS >> 24) & 0xff;
      erasePayload[1] = (PRO_FLASH_ADDRESS >> 16) & 0xff;
      erasePayload[2] = (PRO_FLASH_ADDRESS >> 8) & 0xff;
      erasePayload[3] = PRO_FLASH_ADDRESS & 0xff;
      erasePayload[4] = 0x00;
      erasePayload[5] = 0x01;
      const erasePacket = buildProPacket(PRO_CMD.ERASE, packageId, erasePayload);
      const eraseResp = await this._sendAndWaitProResponse(erasePacket, packageId);
      if (!eraseResp || eraseResp.data[0] !== 0x59) {
        throw new Error(`Pro erase failed: ${eraseResp ? bytesToHex(eraseResp.data) : 'no response'}`);
      }
      this.emitStatus('BOOTIMG_PRO_ERASE_OK', { status: bytesToHex(eraseResp.data) });
      packageId += 1;

      const totalChunks = Math.ceil(imageData.length / PRO_CHUNK_SIZE);
      let bytesWritten = 0;

      for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex += 1) {
        this._checkCancel();

        const start = chunkIndex * PRO_CHUNK_SIZE;
        const end = Math.min(start + PRO_CHUNK_SIZE, imageData.length);
        const chunk = imageData.slice(start, end);

        const writePacket = buildProPacket(PRO_CMD.WRITE, packageId, chunk, chunk.length);
        const writeResp = await this._sendAndWaitProResponse(writePacket, packageId);
        if (!writeResp || writeResp.data[0] !== 0x59) {
          throw new Error(
            `Pro write failed at chunk ${chunkIndex}: ${writeResp ? bytesToHex(writeResp.data) : 'no response'}`
          );
        }

        packageId += 1;
        bytesWritten += chunk.length;

        onProgress?.({
          phase: 'bootimg-pro',
          current: chunkIndex + 1,
          total: totalChunks,
          bytesWritten
        });
      }

      this.emitStatus('BOOTIMG_PRO_OVER');
      const overPacket = buildProPacket(PRO_CMD.OVER, packageId, asciiBytes('OVER'), 4);
      await this._sendAndWaitProResponse(overPacket, packageId);
      this.emitStatus('BOOTIMG_PRO_COMPLETE', { bytesWritten });

      return bytesWritten;
    } finally {
      this.transport.setLoggingMode({ sendLogs: true, notificationLogs: true });
      this._cancelToken = null;
    }
  }

  async _sendAndWaitProResponse(packet, expectedPackageId) {
    this._cancelCheck();
    this.transport.clearNotificationQueue();
    await this.transport.send(packet, { chunkDelayMs: 0, chunkSize: packet.length, log: false });

    const startedAt = Date.now();
    const packets = [];

    while (Date.now() - startedAt < PRO_TIMEOUT_MS) {
      this._cancelCheck();
      try {
        const pkt = await this.transport.waitForNotification({ timeoutMs: 60 });
        packets.push(pkt);
      } catch {
        break;
      }
    }

    for (const pkt of packets) {
      const parsed = parseProPacket(pkt);
      if (parsed && parsed.cmd === PRO_CMD.WRITE && parsed.packageId === expectedPackageId) {
        return parsed;
      }
      if (parsed && parsed.packageId === expectedPackageId) {
        return parsed;
      }
    }

    return packets.length > 0 ? parseProPacket(packets[0]) : null;
  }

  _cancelCheck() {
    if (this._cancelToken?.cancelled) {
      throw new Error('Boot image operation cancelled');
    }
  }

  async writeBootImage(imageData, onProgress) {
    if (imageData.length !== BOOT_IMAGE_DATA_SIZE) {
      throw new Error(
        `Invalid boot image data size: ${imageData.length}, expected ${BOOT_IMAGE_DATA_SIZE} (128x128 RGB565)`
      );
    }

    if (this.isPro()) {
      return this.writeBootImagePro(imageData, onProgress);
    }
    return this.writeBootImage8x00(imageData, onProgress);
  }
}

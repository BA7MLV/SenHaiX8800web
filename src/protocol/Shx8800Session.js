import {
  BLOCK_SIZE,
  bytesToHex,
  buildReadFrame,
  buildWriteFrame,
  decodeRadioImageFromBlocks,
  END_READ_COMMAND,
  HANDSHAKE_ACK_HEX,
  HANDSHAKE_HEX,
  READ_ADDRESSES,
  hexToBytes
} from './shx8800.js';

const DEFAULT_TIMEOUT_MS = 4000;

export class Shx8800Session {
  constructor(transport, options = {}) {
    this.transport = transport;
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.handshakeState = 'idle';
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

  async waitForPacket({ timeoutMs = this.timeoutMs, matcher } = {}) {
    const packet = await this.transport.waitForNotification({ timeoutMs, matcher });
    return packet;
  }

  async handshake(force = false) {
    if (this.lastHandshake && !force) {
      return this.lastHandshake;
    }

    this.handshakeState = 'sending-program';
    this.emitStatus('WAIT_ACK_06');
    await this.transport.send(hexToBytes(HANDSHAKE_HEX));

    const ack = await this.waitForPacket({
      matcher: (packet) => packet.length >= 1
    });

    const ackHex = bytesToHex(ack);
    if (ack[0] !== 0x06) {
      throw new Error(`Unexpected handshake ACK: ${ackHex}`);
    }

    this.handshakeState = 'sending-0x46';
    this.emitStatus('ACK_06_RECEIVED', { hex: ackHex });
    await this.transport.send(hexToBytes(HANDSHAKE_ACK_HEX));
    this.emitStatus('WAIT_HANDSHAKE_REPLY');

    const reply = await this.waitForPacket({
      matcher: (packet) => packet.length >= 16
    });

    const result = {
      ackHex,
      replyHex: bytesToHex(reply)
    };

    this.lastHandshake = result;
    this.handshakeState = 'ready';
    this.emitStatus('HANDSHAKE_REPLY_RECEIVED', { hex: result.replyHex });
    return result;
  }

  async readBlock(address) {
    await this.transport.send(buildReadFrame(address), {
      chunkDelayMs: 0,
      chunkSize: 4,
      log: false
    });
    const frame = await this.waitForPacket({
      matcher: (packet) =>
        packet.length >= 4 + BLOCK_SIZE &&
        packet[1] === ((address >> 8) & 0xff) &&
        packet[2] === (address & 0xff)
    });

    return frame.slice(4, 4 + BLOCK_SIZE);
  }

  async writeBlock(address, payload) {
    await this.transport.send(buildWriteFrame(address, payload), {
      log: false
    });
    const ack = await this.waitForPacket({
      matcher: (packet) => packet.length >= 1
    });

    if (ack[0] !== 0x06) {
      throw new Error(`Write ACK failed at ${address}: ${bytesToHex(ack)}`);
    }
  }

  async readRadio(onProgress) {
    await this.handshake(true);

    const blocks = {};
    this.transport.setLoggingMode({ sendLogs: false, notificationLogs: false });

    try {
      for (const [index, address] of READ_ADDRESSES.entries()) {
        const payload = await this.readBlock(address);
        blocks[address] = payload;
        onProgress?.({
          phase: 'read',
          current: index + 1,
          total: READ_ADDRESSES.length,
          address
        });
      }

      await this.transport.send(Uint8Array.of(END_READ_COMMAND), {
        chunkDelayMs: 0,
        chunkSize: 1,
        log: false
      });
      const image = decodeRadioImageFromBlocks(blocks);
      image.rawBlocks = blocks;
      return image;
    } finally {
      this.transport.setLoggingMode({ sendLogs: true, notificationLogs: true });
    }
  }

  async writeRadio(image, onProgress, encodeBlocks, { onlyAddresses } = {}) {
    await this.handshake(true);
    const blocks = encodeBlocks(image);
    this.transport.setLoggingMode({ sendLogs: false, notificationLogs: false });

    const addresses = onlyAddresses
      ? READ_ADDRESSES.filter((addr) => onlyAddresses.has(addr))
      : READ_ADDRESSES;
    const total = addresses.length;

    try {
      for (const [index, address] of addresses.entries()) {
        await this.writeBlock(address, blocks[address]);
        onProgress?.({
          phase: 'write',
          current: index + 1,
          total,
          address
        });
      }

      return blocks;
    } finally {
      this.transport.setLoggingMode({ sendLogs: true, notificationLogs: true });
    }
  }
}

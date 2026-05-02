import { bytesToHex } from './shx8800.js';

const BOOT_HANDSHAKE_CANDIDATES = [
  {
    mode: 'boot-image',
    text: 'PROGROMSHXU',
    minReadyLength: 8
  },
  {
    mode: 'normal-ble',
    text: 'PROGRAMSHXPU',
    minReadyLength: 16
  }
];
const BOOT_ACK_BYTE = 0x46;
const PROBE_PAYLOAD_LENGTH = 64;

function asciiToBytes(text) {
  return new TextEncoder().encode(text);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function buildBootProbeFrame({
  cmd,
  offset,
  payloadLength = PROBE_PAYLOAD_LENGTH,
  fillByte = 0xff
}) {
  const frame = new Uint8Array(4 + payloadLength).fill(fillByte);
  frame[0] = cmd & 0xff;
  frame[1] = (offset >> 8) & 0xff;
  frame[2] = offset & 0xff;
  frame[3] = payloadLength & 0xff;
  return frame;
}

export function parseProbePacket(packet, expectedOffset = null) {
  if (!packet?.length) {
    return null;
  }

  const command = packet[0] ?? 0;
  const offset = ((packet[1] ?? 0) << 8) | (packet[2] ?? 0);
  const declaredLength = packet[3] ?? 0;
  const payload = packet.length >= 4 ? packet.slice(4) : new Uint8Array();
  const isStructured = packet.length >= 4;
  const headerMatchesExpectedOffset = expectedOffset == null ? null : offset === expectedOffset;
  const looksLikeBlockRead = isStructured && declaredLength === payload.length;

  return {
    command,
    offset,
    declaredLength,
    payload,
    payloadHex: bytesToHex(payload),
    packetHex: bytesToHex(packet),
    isStructured,
    headerMatchesExpectedOffset,
    looksLikeBlockRead
  };
}

export class BootImageProbeSession {
  constructor(transport, options = {}) {
    this.transport = transport;
    this.timeoutMs = options.timeoutMs ?? 600;
    this.idleCollectMs = options.idleCollectMs ?? 160;
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

  async collectNotifications({ totalTimeoutMs = this.timeoutMs, idleCollectMs = this.idleCollectMs } = {}) {
    const packets = [];
    const startedAt = Date.now();

    while (Date.now() - startedAt < totalTimeoutMs) {
      try {
        const packet = await this.transport.waitForNotification({ timeoutMs: idleCollectMs });
        packets.push(packet);
      } catch {
        break;
      }
    }

    return packets;
  }

  async bootHandshake(force = false) {
    if (this.lastHandshake && !force) {
      return this.lastHandshake;
    }

    const errors = [];

    for (const candidate of BOOT_HANDSHAKE_CANDIDATES) {
      try {
        this.transport.clearNotificationQueue();
        this.emitStatus('BOOTIMG_HANDSHAKE_SEND_PROGRAM', {
          mode: candidate.mode,
          text: candidate.text
        });
        await this.transport.send(asciiToBytes(candidate.text));

        const ack = await this.transport.waitForNotification({
          timeoutMs: 1200,
          matcher: (packet) => packet.length >= 1
        });

        if (ack[0] !== 0x06) {
          throw new Error(`Unexpected handshake ACK: ${bytesToHex(ack)}`);
        }

        this.emitStatus('BOOTIMG_HANDSHAKE_ACK_06', {
          mode: candidate.mode,
          hex: bytesToHex(ack)
        });
        await this.transport.send(Uint8Array.of(BOOT_ACK_BYTE));

        const ready = await this.transport.waitForNotification({
          timeoutMs: 1200,
          matcher: (packet) => packet.length >= candidate.minReadyLength
        });

        this.lastHandshake = {
          mode: candidate.mode,
          programText: candidate.text,
          ackHex: bytesToHex(ack),
          readyHex: bytesToHex(ready)
        };

        this.emitStatus('BOOTIMG_HANDSHAKE_READY', {
          mode: candidate.mode,
          hex: this.lastHandshake.readyHex
        });
        return this.lastHandshake;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        errors.push(`${candidate.mode}: ${message}`);
        this.emitStatus('BOOTIMG_HANDSHAKE_CANDIDATE_FAILED', {
          mode: candidate.mode,
          detail: message
        });
      }
    }

    throw new Error(`All boot handshake candidates failed | ${errors.join(' | ')}`);
  }

  async sendProbe({
    cmd,
    offset,
    totalTimeoutMs = this.timeoutMs,
    idleCollectMs = this.idleCollectMs,
    fillByte = 0xff,
    handshake = true
  }) {
    if (handshake) {
      await this.bootHandshake(true);
    }

    const frame = buildBootProbeFrame({ cmd, offset, fillByte });
    const sentAt = Date.now();
    this.transport.clearNotificationQueue();

    await this.transport.send(frame, {
      chunkDelayMs: 0,
      chunkSize: frame.length,
      log: true
    });

    // Give the radio a brief moment before we start draining notifications.
    await sleep(20);
    const packets = await this.collectNotifications({ totalTimeoutMs, idleCollectMs });
    const receivedAt = Date.now();
    const packetHexList = packets.map((packet) => bytesToHex(packet));
    const parsedPackets = packets.map((packet) => parseProbePacket(packet, offset));

    let ackOnly = false;
    let ackPacket = null;
    let extraPackets = packets;

    if (packets[0]?.length === 1 && packets[0][0] === 0x06) {
      ackPacket = packets[0];
      extraPackets = packets.slice(1);
      ackOnly = extraPackets.length === 0;
    }

    const mergedExtra = extraPackets.length
      ? Uint8Array.from(extraPackets.flatMap((packet) => Array.from(packet)))
      : new Uint8Array();

    return {
      cmd,
      offset,
      frame,
      frameHex: bytesToHex(frame),
      packets,
      packetHexList,
      parsedPackets,
      ackPacket,
      ackHex: ackPacket ? bytesToHex(ackPacket) : '',
      ackOnly,
      extraPackets,
      extraHex: bytesToHex(mergedExtra),
      extraBytes: mergedExtra,
      roundTripMs: receivedAt - sentAt
    };
  }
}

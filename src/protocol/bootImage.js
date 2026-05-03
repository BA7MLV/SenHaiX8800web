export const BOOT_IMAGE_WIDTH = 128;
export const BOOT_IMAGE_HEIGHT = 128;
export const BOOT_IMAGE_PIXELS = BOOT_IMAGE_WIDTH * BOOT_IMAGE_HEIGHT;
export const BOOT_IMAGE_DATA_SIZE = BOOT_IMAGE_PIXELS * 2;
export const CRC16_POLY = 0x1021;
export const CRC16_INIT = 0x0000;

export function packRgb565(r, g, b) {
  const r5 = (r >> 3) & 0x1f;
  const g6 = (g >> 2) & 0x3f;
  const b5 = (b >> 3) & 0x1f;
  return ((r5 << 11) | (g6 << 5) | b5) & 0xffff;
}

export function unpackRgb565(value) {
  const r = ((value >> 11) & 0x1f) << 3;
  const g = ((value >> 5) & 0x3f) << 2;
  const b = (value & 0x1f) << 3;
  return { r, g, b };
}

export function rgb565ToBytes(r, g, b) {
  const packed = packRgb565(r, g, b);
  return Uint8Array.of(packed & 0xff, packed >> 8);
}

export function encodeImageToRgb565(imageData) {
  const { data, width, height } = imageData;
  const bytes = new Uint8Array(BOOT_IMAGE_DATA_SIZE);
  const targetW = BOOT_IMAGE_WIDTH;
  const targetH = BOOT_IMAGE_HEIGHT;

  for (let y = 0; y < targetH; y += 1) {
    const srcY = Math.floor((y / targetH) * height);
    for (let x = 0; x < targetW; x += 1) {
      const srcX = Math.floor((x / targetW) * width);
      const srcIdx = (srcY * width + srcX) * 4;
      const r = data[srcIdx];
      const g = data[srcIdx + 1];
      const b = data[srcIdx + 2];
      const packed = packRgb565(r, g, b);
      const dstIdx = (y * targetW + x) * 2;
      bytes[dstIdx] = packed & 0xff;
      bytes[dstIdx + 1] = (packed >> 8) & 0xff;
    }
  }

  return bytes;
}

export function rgb565DataToImageData(rgb565Bytes) {
  const imageData = new ImageData(BOOT_IMAGE_WIDTH, BOOT_IMAGE_HEIGHT);
  const data = imageData.data;

  for (let i = 0; i < BOOT_IMAGE_PIXELS; i += 1) {
    const lo = rgb565Bytes[i * 2];
    const hi = rgb565Bytes[i * 2 + 1];
    const value = lo | (hi << 8);
    const { r, g, b } = unpackRgb565(value);
    data[i * 4] = r;
    data[i * 4 + 1] = g;
    data[i * 4 + 2] = b;
    data[i * 4 + 3] = 255;
  }

  return imageData;
}

export async function loadFileToImageBitmap(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async () => {
      const blob = new Blob([reader.result], { type: file.type });
      const bitmap = await createImageBitmap(blob);
      resolve(bitmap);
    };
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.readAsArrayBuffer(file);
  });
}

export function drawImageToCanvas(imageBitmap, targetW = BOOT_IMAGE_WIDTH, targetH = BOOT_IMAGE_HEIGHT) {
  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(imageBitmap, 0, 0, targetW, targetH);

  return ctx.getImageData(0, 0, targetW, targetH);
}

export async function loadFileToRgb565(file) {
  const bitmap = await loadFileToImageBitmap(file);
  const imageData = drawImageToCanvas(bitmap);
  bitmap.close();
  return encodeImageToRgb565(imageData);
}

export function computeCrc16(data, start = 0, length = data.length) {
  let crc = CRC16_INIT;
  for (let i = start; i < start + length; i += 1) {
    crc ^= (data[i] << 8) & 0xff00;
    for (let bit = 0; bit < 8; bit += 1) {
      if (crc & 0x8000) {
        crc = ((crc << 1) ^ CRC16_POLY) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }
  return crc & 0xffff;
}

export function buildProPacket(cmd, packageId, data, dataLen) {
  const length = dataLen ?? data.length;
  const totalLen = 8 + length;
  const buffer = new Uint8Array(totalLen);

  buffer[0] = 0xa5;
  buffer[1] = cmd & 0xff;
  buffer[2] = (packageId >> 8) & 0xff;
  buffer[3] = packageId & 0xff;
  buffer[4] = (length >> 8) & 0xff;
  buffer[5] = length & 0xff;

  for (let i = 0; i < length; i += 1) {
    buffer[6 + i] = data[i];
  }

  const crc = computeCrc16(buffer, 1, 5 + length);
  buffer[totalLen - 2] = (crc >> 8) & 0xff;
  buffer[totalLen - 1] = crc & 0xff;

  return buffer;
}

export function validateProPacketCrc(buffer) {
  if (buffer.length < 4) return false;
  const dataLen = ((buffer[4] << 8) | buffer[5]) & 0xffff;
  const expectedTotal = 8 + dataLen;
  if (buffer.length < expectedTotal) return false;
  const computed = computeCrc16(buffer, 1, 5 + dataLen);
  const received = ((buffer[expectedTotal - 2] << 8) | buffer[expectedTotal - 1]) & 0xffff;
  return computed === received;
}

export function parseProPacket(buffer) {
  if (buffer.length < 8) return null;
  if (buffer[0] !== 0xa5) return null;

  const cmd = buffer[1];
  const packageId = ((buffer[2] << 8) | buffer[3]) & 0xffff;
  const dataLen = ((buffer[4] << 8) | buffer[5]) & 0xffff;
  const data = buffer.slice(6, 6 + dataLen);
  const validCrc = validateProPacketCrc(buffer);

  return { cmd, packageId, dataLen, data, validCrc };
}

export function createEmptyBootImage() {
  const bytes = new Uint8Array(BOOT_IMAGE_DATA_SIZE);
  for (let i = 0; i < BOOT_IMAGE_DATA_SIZE; i += 2) {
    bytes[i] = 0xff;
    bytes[i + 1] = 0xff;
  }
  return bytes;
}

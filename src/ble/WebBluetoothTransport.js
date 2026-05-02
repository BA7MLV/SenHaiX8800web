const SERVICE_UUID = 0xffe0;
const CHARACTERISTIC_UUID = 0xffe1;
const DEVICE_NAME = 'walkie-talkie';
const DEFAULT_MTU = 23;
const DEFAULT_CHUNK_DELAY_MS = 20;

function toHex(value) {
  return value.toString(16).padStart(2, '0');
}

export class WebBluetoothTransport {
  constructor() {
    this.device = null;
    this.server = null;
    this.service = null;
    this.characteristic = null;
    this.onDataReceived = null;
    this.onConnectionChange = null;
    this.onTransportLog = null;
    this.mtu = DEFAULT_MTU;
    this.chunkDelayMs = DEFAULT_CHUNK_DELAY_MS;
    this.lastNotificationAt = null;
    this.notificationCount = 0;
    this.sendLoggingEnabled = true;
    this.notificationLoggingEnabled = true;
    this.listeners = new Map();
    this.notificationQueue = [];
    this.pendingWaiters = [];

    this.handleDisconnect = this.handleDisconnect.bind(this);
    this.handleCharacteristicChanged = this.handleCharacteristicChanged.bind(this);
  }

  on(eventName, listener) {
    const current = this.listeners.get(eventName) ?? new Set();
    current.add(listener);
    this.listeners.set(eventName, current);
    return () => current.delete(listener);
  }

  emit(eventName, payload) {
    const current = this.listeners.get(eventName);
    if (!current) return;
    current.forEach((listener) => listener(payload));
  }

  emitLog(entry) {
    this.onTransportLog?.(entry);
    this.emit('log', entry);
  }

  parseCharacteristicProperties() {
    if (!this.characteristic?.properties) return [];

    return Object.keys(this.characteristic.properties).filter((name) => {
      const descriptor = Object.getOwnPropertyDescriptor(
        Object.getPrototypeOf(this.characteristic.properties),
        name
      );

      if (!descriptor?.get) return false;

      try {
        return Boolean(this.characteristic.properties[name]);
      } catch {
        return false;
      }
    });
  }

  getConnectionSnapshot() {
    return {
      deviceName: this.device?.name ?? '',
      deviceId: this.device?.id ?? '',
      serviceUuid: this.service?.uuid ?? '',
      characteristicUuid: this.characteristic?.uuid ?? '',
      characteristicProperties: this.parseCharacteristicProperties(),
      mtu: this.mtu,
      chunkDelayMs: this.chunkDelayMs,
      notificationCount: this.notificationCount,
      lastNotificationAt: this.lastNotificationAt
    };
  }

  async connect() {
    try {
      this.notificationQueue = [];
      this.pendingWaiters = [];
      this.notificationCount = 0;
      this.lastNotificationAt = null;

      this.device = await navigator.bluetooth.requestDevice({
        filters: [{ name: DEVICE_NAME }],
        optionalServices: [SERVICE_UUID]
      });

      this.device.removeEventListener('gattserverdisconnected', this.handleDisconnect);
      this.device.addEventListener('gattserverdisconnected', this.handleDisconnect);

      this.server = await this.device.gatt.connect();
      this.service = await this.server.getPrimaryService(SERVICE_UUID);
      this.characteristic = await this.service.getCharacteristic(CHARACTERISTIC_UUID);

      this.characteristic.removeEventListener(
        'characteristicvaluechanged',
        this.handleCharacteristicChanged
      );
      this.characteristic.addEventListener(
        'characteristicvaluechanged',
        this.handleCharacteristicChanged
      );

      this.emitLog({
        type: 'INFO',
        message: 'Binding notification listener',
        time: new Date().toLocaleTimeString()
      });
      await this.characteristic.startNotifications();
      this.emitLog({
        type: 'INFO',
        message: 'Notifications started',
        time: new Date().toLocaleTimeString()
      });

      this.onConnectionChange?.(true);
      this.emit('connection', true);

      const snapshot = this.getConnectionSnapshot();
      this.emitLog({
        type: 'INFO',
        message: `Connected ${snapshot.deviceName || 'unknown-device'} | service ${snapshot.serviceUuid} | characteristic ${snapshot.characteristicUuid}`,
        time: new Date().toLocaleTimeString()
      });
      this.emitLog({
        type: 'INFO',
        message: `Characteristic properties: ${snapshot.characteristicProperties.join(', ') || 'none'}`,
        time: new Date().toLocaleTimeString()
      });

      return snapshot;
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  resolveWaiters(packet) {
    const waiters = [...this.pendingWaiters];
    for (const waiter of waiters) {
      if (!waiter.matcher || waiter.matcher(packet)) {
        clearTimeout(waiter.timeoutId);
        this.pendingWaiters = this.pendingWaiters.filter((entry) => entry !== waiter);
        waiter.resolve(packet);
        return true;
      }
    }
    return false;
  }

  handleDisconnect() {
    this.emitLog({
      type: 'INFO',
      message: 'Device disconnected',
      time: new Date().toLocaleTimeString()
    });
    this.onConnectionChange?.(false);
    this.emit('connection', false);
  }

  handleCharacteristicChanged(event) {
    const buffer = event.target.value;
    const value = new Uint8Array(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength));
    this.notificationCount += 1;
    this.lastNotificationAt = new Date().toLocaleTimeString();
    if (this.notificationLoggingEnabled) {
      this.emitLog({
        type: 'INFO',
        message: `Notification #${this.notificationCount} (${value.length} bytes)`,
        time: new Date().toLocaleTimeString(),
        hex: Array.from(value).map(toHex).join(' ')
      });
    }
    this.onDataReceived?.(value);
    this.emit('notification', value);

    if (!this.resolveWaiters(value)) {
      this.notificationQueue.push(value);
    }
  }

  waitForNotification({ timeoutMs = 4000, matcher } = {}) {
    const queueIndex = this.notificationQueue.findIndex((packet) => !matcher || matcher(packet));
    if (queueIndex >= 0) {
      const [packet] = this.notificationQueue.splice(queueIndex, 1);
      return Promise.resolve(packet);
    }

    return new Promise((resolve, reject) => {
      const waiter = {
        matcher,
        resolve,
        reject,
        timeoutId: setTimeout(() => {
          this.pendingWaiters = this.pendingWaiters.filter((entry) => entry !== waiter);
          reject(new Error('Timed out waiting for notification'));
        }, timeoutMs)
      };

      this.pendingWaiters.push(waiter);
    });
  }

  clearNotificationQueue() {
    this.notificationQueue = [];
  }

  async disconnect() {
    if (this.characteristic) {
      this.characteristic.removeEventListener(
        'characteristicvaluechanged',
        this.handleCharacteristicChanged
      );
    }

    if (this.device?.gatt?.connected) {
      this.device.gatt.disconnect();
    }

    this.pendingWaiters.forEach((waiter) => {
      clearTimeout(waiter.timeoutId);
      waiter.reject(new Error('Transport disconnected'));
    });
    this.pendingWaiters = [];
    this.notificationQueue = [];
    this.server = null;
    this.service = null;
    this.characteristic = null;
  }

  setOptions({ mtu, chunkDelayMs } = {}) {
    if (Number.isFinite(mtu) && mtu > 5) {
      this.mtu = mtu;
    }

    if (Number.isFinite(chunkDelayMs) && chunkDelayMs >= 0) {
      this.chunkDelayMs = chunkDelayMs;
    }
  }

  setLoggingMode({ sendLogs, notificationLogs } = {}) {
    if (typeof sendLogs === 'boolean') {
      this.sendLoggingEnabled = sendLogs;
    }

    if (typeof notificationLogs === 'boolean') {
      this.notificationLoggingEnabled = notificationLogs;
    }
  }

  async send(data, options = {}) {
    if (!this.characteristic) throw new Error('Not connected');

    const mtu = Number.isFinite(options.mtu) && options.mtu > 5 ? options.mtu : this.mtu;
    const chunkDelayMs =
      Number.isFinite(options.chunkDelayMs) && options.chunkDelayMs >= 0
        ? options.chunkDelayMs
        : this.chunkDelayMs;
    const retries = Number.isFinite(options.retries) && options.retries >= 1 ? options.retries : 1;
    const maxPayload =
      Number.isFinite(options.chunkSize) && options.chunkSize >= 1 ? options.chunkSize : mtu - 5;
    const logEnabled = typeof options.log === 'boolean' ? options.log : this.sendLoggingEnabled;

    const chunks = [];
    for (let i = 0; i < data.length; i += maxPayload) {
      chunks.push(data.slice(i, i + maxPayload));
    }

    if (logEnabled) {
      this.emitLog({
        type: 'INFO',
        message: `Send plan: ${data.length} bytes total | ${chunks.length} chunk(s) | chunkSize ${maxPayload} | delay ${chunkDelayMs}ms | retries ${retries}`,
        time: new Date().toLocaleTimeString()
      });
    }

    for (let attempt = 1; attempt <= retries; attempt += 1) {
      if (logEnabled) {
        this.emitLog({
          type: 'INFO',
          message: `Send attempt ${attempt}/${retries}`,
          time: new Date().toLocaleTimeString()
        });
      }

      for (const [index, chunk] of chunks.entries()) {
        const hex = Array.from(chunk).map(toHex).join(' ');
        if (logEnabled) {
          this.emitLog({
            type: 'TX',
            message: `Chunk ${index + 1}/${chunks.length}`,
            time: new Date().toLocaleTimeString(),
            hex
          });
        }
        await this.characteristic.writeValueWithoutResponse(chunk);
        if (chunkDelayMs > 0) {
          await new Promise((resolve) => setTimeout(resolve, chunkDelayMs));
        }
      }
    }
  }

  isConnected() {
    return this.device?.gatt?.connected ?? false;
  }
}

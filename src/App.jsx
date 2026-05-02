import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { WebBluetoothTransport } from './ble/WebBluetoothTransport';
import { Shx8800Session } from './protocol/Shx8800Session';
import {
  applyRadioImageToBlocks,
  CHANNEL_OPTIONS,
  RADIO_MODELS,
  createEmptyRadioImage,
  exportBackupToJson,
  importBackupFromJson
} from './protocol/shx8800';
import { AppContext } from './context/AppContext.jsx';
import { LayoutShell } from './layout/LayoutShell.jsx';
import { AdvancedPage } from './pages/AdvancedPage.jsx';
import { BackupPage } from './pages/BackupPage.jsx';
import { BootImagePage } from './pages/BootImagePage.jsx';
import { ChannelSharePage } from './pages/ChannelSharePage.jsx';
import { ChannelsPage } from './pages/ChannelsPage.jsx';
import { DtmfContactsPage } from './pages/DtmfContactsPage.jsx';
import { MdcContactsPage } from './pages/MdcContactsPage.jsx';
import { OverviewPage } from './pages/OverviewPage.jsx';
import { RadioPage } from './pages/RadioPage.jsx';
import { SettingsPage } from './pages/SettingsPage.jsx';

const DEFAULT_OPTIONS = {
  mtu: 23,
  chunkSize: 18,
  chunkDelayMs: 20,
  retries: 1
};

function App({ onToggleTheme, currentTheme }) {
  const { t } = useTranslation();
  const transportRef = useRef(null);
  const sessionRef = useRef(null);
  const fileInputRef = useRef(null);

  const [connected, setConnected] = useState(false);
  const [logs, setLogs] = useState([]);
  const [sendOptions, setSendOptions] = useState(DEFAULT_OPTIONS);
  const [connectionInfo, setConnectionInfo] = useState(null);
  const [radioImage, setRadioImage] = useState(createEmptyRadioImage());
  const [activeBank, setActiveBank] = useState('0');
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState({ percent: 0, label: '未开始' });
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isRadioDirty, setIsRadioDirty] = useState(false);
  const [originalRadioImage, setOriginalRadioImage] = useState(() => createEmptyRadioImage());
  const originalRadioImageRef = useRef(createEmptyRadioImage());

  const addLog = (entry) => {
    setLogs((prev) => [...prev, entry].slice(-200));
  };

  useEffect(() => {
    const transport = new WebBluetoothTransport();
    const session = new Shx8800Session(transport);

    transportRef.current = transport;
    sessionRef.current = session;

    transport.onConnectionChange = (nextConnected) => {
      setConnected(nextConnected);
      if (!nextConnected) {
        setConnectionInfo(null);
      }
    };

    transport.onTransportLog = (entry) => {
      addLog(entry);
      setConnectionInfo(transport.getConnectionSnapshot());
    };

    transport.onDataReceived = () => {
      setConnectionInfo(transport.getConnectionSnapshot());
    };

    transport.setOptions(DEFAULT_OPTIONS);

    return () => {
      transport.disconnect();
    };
  }, []);

  const currentBankIndex = Number.parseInt(activeBank, 10);
  const currentBank = radioImage.channels[currentBankIndex];

  const updateSendOption = (key, value) => {
    const nextOptions = { ...sendOptions, [key]: value };
    setSendOptions(nextOptions);
    transportRef.current?.setOptions(nextOptions);
  };

  const updateRadioImage = (updater) => {
    setRadioImage((prev) => {
      const next = structuredClone(prev);
      updater(next);
      return next;
    });
    setIsRadioDirty(true);
  };

  const updateChannel = (bankIndex, channelIndex, patch) => {
    updateRadioImage((next) => {
      next.channels[bankIndex][channelIndex] = {
        ...next.channels[bankIndex][channelIndex],
        ...patch
      };
      next.channels[bankIndex][channelIndex].isVisible = Boolean(
        next.channels[bankIndex][channelIndex].rxFreq
      );
    });
  };

  const replaceBankChannels = (bankIndex, channels) => {
    updateRadioImage((next) => {
      next.channels[bankIndex] = channels;
    });
  };

  const updateRadioModel = (model) => {
    updateRadioImage((next) => {
      next.model = model;
    });
  };

  const updateBankName = (bankIndex, value) => {
    updateRadioImage((next) => {
      next.bankNames[bankIndex] = value;
    });
  };

  const updateVfo = (patch) => {
    updateRadioImage((next) => {
      next.vfos = {
        ...next.vfos,
        ...patch
      };
    });
  };

  const updateDtmf = (patch) => {
    updateRadioImage((next) => {
      next.dtmf = {
        ...next.dtmf,
        ...patch
      };
    });
  };

  const updateDtmfGroup = (index, value) => {
    updateRadioImage((next) => {
      next.dtmf.group[index] = value;
    });
  };

  const updateFunctionConfig = (patch) => {
    updateRadioImage((next) => {
      next.functionConfig = {
        ...next.functionConfig,
        ...patch
      };
    });
  };

  const updateFmChannel = (index, value) => {
    updateRadioImage((next) => {
      next.fm.channels[index] = value ?? 0;
    });
  };

  const updateFm = (patch) => {
    updateRadioImage((next) => {
      next.fm = {
        ...next.fm,
        ...patch
      };
    });
  };

  const withBusy = async (label, action) => {
    setBusy(true);
    setProgress({ percent: 0, label });
    try {
      await action();
    } catch (error) {
      addLog({ type: 'ERROR', message: error.message, time: new Date().toLocaleTimeString() });
      throw error;
    } finally {
      setBusy(false);
    }
  };

  const handleConnect = async () => {
    try {
      transportRef.current?.setOptions(sendOptions);
      const snapshot = await transportRef.current?.connect();
      setConnectionInfo(snapshot);
    } catch (error) {
      addLog({ type: 'ERROR', message: error.message, time: new Date().toLocaleTimeString() });
    }
  };

  const handleDisconnect = async () => {
    try {
      await transportRef.current?.disconnect();
      addLog({ type: 'INFO', message: 'Disconnected by user', time: new Date().toLocaleTimeString() });
      setConnectionInfo(null);
    } catch (error) {
      addLog({ type: 'ERROR', message: error.message, time: new Date().toLocaleTimeString() });
    }
  };

  const handleHandshake = async () => {
    await withBusy(t('progress.handshaking'), async () => {
      const result = await sessionRef.current.handshake(true);
      setProgress({ percent: 100, label: t('progress.handshakeDone') });
      addLog({
        type: 'INFO',
        message: `Handshake ready | ${result.replyHex}`,
        time: new Date().toLocaleTimeString()
      });
    });
  };

  const handleReadRadio = async () => {
    await withBusy(t('progress.reading'), async () => {
      const image = await sessionRef.current.readRadio(({ current, total, address }) => {
        if (current === total || current === 1 || current % 8 === 0) {
          setProgress({
            percent: Math.round((current / total) * 100),
            label: t('progress.readingProgress', { current, total, address })
          });
        }
      });
      originalRadioImageRef.current = structuredClone(image);
      setOriginalRadioImage(originalRadioImageRef.current);
      setRadioImage(image);
      setIsRadioDirty(false);
      setProgress({ percent: 100, label: t('progress.readDone') });
    });
  };

  const handleWriteRadio = async () => {
    await withBusy(t('progress.writing'), async () => {
      const blocks = await sessionRef.current.writeRadio(
        radioImage,
        ({ current, total, address }) => {
          if (current === total || current === 1 || current % 8 === 0) {
            setProgress({
              percent: Math.round((current / total) * 100),
              label: t('progress.writingProgress', { current, total, address })
            });
          }
        },
        (image) => applyRadioImageToBlocks(image, image.rawBlocks)
      );
      setRadioImage((prev) => {
        originalRadioImageRef.current = structuredClone(prev);
        setOriginalRadioImage(originalRadioImageRef.current);
        return { ...prev, rawBlocks: blocks };
      });
      setIsRadioDirty(false);
      setProgress({ percent: 100, label: t('progress.writeDone') });
    });
  };

  const handleExportBackup = () => {
    const json = exportBackupToJson(radioImage);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${String(radioImage.model ?? 'radio').toLowerCase()}-backup-${new Date()
      .toISOString()
      .slice(0, 19)
      .replace(/[:T]/g, '-')}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const handleImportBackup = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const json = await file.text();
      const imported = importBackupFromJson(json);
      originalRadioImageRef.current = structuredClone(imported);
      setOriginalRadioImage(originalRadioImageRef.current);
      setRadioImage(imported);
      setIsRadioDirty(false);
      addLog({
        type: 'INFO',
        message: `Imported backup: ${file.name}`,
        time: new Date().toLocaleTimeString()
      });
    } catch (error) {
      addLog({ type: 'ERROR', message: error.message, time: new Date().toLocaleTimeString() });
    } finally {
      event.target.value = '';
    }
  };

  const contextValue = {
    activeBank,
    busy,
    connected,
    connectionInfo,
    currentBank,
    currentBankIndex,
    currentTheme,
    fileInputRef,
    handleConnect,
    handleDisconnect,
    handleExportBackup,
    handleHandshake,
    handleImportBackup,
    handleReadRadio,
    handleWriteRadio,
    logs,
    onToggleTheme,
    originalRadioImage,
    progress,
    radioImage,
    radioModelOptions: RADIO_MODELS,
    isRadioDirty,
    replaceBankChannels,
    sendOptions,
    setActiveBank,
    isSidebarCollapsed,
    setIsSidebarCollapsed,
    getTransport: () => transportRef.current,
    toggleSidebar: () => setIsSidebarCollapsed((prev) => !prev),
    updateBankName,
    updateChannel,
    updateRadioModel,
    updateDtmf,
    updateDtmfGroup,
    updateFm,
    updateFmChannel,
    updateFunctionConfig,
    updateSendOption,
    updateVfo,
    channelOptionLabels: CHANNEL_OPTIONS
  };

  return (
    <AppContext.Provider value={contextValue}>
      <BrowserRouter>
        <Routes>
          <Route element={<LayoutShell />}>
            <Route index element={<Navigate to="/overview" replace />} />
            <Route path="/overview" element={<OverviewPage />} />
            <Route path="/channels" element={<ChannelsPage />} />
            <Route path="/radio" element={<RadioPage />} />
            <Route path="/mdc" element={<MdcContactsPage />} />
            <Route path="/dtmf" element={<DtmfContactsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/backup" element={<BackupPage />} />
            <Route path="/boot-image" element={<BootImagePage />} />
            <Route path="/share" element={<ChannelSharePage />} />
            <Route path="/advanced" element={<AdvancedPage />} />
            <Route path="*" element={<Navigate to="/overview" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AppContext.Provider>
  );
}

export default App;

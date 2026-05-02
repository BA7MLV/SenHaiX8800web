import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router-dom';
import { Globe, Menu, PanelLeftClose, PanelLeftOpen, Unplug, Wifi } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { Button } from './ui/Button';
import { DiffModal } from './DiffModal';
import { IconButton } from './ui/IconButton';
import { Select } from './ui/Select';
import { cn } from '../utils/cn';

const routeTitles = [
  { path: '/overview', label: '基础信息' },
  { path: '/channels', label: '信道管理' },
  { path: '/radio', label: '收音机' },
  { path: '/mdc', label: 'MDC 联系人' },
  { path: '/dtmf', label: 'DTMF 联系人' },
  { path: '/settings', label: '设置管理' },
  { path: '/backup', label: '备份/还原' },
  { path: '/boot-image', label: '开机图片' },
  { path: '/advanced', label: '高级设置' },
  { path: '/share', label: '信道分享' }
];

export function TopNav() {
  const { i18n } = useTranslation();
  const location = useLocation();
  const { connected, busy, handleConnect, handleDisconnect, isSidebarCollapsed, toggleSidebar, isRadioDirty, originalRadioImage, radioImage, radioModelOptions, updateRadioModel } = useAppContext();
  const [showDiff, setShowDiff] = useState(false);

  const currentRoute = routeTitles.find((item) => location.pathname.startsWith(item.path));

  const toggleLanguage = useCallback(() => {
    i18n.changeLanguage(i18n.language === 'zh' ? 'en' : 'zh');
  }, [i18n]);

  return (
    <div className="flex h-[60px] items-center justify-between px-4 sm:px-5 lg:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <IconButton
          aria-label={isSidebarCollapsed ? '展开侧边栏' : '收起侧边栏'}
          icon={<Menu className="size-4" />}
          variant="ghost"
          className="lg:hidden"
          onClick={toggleSidebar}
        />
        <IconButton
          aria-label={isSidebarCollapsed ? '展开侧边栏' : '收起侧边栏'}
          icon={isSidebarCollapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
          variant="ghost"
          size="sm"
          className="hidden lg:inline-flex"
          onClick={toggleSidebar}
        />
        <Link to="/overview" className="inline-flex items-center gap-2 text-content-primary no-underline">
          <span className="rounded-sm bg-surface-muted px-1.5 py-0.5 text-xs text-content-muted">Beta</span>
        </Link>
        <div className="hidden min-w-0 items-center gap-2 text-sm text-content-muted md:flex">
          <span>/</span>
          <span className="truncate">{currentRoute?.label ?? '控制台'}</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => isRadioDirty && setShowDiff(true)}
          disabled={!isRadioDirty}
          className={cn(
            'hidden rounded-sm border px-2 py-1 text-xs sm:inline-flex',
            isRadioDirty
              ? 'cursor-pointer border-warning-border bg-warning-bg text-warning hover:brightness-95'
              : 'border-line/50 bg-surface-card/92 text-content-secondary disabled:cursor-default'
          )}
        >
          {isRadioDirty ? '有未保存修改' : '当前内容已保存'}
        </button>
        <Select
          value={radioImage.model}
          onChange={(event) => updateRadioModel(event.target.value)}
          options={radioModelOptions}
          className="hidden sm:inline-flex min-w-[96px] rounded-sm border border-line/50 bg-surface-card/92 px-1.5 py-0.5 text-xs"
        />
        <span
          className={cn(
            'hidden rounded-sm border px-2 py-1 text-xs sm:inline-flex',
            connected
              ? 'border-success-border bg-success-bg text-success'
              : 'border-line bg-surface-muted text-content-muted'
          )}
        >
          {connected ? '已连接' : '未连接'}
        </span>
        <IconButton
          aria-label="切换语言"
          icon={<Globe className="size-4" />}
          variant="default"
          size="sm"
          onClick={toggleLanguage}
        />
        <Button
          variant="secondary"
          size="sm"
          onClick={handleDisconnect}
          disabled={!connected || busy}
          icon={<Unplug className="size-4" />}
          className="hidden sm:inline-flex"
        >
          断开
        </Button>
        <Button
          variant="primary"
          size="sm"
          onClick={handleConnect}
          disabled={connected || busy}
          icon={<Wifi className="size-4" />}
        >
          <span className="hidden sm:inline">连接设备</span>
          <span className="sm:hidden">连接</span>
        </Button>
      </div>

      <DiffModal
        open={showDiff}
        onClose={() => setShowDiff(false)}
        original={originalRadioImage}
        current={radioImage}
      />
    </div>
  );
}

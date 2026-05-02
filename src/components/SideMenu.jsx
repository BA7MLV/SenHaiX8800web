import { NavLink } from 'react-router-dom';
import {
  Aperture,
  Database,
  FileArchive,
  Image,
  MessageCircleMore,
  Radio,
  Settings2,
  Share2,
  UploadCloud,
  Users,
  Waypoints,
  Wrench
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAppContext } from '../context/AppContext';
import { cn } from '../utils/cn';

function useMenuGroups(t) {
  return [
    {
      title: t('sidebar.writer'),
      icon: Aperture,
      items: [
        { to: '/overview', label: t('sidebar.overview'), icon: Aperture },
        { to: '/channels', label: t('sidebar.channelManagement'), icon: Database },
        { to: '/radio', label: t('sidebar.radio'), icon: Radio },
        { to: '/mdc', label: t('sidebar.mdcContacts'), icon: Users },
        { to: '/dtmf', label: t('sidebar.dtmfContacts'), icon: Waypoints },
        { to: '/settings', label: t('sidebar.settingsManagement'), icon: Settings2 }
      ]
    },
    {
      title: t('sidebar.tools'),
      icon: Wrench,
      items: [
        { to: '/backup', label: t('sidebar.backupRestore'), icon: FileArchive },
        { to: '/boot-image', label: t('sidebar.bootImage'), icon: Image },
        { to: '/advanced', label: '高级设置', icon: Wrench },
        { to: '/share', label: t('sidebar.channelShare'), icon: Share2 }
      ]
    },
    {
      title: t('sidebar.future'),
      icon: UploadCloud,
      items: [
        { label: t('sidebar.firmwareUpgrade'), icon: UploadCloud, disabled: true },
        { label: t('sidebar.radioChat'), icon: MessageCircleMore, disabled: true }
      ]
    }
  ];
}

function MenuItem({ item }) {
  const Icon = item.icon;
  const { isSidebarCollapsed } = useAppContext();

  if (item.disabled) {
    return (
      <div
        className={cn(
          'flex items-center gap-3 rounded-[4px] px-3 py-2 text-sm text-content-faint',
          isSidebarCollapsed && 'justify-center px-2'
        )}
      >
        <Icon className="size-4 shrink-0" />
        {isSidebarCollapsed ? null : <span>{item.label}</span>}
      </div>
    );
  }

  return (
    <NavLink
      to={item.to}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 rounded-[4px] px-3 py-2 text-sm transition-colors duration-150',
          isSidebarCollapsed && 'justify-center px-2',
          isActive
            ? 'bg-brand-accent-light font-medium text-content-link'
            : 'text-content-secondary hover:bg-surface-muted hover:text-content-primary'
        )
      }
      title={isSidebarCollapsed ? item.label : undefined}
    >
      <Icon className="size-4 shrink-0" />
      {isSidebarCollapsed ? null : <span>{item.label}</span>}
    </NavLink>
  );
}

export function SideMenu() {
  const { t } = useTranslation();
  const { isSidebarCollapsed } = useAppContext();
  const groups = useMenuGroups(t);

  return (
    <aside className="flex h-full flex-col overflow-hidden bg-white">
      <div className={cn('flex-1 py-4', isSidebarCollapsed ? 'px-2' : 'px-4')}>
        <div className="space-y-5">
          {groups.map((group) => {
            return (
              <section key={group.title} className="space-y-2">
                {isSidebarCollapsed ? (
                  <div className="mx-1 border-t border-line-subtle" />
                ) : (
                  <div className="px-3 text-xs font-medium uppercase tracking-[0.06em] text-content-muted">
                    <span>{group.title}</span>
                  </div>
                )}

                <div className="space-y-1">
                  {group.items.map((item) => (
                    <MenuItem key={item.to ?? item.label} item={item} />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </aside>
  );
}

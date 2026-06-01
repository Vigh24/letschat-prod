import { useState, useEffect, useRef } from 'react';
import {
  Inbox, Ticket, Cpu, GraduationCap, Radio,
  Brain, Settings, BarChart3, Bell, LogOut,
  Users, LayoutDashboard, X, ChevronUp
} from 'lucide-react';
import type { ActiveView } from '../types';
import { Avatar, AvatarImage, AvatarFallback } from './ui/Avatar';
import { currentAgent } from '../data/appConfig';
import { useAppStore, type AgentStatus } from '../store/appStore';

interface SidebarProps {
  activeView: ActiveView;
  onViewChange: (v: ActiveView) => void;
  badgeCounts?: {
    inbox?: number;
    channels?: number;
  };
  onLogOut?: () => void;
  open: boolean;
  onClose: () => void;
}

interface NavItem {
  id: ActiveView;
  label: string;
  icon: React.ElementType;
  section?: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard',    label: 'Dashboard',          icon: LayoutDashboard, section: 'Support' },
  { id: 'inbox',        label: 'Inbox',              icon: Inbox,         section: 'Support' },
  { id: 'tickets',      label: 'Tickets',            icon: Ticket,        section: 'Support' },
  { id: 'copilot',      label: 'AI Copilot',         icon: Cpu,           section: 'Support' },
  { id: 'simulator',    label: 'Simulator',          icon: GraduationCap, section: 'Support' },
  { id: 'team',         label: 'Team',               icon: Users,         section: 'Manage' },
  { id: 'channels',     label: 'Channels',           icon: Radio,         section: 'Manage' },
  { id: 'ai_training',  label: 'AI Training',        icon: Brain,         section: 'Manage' },
  { id: 'analytics',    label: 'Analytics',          icon: BarChart3,     section: 'Manage' },
  { id: 'settings',     label: 'Settings',           icon: Settings,      section: 'Manage' },
];

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  );
}

const getStatusColor = (status: AgentStatus) => {
  switch (status) {
    case 'online': return 'bg-emerald-500';
    case 'busy': return 'bg-rose-500';
    case 'break': return 'bg-amber-500';
    case 'offline': return 'bg-zinc-500';
    default: return 'bg-zinc-500';
  }
};

function AgentStatusSelect() {
  const agentStatus = useAppStore(s => s.agentStatus);
  const setAgentStatus = useAppStore(s => s.setAgentStatus);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const options: { value: AgentStatus; label: string }[] = [
    { value: 'online', label: 'Online' },
    { value: 'busy', label: 'Busy' },
    { value: 'break', label: 'Break' },
    { value: 'offline', label: 'Offline' }
  ];

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 rounded-md px-1 py-0.5 text-[9px] font-semibold transition-all duration-200 cursor-pointer bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.06] hover:border-white/[0.08]"
      >
        <span className={`h-1.5 w-1.5 rounded-full ${getStatusColor(agentStatus)}`} />
        <span className="theme-text-secondary leading-none capitalize">{agentStatus}</span>
        <ChevronUp className={`h-2.5 w-2.5 text-zinc-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute left-0 bottom-full mb-1.5 z-[99] w-24 rounded-lg border theme-border theme-bg-panel shadow-2xl p-1 space-y-0.5 animate-scale-in">
          {options.map(opt => {
            const isSelected = opt.value === agentStatus;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  setAgentStatus(opt.value);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-1.5 py-1 rounded text-[8px] font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-between ${
                  isSelected 
                    ? 'bg-emerald-500/10 text-emerald-650 dark:text-emerald-400 font-black' 
                    : 'theme-text-secondary hover:bg-white/[0.04] hover:theme-text-main'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <span className={`h-1 w-1 rounded-full ${getStatusColor(opt.value)}`} />
                  <span>{opt.label}</span>
                </div>
                {isSelected && <span className="h-1 w-1 rounded-full bg-emerald-450 dark:bg-emerald-400" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function Sidebar({ activeView, onViewChange, badgeCounts, onLogOut, open, onClose }: SidebarProps) {
  const sections = currentAgent.role === 'admin' ? ['Support', 'Manage'] : ['Support'];
  const agentStatus = useAppStore(s => s.agentStatus);

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="flex h-14 shrink-0 items-center justify-between border-b theme-border px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-md shadow-emerald-500/10">
            <WhatsAppIcon className="h-4 w-4" />
          </div>
          <div>
            <span className="text-sm font-extrabold theme-text-main tracking-tight font-display">Lets Chat</span>
          </div>
        </div>
        <button onClick={onClose} className="lg:hidden rounded-xl p-1.5 theme-text-muted hover:theme-text-main hover:bg-white/[0.03] transition-all cursor-pointer">
          <X className="h-4.5 w-4.5" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
        {sections.map((section) => {
          const items = NAV_ITEMS.filter(i => i.section === section);
          return (
            <div key={section} className="space-y-1.5">
              <p className="px-3 pb-2 text-[9px] font-black uppercase tracking-[0.15em] theme-text-muted-darker select-none">
                {section}
              </p>
              <div className="space-y-1">
                {items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeView === item.id;
                  const badge = badgeCounts ? (item.id === 'inbox' ? badgeCounts.inbox : item.id === 'channels' ? badgeCounts.channels : undefined) : undefined;
                  return (
                    <button
                      key={item.id}
                      onClick={() => { onViewChange(item.id); onClose(); }}
                      className={`group relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all duration-300 cursor-pointer ${
                        isActive
                          ? 'bg-emerald-500/[0.06] border border-emerald-500/10 text-emerald-400 dark:text-emerald-400 shadow-[inset_0_1px_1px_rgba(255,255,255,0.02)]'
                          : 'border border-transparent text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.02] dark:hover:bg-white/[0.02]'
                      }`}
                    >
                      {/* Active indicator bar */}
                      {isActive && (
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.75 h-5 rounded-r-full bg-emerald-500" />
                      )}
                      <Icon className={`h-[15px] w-[15px] shrink-0 transition-all duration-300 ${isActive ? 'text-emerald-400 scale-105' : 'text-zinc-500 group-hover:text-zinc-300'}`} />
                      <span className={`truncate text-xs flex-1 transition-colors duration-300 ${isActive ? 'font-bold' : 'font-medium'}`}>
                        {item.label}
                      </span>
                      {badge != null && badge > 0 && (
                        <span className={`flex h-[18px] min-w-[18px] items-center justify-center rounded-lg px-1.5 text-[9px] font-bold transition-all duration-300 ${
                          isActive ? 'bg-emerald-500/20 text-emerald-300' : 'bg-white/[0.04] text-zinc-400 border border-white/[0.04]'
                        }`}>
                          {badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* Agent profile footer */}
      <div className="shrink-0 p-4 border-t theme-border">
        <div className="flex items-center gap-3 rounded-2xl border border-white/[0.04] bg-white/[0.01] p-2.5 shadow-sm">
          <div className="relative shrink-0">
            <Avatar size="sm">
              {currentAgent.avatar_url ? <AvatarImage src={currentAgent.avatar_url} alt={currentAgent.full_name} /> : null}
              <AvatarFallback>{currentAgent.full_name.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
            <span className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ${getStatusColor(agentStatus)} ring-2 ring-zinc-900 dark:ring-zinc-950`} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-bold theme-text-main leading-none">{currentAgent.full_name}</p>
            <div className="flex items-center gap-1 mt-1 leading-none flex-wrap">
              <span className="capitalize text-[9px] theme-text-muted font-semibold">{currentAgent.role}</span>
              <span className="theme-text-muted text-[9px]">•</span>
              <AgentStatusSelect />
            </div>
          </div>
          {onLogOut ? (
            <button onClick={onLogOut}
              className="rounded-xl p-2 text-rose-450 hover:bg-rose-500/10 hover:text-rose-450 transition-all duration-200 shrink-0 cursor-pointer border border-transparent hover:border-rose-500/10"
              title="Log Out"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          ) : (
            <button className="rounded-xl p-2 theme-text-muted hover:theme-text-main hover:bg-white/[0.03] transition-all duration-200 shrink-0 cursor-pointer border border-transparent" style={{ background: 'transparent' }}>
              <Bell className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden animate-fade-in" onClick={onClose} />
      )}
      {/* Mobile sidebar (overlay) */}
      <aside className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col theme-bg-secondary border-r theme-border transition-transform duration-300 lg:hidden ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        {sidebarContent}
      </aside>
      {/* Desktop sidebar (always visible) */}
      <aside className="hidden lg:flex h-screen w-52 flex-col border-r theme-border theme-bg-secondary shrink-0">
        {sidebarContent}
      </aside>
    </>
  );
}

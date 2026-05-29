import { useState, useEffect, useRef } from 'react';
import { Loader, CheckCircle, AlertTriangle, Users, Eye, EyeOff, ChevronDown } from 'lucide-react';
import { currentAgent } from '../data/appConfig';
import { formatDistanceToNow } from 'date-fns';
import { Avatar, AvatarImage, AvatarFallback } from './ui/Avatar';

interface TeamUser {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'agent' | 'supervisor';
  is_online: boolean;
  last_seen_at?: string;
  avatar_url: string | null;
}

function TeamRoleSelect({ 
  role, 
  disabled, 
  onChange 
}: { 
  role: 'admin' | 'agent' | 'supervisor'; 
  disabled: boolean; 
  onChange: (newRole: 'admin' | 'agent' | 'supervisor') => void;
}) {
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

  const options = [
    { value: 'admin', label: 'Admin' },
    { value: 'agent', label: 'Agent' },
    { value: 'supervisor', label: 'Supervisor' }
  ];

  const currentLabel = role === 'admin' ? 'Admin' : role === 'supervisor' ? 'Supervisor' : 'Agent';

  return (
    <div className="relative w-32" ref={dropdownRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full bg-white/[0.03] border border-white/[0.06] rounded-lg px-2.5 py-1.5 text-[11px] font-semibold theme-text-secondary focus:outline-none focus:border-emerald-500/30 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed uppercase"
      >
        <span>{currentLabel}</span>
        {!disabled && <ChevronDown className={`h-3 w-3 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />}
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-1.5 z-50 w-full rounded-lg border theme-border theme-bg-panel shadow-2xl p-1 space-y-0.5 animate-scale-in">
          {options.map(opt => {
            const isSelected = opt.value === role;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value as 'admin' | 'agent' | 'supervisor');
                  setIsOpen(false);
                }}
                className={`w-full text-left px-2.5 py-1.5 rounded text-[10px] font-bold uppercase transition-all cursor-pointer flex items-center justify-between ${
                  isSelected 
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold' 
                    : 'theme-text-secondary hover:bg-white/[0.04] hover:theme-text-main'
                }`}
              >
                <span>{opt.label}</span>
                {isSelected && <span className="h-1 w-1 rounded-full bg-emerald-500 dark:bg-emerald-400" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function TeamAccessScopeSelect({
  scope,
  disabled,
  onChange
}: {
  scope: 'all' | 'assigned';
  disabled: boolean;
  onChange: (newScope: 'all' | 'assigned') => void;
}) {
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

  const options = [
    { value: 'all', label: 'All Tickets' },
    { value: 'assigned', label: 'Assigned Only' }
  ];

  const currentLabel = scope === 'all' ? 'All Tickets' : 'Assigned Only';

  return (
    <div className="relative w-full max-w-[200px]" ref={dropdownRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full bg-white/[0.03] border border-white/[0.06] rounded-lg pl-8! pr-2.5 py-1.5 text-[11px] font-semibold theme-text-secondary focus:outline-none focus:border-emerald-500/30 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed uppercase"
      >
        <span className="flex items-center gap-1.5">
          <span>{currentLabel}</span>
        </span>
        {!disabled && <ChevronDown className={`h-3 w-3 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />}
      </button>
      
      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 theme-text-muted pointer-events-none">
        {scope === 'all' ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
      </span>

      {isOpen && (
        <div className="absolute left-0 mt-1.5 z-50 w-full rounded-lg border theme-border theme-bg-panel shadow-2xl p-1 space-y-0.5 animate-scale-in">
          {options.map(opt => {
            const isSelected = opt.value === scope;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value as 'all' | 'assigned');
                  setIsOpen(false);
                }}
                className={`w-full text-left px-2.5 py-1.5 rounded text-[10px] font-bold uppercase transition-all cursor-pointer flex items-center justify-between ${
                  isSelected 
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold' 
                    : 'theme-text-secondary hover:bg-white/[0.04] hover:theme-text-main'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  {opt.value === 'all' ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                  <span>{opt.label}</span>
                </span>
                {isSelected && <span className="h-1 w-1 rounded-full bg-emerald-500 dark:bg-emerald-400" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function TeamView() {
  const [users, setUsers] = useState<TeamUser[]>([]);
  const [accessScopes, setAccessScopes] = useState<Record<string, 'all' | 'assigned'>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [supabaseMode, setSupabaseMode] = useState<'LIVE' | 'MOCK'>('LIVE');

  useEffect(() => {
    let isMounted = true;
    import('../lib/supabase').then(async ({ supabase, isSupabaseConfigured }) => {
      if (isSupabaseConfigured) {
        setSupabaseMode('LIVE');
        try {
          // Fetch org settings to retrieve access scopes
          const { data: orgData } = await supabase
            .from('organizations')
            .select('settings')
            .eq('id', '00000000-0000-0000-0000-000000000001')
            .maybeSingle();

          if (orgData?.settings) {
            setAccessScopes(orgData.settings.agent_access_scopes || {});
          }

          // Fetch all users
          const { data: usersData } = await supabase
            .from('users')
            .select('*')
            .order('full_name', { ascending: true });

          if (usersData && isMounted) {
            setUsers(usersData);
          }
        } catch (err) {
          console.error('Failed to load team data:', err);
        } finally {
          if (isMounted) setLoading(false);
        }
      } else {
        setSupabaseMode('MOCK');
        setLoading(false);
        setUsers([
          { id: currentAgent.id, email: currentAgent.email, full_name: currentAgent.full_name, role: currentAgent.role as any, is_online: true, last_seen_at: new Date().toISOString(), avatar_url: null },
          { id: '2', email: 'rahul.kumar@letschat.com', full_name: 'Rahul Kumar', role: 'agent', is_online: false, last_seen_at: new Date(Date.now() - 3600000 * 4).toISOString(), avatar_url: null },
          { id: '3', email: 'neha.singh@letschat.com', full_name: 'Neha Singh', role: 'agent', is_online: true, last_seen_at: new Date().toISOString(), avatar_url: null }
        ]);
        setAccessScopes({
          [currentAgent.id]: 'all',
          '2': 'assigned',
          '3': 'all'
        });
      }
    });

    return () => { isMounted = false; };
  }, []);

  const handleUpdateRole = async (userId: string, newRole: 'admin' | 'agent' | 'supervisor') => {
    if (userId === currentAgent.id) {
      alert("You cannot demote or modify your own role to ensure system lock out safety.");
      return;
    }

    setSaving(userId);
    import('../lib/supabase').then(async ({ supabase, isSupabaseConfigured }) => {
      try {
        if (isSupabaseConfigured) {
          const { error } = await supabase
            .from('users')
            .update({ role: newRole })
            .eq('id', userId);
          if (error) throw error;
        }
        
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
        setSaved(userId);
        setTimeout(() => setSaved(null), 1500);
      } catch (err) {
        console.error('Failed to update role:', err);
        alert('Failed to update role in Supabase.');
      } finally {
        setSaving(null);
      }
    });
  };

  const handleUpdateAccessScope = async (userId: string, newScope: 'all' | 'assigned') => {
    if (userId === currentAgent.id) {
      alert("You cannot restrict your own ticket access scope.");
      return;
    }

    setSaving(userId + '_scope');
    import('../lib/supabase').then(async ({ supabase, isSupabaseConfigured }) => {
      try {
        const updatedScopes = { ...accessScopes, [userId]: newScope };
        if (isSupabaseConfigured) {
          // Fetch current settings first
          const { data: orgData } = await supabase
            .from('organizations')
            .select('settings')
            .eq('id', '00000000-0000-0000-0000-000000000001')
            .maybeSingle();

          const currentSettings = orgData?.settings || {};
          const { error } = await supabase
            .from('organizations')
            .update({
              settings: {
                ...currentSettings,
                agent_access_scopes: updatedScopes
              }
            })
            .eq('id', '00000000-0000-0000-0000-000000000001');

          if (error) throw error;
        }

        setAccessScopes(updatedScopes);
        setSaved(userId + '_scope');
        setTimeout(() => setSaved(null), 1500);
      } catch (err) {
        console.error('Failed to update access scope:', err);
        alert('Failed to save access scope.');
      } finally {
        setSaving(null);
      }
    });
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center theme-bg-primary">
        <Loader className="h-5 w-5 text-emerald-500 dark:text-emerald-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto theme-bg-primary select-none">
      <div className="max-w-5xl mx-auto px-6 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shadow-md shadow-emerald-500/5">
              <Users className="h-5 w-5 text-emerald-500" />
            </div>
            <div>
              <h1 className="text-lg font-bold theme-text-main">Team Management</h1>
              <p className="text-xs theme-text-muted mt-0.5">Control employee workspace permissions, roles, and ticket scopes</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-[9px] font-bold px-2 py-0.5 rounded ${supabaseMode === 'LIVE' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/15' : 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/15'}`}>
              {supabaseMode} MODE
            </span>
          </div>
        </div>

        {/* Database Warning if in Mock Mode */}
        {supabaseMode === 'MOCK' && (
          <div className="rounded-xl bg-amber-500/[0.04] border border-amber-500/10 p-4 flex gap-3">
            <AlertTriangle className="h-4 w-4 text-amber-700 dark:text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-amber-700 dark:text-amber-500">Running in Local Mock Mode</p>
              <p className="text-[10px] text-amber-600/80 dark:text-amber-400/80 mt-0.5">Changes will operate in memory. Connect your Supabase database keys in the configurations to store dynamically.</p>
            </div>
          </div>
        )}

        {/* Team Members List */}
        <div className="rounded-xl border theme-border theme-bg-secondary overflow-hidden shadow-sm">
          <div className="grid grid-cols-12 gap-4 bg-zinc-100/50 dark:bg-white/[0.02] px-5 py-3 text-[9px] font-bold uppercase tracking-wider theme-text-muted border-b theme-border">
            <div className="col-span-4">Team Member</div>
            <div className="col-span-2">Status</div>
            <div className="col-span-3">Workspace Role</div>
            <div className="col-span-3">Ticket Access Scope</div>
          </div>

          <div className="divide-y theme-border-extra-subtle">
            {users.map(u => {
              const isSelf = u.id === currentAgent.id;
              const scope = accessScopes[u.id] || 'all';
              const isUpdatingRole = saving === u.id;
              const isUpdatingScope = saving === (u.id + '_scope');
              const isSavedRole = saved === u.id;
              const isSavedScope = saved === (u.id + '_scope');

              return (
                <div key={u.id} className="grid grid-cols-12 gap-4 px-5 py-3.5 theme-bg-hover hover:theme-bg-active items-center transition-all border-b theme-border-extra-subtle last:border-none">
                  
                  {/* Avatar & Info */}
                  <div className="col-span-4 flex items-center gap-3 min-w-0">
                    <Avatar size="sm">
                      {u.avatar_url ? <AvatarImage src={u.avatar_url} alt={u.full_name || ''} /> : null}
                      <AvatarFallback>{(u.full_name || '?').charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="font-semibold theme-text-main truncate flex items-center gap-1.5">
                        {u.full_name}
                        {isSelf && (
                          <span className="text-[8px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/15 px-1.5 py-0.5 rounded uppercase">You</span>
                        )}
                      </p>
                      <p className="text-[10px] theme-text-muted truncate mt-0.5 font-mono">{u.email}</p>
                    </div>
                  </div>

                  {/* Status Indicator */}
                  <div className="col-span-2 flex flex-col justify-center gap-0.5">
                    {u.is_online ? (
                      <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold text-[11px]">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Online
                      </div>
                    ) : (
                      <div className="flex flex-col">
                        <span className="text-[11px] theme-text-muted font-bold">Offline</span>
                        {u.last_seen_at && (
                          <span className="text-[9px] theme-text-muted-darker">
                            {formatDistanceToNow(new Date(u.last_seen_at), { addSuffix: true })}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Role Selector */}
                  <div className="col-span-3 flex items-center gap-2">
                    <TeamRoleSelect
                      role={u.role}
                      disabled={isSelf}
                      onChange={(newRole) => handleUpdateRole(u.id, newRole)}
                    />

                    {isUpdatingRole && <Loader className="h-3.5 w-3.5 text-emerald-400 animate-spin" />}
                    {isSavedRole && <CheckCircle className="h-3.5 w-3.5 text-emerald-400" />}
                  </div>

                  {/* Access Scope Selector */}
                  <div className="col-span-3 flex items-center gap-2">
                    <TeamAccessScopeSelect
                      scope={scope}
                      disabled={isSelf}
                      onChange={(newScope) => handleUpdateAccessScope(u.id, newScope)}
                    />

                    {isUpdatingScope && <Loader className="h-3.5 w-3.5 text-emerald-400 animate-spin" />}
                    {isSavedScope && <CheckCircle className="h-3.5 w-3.5 text-emerald-400" />}
                  </div>

                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}

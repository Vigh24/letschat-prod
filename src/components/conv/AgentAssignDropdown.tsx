import { useState } from 'react';
import { UserPlus } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/Avatar';

export function AgentAssignDropdown({ agents, currentAssignedId, onAssign }: {
  agents: any[]; currentAssignedId: string | null | undefined; onAssign: (agentId: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const assignedAgent = agents.find(a => a.id === currentAssignedId);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-lg border border-white/[0.06] hover:border-emerald-500/30 bg-white/[0.02] hover:bg-emerald-500/5 px-2 py-1.5 transition-all duration-200 text-[11px] font-medium text-slate-600 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200"
      >
        {assignedAgent ? (
          <div className="flex items-center gap-1.5">
            <Avatar size="sm">
              <AvatarFallback>{assignedAgent.full_name.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
            <span className="truncate max-w-[80px]">{assignedAgent.full_name}</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            <UserPlus className="h-3 w-3" />
            <span>Assign</span>
          </div>
        )}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full z-20 mt-1 w-56 rounded-xl border border-white/[0.08] bg-zinc-900/95 backdrop-blur-xl p-1.5 shadow-2xl max-h-72 overflow-y-auto">
            <p className="px-2.5 py-1.5 text-[9px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-500">Available Agents</p>
            {agents.map(agent => (
              <button
                key={agent.id}
                onClick={() => { onAssign(agent.id); setOpen(false); }}
                className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-[11px] transition-all ${
                  agent.id === currentAssignedId
                    ? 'bg-emerald-500/15 text-emerald-400 font-bold'
                    : 'text-slate-400 hover:bg-white/[0.04] hover:text-zinc-200'
                }`}
              >
                <Avatar size="sm">
                  <AvatarFallback>{agent.full_name.charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
                <span>{agent.full_name}</span>
              </button>
            ))}
            {currentAssignedId && (
              <div className="border-t border-white/[0.06] mt-1 pt-1">
                <button
                  onClick={() => { onAssign(null); setOpen(false); }}
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-[11px] text-red-400 hover:bg-red-500/5 transition-all"
                >
                  Unassign Ticket
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

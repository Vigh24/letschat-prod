import { useState, useRef, useEffect } from 'react';
import { Tag, Plus, X, Loader2 } from 'lucide-react';
import type { Tag as TagType } from '../types';

export function TagPicker({
  tags,
  selectedTagIds,
  onToggle,
  onCreate,
}: {
  tags: TagType[];
  selectedTagIds: string[];
  onToggle: (tagId: string) => void;
  onCreate?: (name: string, color: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState('#6366f1');
  const [creating, setCreating] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleCreate = async () => {
    if (!newName.trim() || !onCreate) return;
    setCreating(true);
    await onCreate(newName.trim(), newColor);
    setNewName('');
    setCreating(false);
  };

  const colors = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#ef4444', '#84cc16', '#14b8a6', '#8b5cf6'];

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 rounded-lg border theme-border theme-bg-hover px-2 py-1 text-[10px] font-semibold theme-text-muted hover:theme-text-secondary hover:theme-bg-active transition-colors cursor-pointer"
      >
        <Tag className="h-3 w-3" />
        Tags
        {selectedTagIds.length > 0 && (
          <span className="ml-0.5 rounded-full bg-emerald-500/20 text-emerald-400 px-1.5 text-[8px] font-bold">{selectedTagIds.length}</span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 w-56 rounded-xl border theme-border theme-bg-panel shadow-2xl p-3 animate-scale-in origin-top-right">
          <p className="text-[9px] font-bold uppercase tracking-wider theme-text-muted mb-2">Labels</p>

          <div className="space-y-1 max-h-48 overflow-y-auto">
            {tags.length === 0 && (
              <p className="text-[10px] theme-text-muted py-2 text-center">No tags yet. Create one below.</p>
            )}
            {tags.map(tag => {
              const selected = selectedTagIds.includes(tag.id);
              return (
                <button
                  key={tag.id}
                  onClick={() => onToggle(tag.id)}
                  className={`w-full flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-[11px] transition-all cursor-pointer ${
                    selected ? 'theme-bg-active theme-text-main' : 'theme-text-muted hover:theme-text-secondary hover:theme-bg-hover'
                  }`}
                >
                  <div
                    className={`h-4 w-4 rounded border flex items-center justify-center transition-all ${
                      selected ? 'border-transparent' : 'theme-border'
                    }`}
                    style={selected ? { backgroundColor: tag.color } : {}}
                  >
                    {selected && <X className="h-2.5 w-2.5 text-white" />}
                  </div>
                  <span style={{ color: tag.color }}>●</span>
                  {tag.name}
                </button>
              );
            })}
          </div>

          {onCreate && (
            <div className="mt-3 pt-3 border-t theme-border space-y-2">
              <div className="flex items-center gap-1.5">
                <input
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleCreate()}
                  placeholder="New tag name..."
                  className="flex-1 rounded-lg border theme-border theme-bg-hover px-2.5 py-1.5 text-[10px] theme-text-secondary placeholder:text-slate-600 focus:border-emerald-500/30 focus:outline-none"
                />
                <button
                  onClick={handleCreate}
                  disabled={!newName.trim() || creating}
                  className="rounded-lg bg-emerald-500 hover:bg-emerald-600 text-slate-900 p-1.5 disabled:opacity-30 transition-all cursor-pointer"
                >
                  {creating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                </button>
              </div>
              <div className="flex items-center gap-1">
                {colors.map(c => (
                  <button
                    key={c}
                    onClick={() => setNewColor(c)}
                    className={`h-4 w-4 rounded-full border transition-all cursor-pointer ${
                      newColor === c ? 'border-zinc-300 dark:border-white ring-1 ring-black/10 dark:ring-white/30 scale-110' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

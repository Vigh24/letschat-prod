import { X } from 'lucide-react';
import type { Tag } from '@/types';

export function TagBadge({ tag, onRemove }: { tag: Tag; onRemove?: () => void }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-semibold"
      style={{ backgroundColor: `${tag.color}15`, color: tag.color, borderColor: `${tag.color}30`, borderWidth: 1 }}
    >
      {tag.name}
      {onRemove && (
        <button onClick={onRemove} className="hover:opacity-70 transition-opacity cursor-pointer" style={{ color: tag.color }}>
          <X className="h-2.5 w-2.5" />
        </button>
      )}
    </span>
  );
}

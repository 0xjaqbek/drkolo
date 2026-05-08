import { useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight, Plus } from 'lucide-react';
import { PhotoGallery } from '@/components/PhotoGallery';
import { UpdateSheet } from '@/components/UpdateSheet';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import type { ZlecenieItem, ZlecenieUpdate } from '@/lib/types';

interface ChecklistItemProps {
  item: ZlecenieItem;
  updates: ZlecenieUpdate[];
  isEditing: boolean;
  onToggle: (isDone: boolean) => void;
  onAddUpdate: (note: string, photos: File[]) => Promise<void>;
}

export function ChecklistItem({
  item,
  updates,
  isEditing,
  onToggle,
  onAddUpdate,
}: ChecklistItemProps) {
  const [expanded, setExpanded] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <div
      className={`border rounded-lg p-3 ${item.is_done ? 'bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800' : 'bg-card border-border'}`}
    >
      <div className="flex items-center gap-3">
        {isEditing ? (
          <Checkbox
            checked={item.is_done}
            onCheckedChange={checked => onToggle(checked as boolean)}
          />
        ) : (
          <div
            className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 ${
              item.is_done ? 'bg-green-500 border-green-500' : 'border-muted-foreground/40'
            }`}
          >
            {item.is_done && <span className="text-white text-xs leading-none">✓</span>}
          </div>
        )}

        <span
          className={`flex-1 text-sm ${item.is_done ? 'line-through text-muted-foreground' : ''}`}
        >
          {item.label}
        </span>

        {updates.length > 0 && (
          <button
            className="text-muted-foreground p-1"
            onClick={() => setExpanded(e => !e)}
            aria-label={expanded ? 'Zwiń' : 'Rozwiń'}
          >
            {expanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>
        )}
      </div>

      {item.is_done && item.done_at && (
        <p className="text-xs text-muted-foreground mt-1 ml-8">
          Ukończono: {format(new Date(item.done_at), 'd MMM, HH:mm', { locale: pl })}
        </p>
      )}

      {expanded && (
        <div className="mt-3 ml-8 space-y-3">
          {updates.map(update => (
            <div key={update.id} className="text-sm">
              {update.note && <p className="text-foreground">{update.note}</p>}
              <PhotoGallery photos={update.update_photos} />
              <p className="text-xs text-muted-foreground mt-1">
                {format(new Date(update.created_at), 'd MMM, HH:mm', { locale: pl })}
              </p>
            </div>
          ))}
        </div>
      )}

      {isEditing && (
        <div className="mt-2 ml-8">
          <Button variant="ghost" size="sm" onClick={() => setSheetOpen(true)}>
            <Plus className="h-3 w-3 mr-1" />
            Dodaj aktualizację
          </Button>
          <UpdateSheet
            open={sheetOpen}
            onOpenChange={setSheetOpen}
            onSubmit={onAddUpdate}
            title={`Aktualizacja: ${item.label}`}
          />
        </div>
      )}
    </div>
  );
}

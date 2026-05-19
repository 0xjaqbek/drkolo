import { useState } from 'react';
import { useNoIndex } from "@/hooks/useNoIndex";
import { useParams } from 'react-router-dom';
import { useSession } from '@/hooks/useSession';
import { useZlecenie } from '@/hooks/useZlecenie';
import { useUpdateStatus, useToggleItem, useAddUpdate } from '@/hooks/useZlecenieActions';
import { StatusBadge } from '@/components/StatusBadge';
import { ChecklistItem } from '@/components/ChecklistItem';
import { UpdateSheet } from '@/components/UpdateSheet';
import { PhotoGallery } from '@/components/PhotoGallery';
import { SiteHeader } from '@/components/SiteHeader';
import { Button } from '@/components/ui/button';
import type { ZlecenieStatus } from '@/lib/types';

export default function ZlecenieView() {
  useNoIndex();
  const { hash } = useParams<{ hash: string }>();
  const { authenticated } = useSession();
  const [orderSheetOpen, setOrderSheetOpen] = useState(false);

  const { data, isLoading, error } = useZlecenie(hash!);
  const updateStatus = useUpdateStatus(hash!);
  const toggleItem = useToggleItem(hash!);
  const addUpdate = useAddUpdate(hash!, data?.zlecenie.id ?? '');

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Ładowanie...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-500">Nie znaleziono zlecenia.</p>
      </div>
    );
  }

  const { zlecenie, items, updates } = data;
  const orderUpdates = updates.filter(u => !u.item_id);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="max-w-2xl mx-auto p-4 pt-20 space-y-6 pb-12">
        <div>
          <h1 className="text-xl font-bold">{zlecenie.bike_model}</h1>
          <p className="text-sm text-muted-foreground font-mono">#{zlecenie.hash}</p>
        </div>

        <div className="space-y-1">
          <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
            {authenticated ? 'Status (kliknij aby zmienić)' : 'Status'}
          </p>
          <StatusBadge
            status={zlecenie.status as ZlecenieStatus}
            onStatusChange={authenticated ? s => updateStatus.mutate(s) : undefined}
          />
        </div>

        {zlecenie.status === 'gotowe' && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center text-green-700 font-medium dark:bg-green-950 dark:border-green-800 dark:text-green-300">
            Twój rower jest gotowy do odbioru!
          </div>
        )}

        {items.length > 0 && (
          <div className="space-y-3">
            <h2 className="font-semibold">Zakres prac</h2>
            {items.map(item => (
              <ChecklistItem
                key={item.id}
                item={item}
                updates={updates.filter(u => u.item_id === item.id)}
                isEditing={authenticated}
                onToggle={isDone => toggleItem.mutate({ itemId: item.id, isDone })}
                onAddUpdate={(note, photos) =>
                  addUpdate.mutateAsync({ item_id: item.id, note, photos })
                }
              />
            ))}
          </div>
        )}

        {orderUpdates.length > 0 && (
          <div className="space-y-3">
            <h2 className="font-semibold">Notatki ogólne</h2>
            {orderUpdates.map(update => (
              <div key={update.id} className="bg-muted rounded-lg p-3 text-sm space-y-2">
                {update.note && <p>{update.note}</p>}
                <PhotoGallery photos={update.update_photos} />
              </div>
            ))}
          </div>
        )}

        {authenticated && (
          <>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setOrderSheetOpen(true)}
            >
              Dodaj notatkę ogólną
            </Button>
            <UpdateSheet
              open={orderSheetOpen}
              onOpenChange={setOrderSheetOpen}
              onSubmit={(note, photos) =>
                addUpdate.mutateAsync({ item_id: null, note, photos })
              }
              title="Notatka ogólna"
            />
          </>
        )}
      </div>
    </div>
  );
}

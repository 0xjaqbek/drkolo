import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { generateHash } from '@/lib/utils';
import type { Zlecenie, ZlecenieStatus } from '@/lib/types';

interface CreateZlecenieInput {
  bike_model: string;
  customer_phone: string;
  items: string[];
}

export function useCreateZlecenie() {
  return useMutation({
    mutationFn: async ({ bike_model, customer_phone, items }: CreateZlecenieInput) => {
      const hash = generateHash();

      const { data: zlecenie, error: zErr } = await supabase
        .from('zlecenia')
        .insert({ hash, bike_model, customer_phone, status: 'oczekuje' })
        .select()
        .single();
      if (zErr) throw zErr;

      if (items.length > 0) {
        const { error: iErr } = await supabase
          .from('zlecenie_items')
          .insert(items.map((label, idx) => ({ zlecenie_id: zlecenie.id, label, sort_order: idx })));
        if (iErr) throw iErr;
      }

      return zlecenie as Zlecenie;
    },
  });
}

export function useUpdateStatus(hash: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (status: ZlecenieStatus) => {
      const { error } = await supabase
        .from('zlecenia')
        .update({ status })
        .eq('hash', hash);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['zlecenie', hash] }),
  });
}

export function useToggleItem(hash: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ itemId, isDone }: { itemId: string; isDone: boolean }) => {
      const { error } = await supabase
        .from('zlecenie_items')
        .update({ is_done: isDone, done_at: isDone ? new Date().toISOString() : null })
        .eq('id', itemId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['zlecenie', hash] }),
  });
}

export function useAddUpdate(hash: string, zlecenie_id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      item_id,
      note,
      photos,
    }: {
      item_id: string | null;
      note: string;
      photos: File[];
    }) => {
      const { data: update, error: uErr } = await supabase
        .from('zlecenie_updates')
        .insert({ zlecenie_id, item_id: item_id ?? null, note: note.trim() || null })
        .select()
        .single();
      if (uErr) throw uErr;

      for (const photo of photos) {
        const ext = photo.name.split('.').pop() ?? 'jpg';
        const path = `${hash}/${update.id}/${crypto.randomUUID()}.${ext}`;
        const { error: sErr } = await supabase.storage
          .from('zlecenie-photos')
          .upload(path, photo);
        if (sErr) throw sErr;

        const { error: pErr } = await supabase
          .from('update_photos')
          .insert({ update_id: update.id, storage_path: path });
        if (pErr) throw pErr;
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['zlecenie', hash] }),
  });
}

export function useDeleteZlecenie() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('zlecenia')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['zlecenia_list'] }),
  });
}

interface UpdateZlecenieInput {
  id: string;
  bike_model: string;
  customer_phone: string;
  status: ZlecenieStatus;
}

export function useUpdateZlecenie() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, bike_model, customer_phone, status }: UpdateZlecenieInput) => {
      const { error } = await supabase
        .from('zlecenia')
        .update({ bike_model, customer_phone, status })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['zlecenia_list'] }),
  });
}

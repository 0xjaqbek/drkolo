import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { CatalogItem, Zlecenie, ZlecenieItem, ZlecenieUpdate } from '@/lib/types';

export function useZlecenie(hash: string) {
  return useQuery({
    queryKey: ['zlecenie', hash],
    queryFn: async () => {
      const { data: zlecenie, error: zErr } = await supabase
        .from('zlecenia')
        .select('*')
        .eq('hash', hash)
        .single();
      if (zErr) throw zErr;

      const { data: items, error: iErr } = await supabase
        .from('zlecenie_items')
        .select('*')
        .eq('zlecenie_id', zlecenie.id)
        .order('sort_order');
      if (iErr) throw iErr;

      const { data: updates, error: uErr } = await supabase
        .from('zlecenie_updates')
        .select('*, update_photos(*)')
        .eq('zlecenie_id', zlecenie.id)
        .order('created_at');
      if (uErr) throw uErr;

      return {
        zlecenie: zlecenie as Zlecenie,
        items: (items ?? []) as ZlecenieItem[],
        updates: (updates ?? []) as ZlecenieUpdate[],
      };
    },
    enabled: !!hash,
    refetchInterval: 30000,
  });
}

export function useCatalog() {
  return useQuery({
    queryKey: ['service_catalog'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('service_catalog')
        .select('*')
        .order('sort_order');
      if (error) throw error;

      const items = (data ?? []) as CatalogItem[];
      const packages = items
        .filter(i => i.is_package && !i.parent_id)
        .map(pkg => ({
          ...pkg,
          children: items
            .filter(c => c.parent_id === pkg.id)
            .sort((a, b) => a.sort_order - b.sort_order),
        }));
      const regular = items.filter(i => !i.is_package && !i.parent_id);

      return { regular, packages };
    },
  });
}

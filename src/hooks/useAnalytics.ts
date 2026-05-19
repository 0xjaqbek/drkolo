import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { PageView } from '@/lib/types';

export type AnalyticsRange = 7 | 30 | 'all';

export interface AnalyticsData {
  totalViews: number;
  uniqueSessions: number;
  topPage: string | null;
  byPage: { path: string; count: number }[];
  byDay: { date: string; count: number }[];
  byReferrer: { referrer: string; count: number }[];
}

export function useAnalytics(range: AnalyticsRange) {
  return useQuery({
    queryKey: ['analytics', range],
    queryFn: async (): Promise<AnalyticsData> => {
      let query = supabase
        .from('page_views')
        .select('*')
        .order('created_at', { ascending: true });

      if (range !== 'all') {
        const since = new Date();
        since.setDate(since.getDate() - range);
        since.setHours(0, 0, 0, 0);
        query = query.gte('created_at', since.toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;
      const rows = (data ?? []) as PageView[];

      const totalViews = rows.length;
      const uniqueSessions = new Set(rows.map((r) => r.session_id)).size;

      const pageMap = new Map<string, number>();
      for (const r of rows) {
        pageMap.set(r.path, (pageMap.get(r.path) ?? 0) + 1);
      }
      const byPage = Array.from(pageMap.entries())
        .map(([path, count]) => ({ path, count }))
        .sort((a, b) => b.count - a.count);

      const topPage = byPage[0]?.path ?? null;

      const dayMap = new Map<string, number>();
      for (const r of rows) {
        const day = r.created_at.slice(0, 10);
        dayMap.set(day, (dayMap.get(day) ?? 0) + 1);
      }
      const byDay = Array.from(dayMap.entries())
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date));

      const refMap = new Map<string, number>();
      for (const r of rows) {
        const ref = r.referrer ?? 'Direct';
        refMap.set(ref, (refMap.get(ref) ?? 0) + 1);
      }
      const byReferrer = Array.from(refMap.entries())
        .map(([referrer, count]) => ({ referrer, count }))
        .sort((a, b) => b.count - a.count);

      return { totalViews, uniqueSessions, topPage, byPage, byDay, byReferrer };
    },
  });
}

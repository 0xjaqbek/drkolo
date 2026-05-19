import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/lib/supabase';

const BOT_PATTERN = /bot|crawler|spider|googlebot|bingbot|slurp|duckduckbot|baidu|yandex/i;

function getSessionId(): string {
  const key = 'analytics_session_id';
  let id = sessionStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem(key, id);
  }
  return id;
}

export function usePageView() {
  const location = useLocation();
  const prevPath = useRef<string | null>(null);

  useEffect(() => {
    if (BOT_PATTERN.test(navigator.userAgent)) return;
    if (prevPath.current === location.pathname) return;
    prevPath.current = location.pathname;

    const referrer = document.referrer
      ? new URL(document.referrer).hostname
      : null;

    supabase.from('page_views').insert({
      path: location.pathname,
      referrer,
      session_id: getSessionId(),
      user_agent: navigator.userAgent,
    }).then(({ error }) => {
      if (error) console.error('[analytics] insert failed:', error);
    });
  }, [location.pathname]);
}

# Analytics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add custom page-view analytics stored in Supabase with a password-protected `/analytics` dashboard.

**Architecture:** A `usePageView` hook fires on every route change and inserts a row into a `page_views` Supabase table. A `useAnalytics` hook fetches and aggregates that data client-side. The `/analytics` page displays the aggregated data behind a password gate identical to the existing `/kwestionariusz-odp` pattern.

**Tech Stack:** React, TypeScript, Supabase, @tanstack/react-query, recharts (via existing `ChartContainer`), Vitest + Testing Library

---

## File Map

| file | action |
|---|---|
| `supabase/migrations/007_page_views_schema.sql` | create |
| `src/lib/types.ts` | modify — add `PageView` interface |
| `src/hooks/usePageView.ts` | create |
| `src/hooks/useAnalytics.ts` | create |
| `src/pages/Analytics.tsx` | create |
| `src/test/Analytics.test.tsx` | create |
| `src/App.tsx` | modify — add route + call hook |

---

## Task 1: Database migration

**Files:**
- Create: `supabase/migrations/007_page_views_schema.sql`

- [ ] **Step 1: Create the migration file**

```sql
create table if not exists page_views (
  id         uuid        primary key default gen_random_uuid(),
  path       text        not null,
  referrer   text,
  session_id uuid        not null,
  user_agent text,
  created_at timestamptz not null default now()
);

alter table page_views enable row level security;

create policy "anon_insert_page_views" on page_views
  for insert with check (true);

create policy "anon_select_page_views" on page_views
  for select using (true);
```

- [ ] **Step 2: Apply the migration via Supabase dashboard or CLI**

```bash
# Option A — Supabase CLI
supabase db push

# Option B — paste SQL directly in Supabase Dashboard > SQL Editor
```

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/007_page_views_schema.sql
git commit -m "feat: add page_views table migration"
```

---

## Task 2: Add PageView type

**Files:**
- Modify: `src/lib/types.ts`

- [ ] **Step 1: Add the interface at the end of `src/lib/types.ts`**

```typescript
export interface PageView {
  id: string;
  path: string;
  referrer: string | null;
  session_id: string;
  user_agent: string | null;
  created_at: string;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/types.ts
git commit -m "feat: add PageView type"
```

---

## Task 3: usePageView hook (TDD)

**Files:**
- Create: `src/hooks/usePageView.ts`
- Test: `src/test/usePageView.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/test/usePageView.test.tsx`:

```typescript
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      insert: vi.fn(() => Promise.resolve({ error: null })),
    })),
  },
}));

import { supabase } from '@/lib/supabase';
const mockFrom = supabase.from as ReturnType<typeof vi.fn>;

import { usePageView } from '@/hooks/usePageView';

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient();
  return (
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="*" element={<>{children}</>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
  Object.defineProperty(navigator, 'userAgent', {
    value: 'Mozilla/5.0 (test)',
    configurable: true,
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('usePageView', () => {
  it('inserts a row on mount', () => {
    const mockInsert = vi.fn(() => Promise.resolve({ error: null }));
    mockFrom.mockReturnValue({ insert: mockInsert });

    renderHook(() => usePageView(), { wrapper });

    expect(mockFrom).toHaveBeenCalledWith('page_views');
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ path: '/' })
    );
  });

  it('skips insert for bot user agents', () => {
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Googlebot/2.1',
      configurable: true,
    });
    const mockInsert = vi.fn();
    mockFrom.mockReturnValue({ insert: mockInsert });

    renderHook(() => usePageView(), { wrapper });

    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('stores session_id in sessionStorage', () => {
    const mockInsert = vi.fn(() => Promise.resolve({ error: null }));
    mockFrom.mockReturnValue({ insert: mockInsert });

    renderHook(() => usePageView(), { wrapper });

    const stored = sessionStorage.getItem('analytics_session_id');
    expect(stored).not.toBeNull();
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ session_id: stored })
    );
  });

  it('reuses session_id on subsequent mounts', () => {
    const mockInsert = vi.fn(() => Promise.resolve({ error: null }));
    mockFrom.mockReturnValue({ insert: mockInsert });

    renderHook(() => usePageView(), { wrapper });
    const id1 = sessionStorage.getItem('analytics_session_id');

    vi.clearAllMocks();
    mockFrom.mockReturnValue({ insert: mockInsert });
    renderHook(() => usePageView(), { wrapper });
    const id2 = sessionStorage.getItem('analytics_session_id');

    expect(id1).toBe(id2);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
bun run test src/test/usePageView.test.tsx
```

Expected: FAIL — `usePageView` not found

- [ ] **Step 3: Implement the hook**

Create `src/hooks/usePageView.ts`:

```typescript
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
    });
  }, [location.pathname]);
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
bun run test src/test/usePageView.test.tsx
```

Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/hooks/usePageView.ts src/test/usePageView.test.tsx
git commit -m "feat: add usePageView tracking hook"
```

---

## Task 4: useAnalytics hook (TDD)

**Files:**
- Create: `src/hooks/useAnalytics.ts`
- Test: `src/test/useAnalytics.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/test/useAnalytics.test.tsx`:

```typescript
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

import { supabase } from '@/lib/supabase';
const mockFrom = supabase.from as ReturnType<typeof vi.fn>;

import { useAnalytics } from '@/hooks/useAnalytics';

const MOCK_ROWS = [
  { id: '1', path: '/',       referrer: 'google.com', session_id: 'aaa', user_agent: 'UA', created_at: '2026-05-10T10:00:00Z' },
  { id: '2', path: '/cennik', referrer: null,          session_id: 'bbb', user_agent: 'UA', created_at: '2026-05-10T11:00:00Z' },
  { id: '3', path: '/',       referrer: 'google.com', session_id: 'aaa', user_agent: 'UA', created_at: '2026-05-11T10:00:00Z' },
  { id: '4', path: '/cennik', referrer: 'facebook.com', session_id: 'ccc', user_agent: 'UA', created_at: '2026-05-11T12:00:00Z' },
];

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

function mockSupabase(rows: typeof MOCK_ROWS) {
  const chain: Record<string, unknown> = {};
  const q = () => chain;
  chain.select = q; chain.order = q; chain.gte = q;
  chain.then = (resolve: (v: { data: typeof rows; error: null }) => void) =>
    Promise.resolve({ data: rows, error: null }).then(resolve);
  mockFrom.mockReturnValue(chain);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useAnalytics', () => {
  it('returns correct totalViews and uniqueSessions', async () => {
    mockSupabase(MOCK_ROWS);
    const { result } = renderHook(() => useAnalytics(30), { wrapper });
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data!.totalViews).toBe(4);
    expect(result.current.data!.uniqueSessions).toBe(3);
  });

  it('returns byPage sorted by count descending', async () => {
    mockSupabase(MOCK_ROWS);
    const { result } = renderHook(() => useAnalytics(30), { wrapper });
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data!.byPage[0]).toEqual({ path: '/', count: 2 });
    expect(result.current.data!.byPage[1]).toEqual({ path: '/cennik', count: 2 });
  });

  it('returns topPage as most-visited path', async () => {
    mockSupabase(MOCK_ROWS);
    const { result } = renderHook(() => useAnalytics(30), { wrapper });
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data!.topPage).toBe('/');
  });

  it('maps null referrer to "Direct"', async () => {
    mockSupabase(MOCK_ROWS);
    const { result } = renderHook(() => useAnalytics(30), { wrapper });
    await waitFor(() => expect(result.current.data).toBeDefined());
    const refs = result.current.data!.byReferrer.map(r => r.referrer);
    expect(refs).toContain('Direct');
    expect(refs).toContain('google.com');
  });

  it('groups views by day', async () => {
    mockSupabase(MOCK_ROWS);
    const { result } = renderHook(() => useAnalytics(30), { wrapper });
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data!.byDay).toEqual([
      { date: '2026-05-10', count: 2 },
      { date: '2026-05-11', count: 2 },
    ]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
bun run test src/test/useAnalytics.test.tsx
```

Expected: FAIL — `useAnalytics` not found

- [ ] **Step 3: Implement the hook**

Create `src/hooks/useAnalytics.ts`:

```typescript
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
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
bun run test src/test/useAnalytics.test.tsx
```

Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useAnalytics.ts src/test/useAnalytics.test.tsx
git commit -m "feat: add useAnalytics aggregation hook"
```

---

## Task 5: Analytics page (TDD)

**Files:**
- Create: `src/pages/Analytics.tsx`
- Create: `src/test/Analytics.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/test/Analytics.test.tsx`:

```typescript
import { screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderWithProviders } from './test-utils';

vi.mock('@/hooks/useAnalytics', () => ({
  useAnalytics: vi.fn(),
}));

import { useAnalytics } from '@/hooks/useAnalytics';
const mockUseAnalytics = useAnalytics as ReturnType<typeof vi.fn>;

import Analytics from '@/pages/Analytics';

const CORRECT_PASSWORD = 'testpass';

const MOCK_DATA = {
  totalViews: 42,
  uniqueSessions: 17,
  topPage: '/cennik',
  byPage: [{ path: '/cennik', count: 20 }, { path: '/', count: 22 }],
  byDay: [{ date: '2026-05-10', count: 10 }],
  byReferrer: [{ referrer: 'google.com', count: 30 }, { referrer: 'Direct', count: 12 }],
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('VITE_CREATION_PASSWORD', CORRECT_PASSWORD);
  mockUseAnalytics.mockReturnValue({ data: MOCK_DATA, isLoading: false });
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('Analytics', () => {
  it('shows password gate on mount', () => {
    renderWithProviders(<Analytics />);
    expect(screen.getByPlaceholderText('Hasło')).toBeInTheDocument();
  });

  it('shows error on wrong password', () => {
    renderWithProviders(<Analytics />);
    fireEvent.change(screen.getByPlaceholderText('Hasło'), { target: { value: 'wrong' } });
    fireEvent.click(screen.getByText('Wejdź'));
    expect(screen.getByText('Nieprawidłowe hasło')).toBeInTheDocument();
  });

  it('shows dashboard after correct password', () => {
    renderWithProviders(<Analytics />);
    fireEvent.change(screen.getByPlaceholderText('Hasło'), { target: { value: CORRECT_PASSWORD } });
    fireEvent.click(screen.getByText('Wejdź'));
    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByText('17')).toBeInTheDocument();
    expect(screen.getByText('/cennik')).toBeInTheDocument();
  });

  it('shows range buttons after login', () => {
    renderWithProviders(<Analytics />);
    fireEvent.change(screen.getByPlaceholderText('Hasło'), { target: { value: CORRECT_PASSWORD } });
    fireEvent.click(screen.getByText('Wejdź'));
    expect(screen.getByText('7 dni')).toBeInTheDocument();
    expect(screen.getByText('30 dni')).toBeInTheDocument();
    expect(screen.getByText('Wszystko')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    mockUseAnalytics.mockReturnValue({ data: undefined, isLoading: true });
    renderWithProviders(<Analytics />);
    fireEvent.change(screen.getByPlaceholderText('Hasło'), { target: { value: CORRECT_PASSWORD } });
    fireEvent.click(screen.getByText('Wejdź'));
    expect(screen.getByText('Ładowanie…')).toBeInTheDocument();
  });

  it('shows referrer data after login', () => {
    renderWithProviders(<Analytics />);
    fireEvent.change(screen.getByPlaceholderText('Hasło'), { target: { value: CORRECT_PASSWORD } });
    fireEvent.click(screen.getByText('Wejdź'));
    expect(screen.getByText('google.com')).toBeInTheDocument();
    expect(screen.getByText('Direct')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
bun run test src/test/Analytics.test.tsx
```

Expected: FAIL — `Analytics` not found

- [ ] **Step 3: Implement the page**

Create `src/pages/Analytics.tsx`:

```tsx
import { useState } from 'react';
import { SiteHeader } from '@/components/SiteHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAnalytics, type AnalyticsRange } from '@/hooks/useAnalytics';
import { ChartContainer } from '@/components/ui/chart';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

const RANGE_OPTIONS: { label: string; value: AnalyticsRange }[] = [
  { label: '7 dni', value: 7 },
  { label: '30 dni', value: 30 },
  { label: 'Wszystko', value: 'all' },
];

export default function Analytics() {
  const [password, setPassword] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [authError, setAuthError] = useState(false);
  const [range, setRange] = useState<AnalyticsRange>(30);

  const { data, isLoading } = useAnalytics(range);

  const handleLogin = () => {
    if (password === import.meta.env.VITE_CREATION_PASSWORD) {
      setAuthenticated(true);
      setAuthError(false);
    } else {
      setAuthError(true);
    }
  };

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <SiteHeader />
        <main className="pt-16 flex items-center justify-center min-h-screen">
          <div className="w-full max-w-sm space-y-4 p-8">
            <h1 className="font-display font-bold text-2xl">Analityka</h1>
            <Input
              type="password"
              placeholder="Hasło"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
            />
            {authError && (
              <p className="text-sm text-destructive">Nieprawidłowe hasło</p>
            )}
            <Button onClick={handleLogin} className="w-full">
              Wejdź
            </Button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main className="pt-16">
        <div className="container max-w-4xl py-12 space-y-10">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <h1 className="font-display font-bold text-3xl">Analityka</h1>
            <div className="flex gap-2">
              {RANGE_OPTIONS.map((opt) => (
                <Button
                  key={opt.label}
                  variant={range === opt.value ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setRange(opt.value)}
                >
                  {opt.label}
                </Button>
              ))}
            </div>
          </div>

          {isLoading ? (
            <p className="text-muted-foreground">Ładowanie…</p>
          ) : !data ? null : (
            <>
              <div className="grid grid-cols-3 gap-4">
                <div className="border border-border p-6 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Odsłony</p>
                  <p className="text-3xl font-bold font-display">{data.totalViews}</p>
                </div>
                <div className="border border-border p-6 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Unikalne sesje</p>
                  <p className="text-3xl font-bold font-display">{data.uniqueSessions}</p>
                </div>
                <div className="border border-border p-6 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Top strona</p>
                  <p className="text-xl font-bold font-display truncate">{data.topPage ?? '—'}</p>
                </div>
              </div>

              {data.byDay.length > 0 && (
                <div>
                  <h2 className="font-display font-semibold text-lg mb-4">Odsłony dziennie</h2>
                  <ChartContainer config={{ views: { label: 'Odsłony', color: 'hsl(var(--accent))' } }}>
                    <LineChart data={data.byDay}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Line type="monotone" dataKey="count" stroke="hsl(var(--accent))" dot={false} name="Odsłony" />
                    </LineChart>
                  </ChartContainer>
                </div>
              )}

              {data.byPage.length > 0 && (
                <div>
                  <h2 className="font-display font-semibold text-lg mb-4">Odsłony wg strony</h2>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-muted-foreground">
                        <th className="pb-2 font-medium">Strona</th>
                        <th className="pb-2 font-medium text-right">Odsłony</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.byPage.map((row) => (
                        <tr key={row.path} className="border-b border-border/40 hover:bg-secondary/20">
                          <td className="py-2.5 font-mono text-xs">{row.path}</td>
                          <td className="py-2.5 text-right font-medium">{row.count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {data.byReferrer.length > 0 && (
                <div>
                  <h2 className="font-display font-semibold text-lg mb-4">Źródła ruchu</h2>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-muted-foreground">
                        <th className="pb-2 font-medium">Źródło</th>
                        <th className="pb-2 font-medium text-right">Odsłony</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.byReferrer.map((row) => (
                        <tr key={row.referrer} className="border-b border-border/40 hover:bg-secondary/20">
                          <td className="py-2.5">{row.referrer}</td>
                          <td className="py-2.5 text-right font-medium">{row.count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
bun run test src/test/Analytics.test.tsx
```

Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
git add src/pages/Analytics.tsx src/test/Analytics.test.tsx
git commit -m "feat: add Analytics admin page"
```

---

## Task 6: Wire up App.tsx

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Add import, route, and hook call to `src/App.tsx`**

Add import at the top (after existing imports):
```typescript
import Analytics from "./pages/Analytics.tsx";
import { usePageView } from "./hooks/usePageView.ts";
```

Add a wrapper component that calls the hook inside the router:
```tsx
const AppRoutes = () => {
  usePageView();
  return (
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/cennik" element={<Cennik />} />
      <Route path="/zlecenie" element={<CreateZlecenie />} />
      <Route path="/zlecenie/:hash" element={<ZlecenieView />} />
      <Route path="/rezerwacja" element={<Rezerwacja />} />
      <Route path="/kalendarz" element={<KalendarzAdmin />} />
      <Route path="/chat-admin" element={<ChatAdmin />} />
      <Route path="/kwestionariusz" element={<Kwestionariusz />} />
      <Route path="/kwestionariusz-odp" element={<KwestionariuszOdp />} />
      <Route path="/analytics" element={<Analytics />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};
```

Replace the `<Routes>...</Routes>` block inside `<BrowserRouter>` with `<AppRoutes />`.

- [ ] **Step 2: Run full test suite**

```bash
bun run test
```

Expected: all tests pass

- [ ] **Step 3: Commit**

```bash
git add src/App.tsx
git commit -m "feat: wire up analytics route and page view tracking"
```

---

## Task 7: Apply migration

- [ ] **Step 1: Apply migration to Supabase**

In the Supabase Dashboard → SQL Editor, run the contents of `supabase/migrations/007_page_views_schema.sql`.

Or via CLI:
```bash
supabase db push
```

- [ ] **Step 2: Verify table exists**

In Supabase Dashboard → Table Editor, confirm `page_views` table exists with the correct columns.

---

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

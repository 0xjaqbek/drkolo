import { useState } from 'react';
import { SiteHeader } from '@/components/SiteHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import {
  fetchAdminSessions,
  fetchAdminSession,
  deleteAdminSession,
  type AdminSession,
  type AdminSessionDetail,
} from '@/lib/chatApi';

export default function ChatAdmin() {
  const [password, setPassword] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [authError, setAuthError] = useState(false);
  const [sessions, setSessions] = useState<AdminSession[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedSession, setExpandedSession] = useState<AdminSessionDetail | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!password) return;
    setLoading(true);
    try {
      const data = await fetchAdminSessions(password);
      setSessions(data);
      setAuthenticated(true);
      setAuthError(false);
    } catch {
      setAuthError(true);
    } finally {
      setLoading(false);
    }
  };

  const handleExpand = async (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
      setExpandedSession(null);
      return;
    }
    setExpandedId(id);
    const detail = await fetchAdminSession(id, password);
    setExpandedSession(detail);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Usunąć tę rozmowę?')) return;
    await deleteAdminSession(id, password);
    setSessions((prev) => prev.filter((s) => s.id !== id));
    if (expandedId === id) {
      setExpandedId(null);
      setExpandedSession(null);
    }
  };

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <SiteHeader />
        <main className="pt-16 flex items-center justify-center min-h-screen">
          <div className="w-full max-w-sm space-y-4 p-8">
            <h1 className="font-display font-bold text-2xl">Rozmowy czatu</h1>
            <Input
              type="password"
              placeholder="Hasło administratora"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
            />
            {authError && (
              <p className="text-sm text-destructive">Nieprawidłowe hasło</p>
            )}
            <Button onClick={handleLogin} disabled={loading} className="w-full">
              {loading ? 'Logowanie...' : 'Zaloguj'}
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
        <div className="container py-12">
          <h1 className="font-display font-bold text-3xl mb-8">Rozmowy czatu</h1>
          {sessions.length === 0 && (
            <p className="text-muted-foreground">Brak rozmów.</p>
          )}
          <div className="space-y-3">
            {sessions.map((session) => (
              <div
                key={session.id}
                className="border border-border rounded-lg overflow-hidden"
              >
                <div className="flex items-center gap-4 p-4">
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-muted-foreground mb-1">
                      {new Date(session.created_at).toLocaleString('pl-PL')} ·{' '}
                      {session.message_count} wiadomości
                    </div>
                    <div className="text-sm truncate">{session.last_preview || '—'}</div>
                  </div>
                  <button
                    onClick={() => handleExpand(session.id)}
                    aria-label="Rozwiń rozmowę"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {expandedId === session.id ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </button>
                  <button
                    onClick={() => handleDelete(session.id)}
                    aria-label="Usuń rozmowę"
                    className="text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                {expandedId === session.id && expandedSession?.id === session.id && (
                  <div className="border-t border-border p-4 space-y-2 bg-secondary/30">
                    {expandedSession.messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[80%] px-3 py-2 rounded-lg text-sm ${
                            msg.role === 'user'
                              ? 'bg-accent text-accent-foreground'
                              : 'bg-card text-foreground'
                          }`}
                        >
                          {msg.content}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

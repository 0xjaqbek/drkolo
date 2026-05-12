import { useState } from 'react';
import { SiteHeader } from '@/components/SiteHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useFetchAllSurveys } from '@/hooks/useSurvey';
import { SURVEY_SECTIONS } from '@/lib/surveyQuestions';

export default function KwestionariuszOdp() {
  const [password, setPassword] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [authError, setAuthError] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: responses = [], isLoading } = useFetchAllSurveys();

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
            <h1 className="font-display font-bold text-2xl">Odpowiedzi kwestionariusza</h1>
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
        <div className="container max-w-3xl py-12">
          <h1 className="font-display font-bold text-3xl mb-8">Odpowiedzi kwestionariusza</h1>
          {isLoading ? (
            <p className="text-muted-foreground">Ładowanie…</p>
          ) : responses.length === 0 ? (
            <p className="text-muted-foreground">Brak odpowiedzi.</p>
          ) : (
            <div className="space-y-4">
              {responses.map((response) => {
                const name = response.answers.profil?.imie || 'Anonim';
                const isExpanded = expandedId === response.id;
                return (
                  <div key={response.id} className="border border-border rounded-lg overflow-hidden">
                    <button
                      className="w-full flex items-center justify-between p-4 text-left hover:bg-secondary/30 transition-colors"
                      onClick={() => setExpandedId(isExpanded ? null : response.id)}
                    >
                      <div>
                        <p className="font-medium">{name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {new Date(response.submitted_at).toLocaleString('pl-PL')}
                        </p>
                      </div>
                      <span className="text-muted-foreground text-sm">
                        {isExpanded ? '▲' : '▼'}
                      </span>
                    </button>

                    {isExpanded && (
                      <div className="border-t border-border p-6 space-y-8">
                        {SURVEY_SECTIONS.map((section) => {
                          const sectionAnswers = response.answers[section.key];
                          if (!sectionAnswers) return null;
                          return (
                            <div key={section.key} className="space-y-4">
                              <h3 className="font-semibold text-base border-b border-border pb-2">
                                {section.title}
                              </h3>
                              {section.questions.map((q) => {
                                const answer = sectionAnswers[q.key];
                                if (!answer) return null;
                                return (
                                  <div key={q.key} className="space-y-1">
                                    <p className="text-sm text-muted-foreground">{q.label}</p>
                                    <p className="text-sm whitespace-pre-wrap">{answer}</p>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

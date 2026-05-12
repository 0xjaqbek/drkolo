import { useState } from 'react';
import { SiteHeader } from '@/components/SiteHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useFetchAllSurveys } from '@/hooks/useSurvey';
import { SURVEY_SECTIONS } from '@/lib/surveyQuestions';
import type { SurveyRole, SurveyResponse } from '@/lib/types';

const ROLES: { value: SurveyRole; label: string }[] = [
  { value: 'wlasciciel', label: 'Właściciel' },
  { value: 'serwisant_1', label: 'Serwisant 1' },
  { value: 'serwisant_2', label: 'Serwisant 2' },
];

export default function KwestionariuszOdp() {
  const [password, setPassword] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [authError, setAuthError] = useState(false);

  const { data: responses = [], isLoading } = useFetchAllSurveys();

  const handleLogin = () => {
    if (password === import.meta.env.VITE_CREATION_PASSWORD) {
      setAuthenticated(true);
      setAuthError(false);
    } else {
      setAuthError(true);
    }
  };

  const getResponse = (role: SurveyRole): SurveyResponse | undefined =>
    responses.find((r) => r.role === role);

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
        <div className="container py-12">
          <h1 className="font-display font-bold text-3xl mb-8">Odpowiedzi kwestionariusza</h1>
          {isLoading ? (
            <p className="text-muted-foreground">Ładowanie…</p>
          ) : (
            <Tabs defaultValue="wlasciciel">
              <TabsList className="mb-8">
                {ROLES.map((r) => (
                  <TabsTrigger key={r.value} value={r.value}>
                    {r.label}
                    {!getResponse(r.value) && (
                      <span className="ml-2 text-xs text-muted-foreground">(brak)</span>
                    )}
                  </TabsTrigger>
                ))}
              </TabsList>

              {ROLES.map((r) => {
                const response = getResponse(r.value);
                return (
                  <TabsContent key={r.value} value={r.value}>
                    {!response ? (
                      <p className="text-muted-foreground">Nie wypełniono jeszcze.</p>
                    ) : (
                      <div className="space-y-10">
                        <p className="text-xs text-muted-foreground">
                          Wypełniono:{' '}
                          {new Date(response.submitted_at).toLocaleString('pl-PL')}
                        </p>
                        {SURVEY_SECTIONS.map((section) => {
                          const sectionAnswers = response.answers[section.key];
                          if (!sectionAnswers) return null;
                          return (
                            <div key={section.key} className="space-y-4">
                              <h3 className="font-semibold text-lg border-b border-border pb-2">
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
                  </TabsContent>
                );
              })}
            </Tabs>
          )}
        </div>
      </main>
    </div>
  );
}

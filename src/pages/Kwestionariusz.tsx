import { useState } from 'react';
import { useNoIndex } from "@/hooks/useNoIndex";
import { SiteHeader } from '@/components/SiteHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useSubmitSurvey } from '@/hooks/useSurvey';
import { SURVEY_SECTIONS } from '@/lib/surveyQuestions';
import type { SurveyAnswers } from '@/lib/types';

export default function Kwestionariusz() {
  useNoIndex();
  const [password, setPassword] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [authError, setAuthError] = useState(false);
  const [wizardStep, setWizardStep] = useState(0);
  const [answers, setAnswers] = useState<SurveyAnswers>({});

  const { mutate: submitSurvey, isPending, isSuccess } = useSubmitSurvey();

  const handleLogin = () => {
    if (password === import.meta.env.VITE_CREATION_PASSWORD) {
      setAuthenticated(true);
      setAuthError(false);
    } else {
      setAuthError(true);
    }
  };

  const handleAnswer = (sectionKey: string, questionKey: string, value: string) => {
    setAnswers((prev) => ({
      ...prev,
      [sectionKey]: { ...(prev[sectionKey] ?? {}), [questionKey]: value },
    }));
  };

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <SiteHeader />
        <main className="pt-16 flex items-center justify-center min-h-screen">
          <div className="w-full max-w-sm space-y-4 p-8">
            <h1 className="font-display font-bold text-2xl">Kwestionariusz Dr Koło</h1>
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

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <SiteHeader />
        <main className="pt-16 flex items-center justify-center min-h-screen">
          <div className="text-center space-y-4 p-8">
            <h2 className="font-display font-bold text-2xl">Dziękujemy!</h2>
            <p className="text-muted-foreground">
              Twoje odpowiedzi zostały zapisane. Pomogą nam lepiej obsługiwać klientów.
            </p>
          </div>
        </main>
      </div>
    );
  }

  const section = SURVEY_SECTIONS[wizardStep];
  const isLastStep = wizardStep === SURVEY_SECTIONS.length - 1;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main className="pt-16">
        <div className="container max-w-2xl py-12 space-y-8">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Krok {wizardStep + 1} z {SURVEY_SECTIONS.length}
            </p>
            <div className="w-full bg-secondary rounded-full h-2">
              <div
                className="bg-accent h-2 rounded-full transition-all"
                style={{ width: `${((wizardStep + 1) / SURVEY_SECTIONS.length) * 100}%` }}
              />
            </div>
          </div>

          <div className="space-y-6">
            <h2 className="font-display font-bold text-2xl">{section.title}</h2>
            {section.questions.map((q) => (
              <div key={q.key} className="space-y-2">
                <label className="text-sm font-medium leading-relaxed">{q.label}</label>
                {q.type === 'textarea' ? (
                  <Textarea
                    rows={4}
                    value={answers[section.key]?.[q.key] ?? ''}
                    onChange={(e) => handleAnswer(section.key, q.key, e.target.value)}
                    placeholder="Twoja odpowiedź…"
                  />
                ) : q.type === 'select' ? (
                  <div className="flex flex-wrap gap-2">
                    {q.options?.map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => handleAnswer(section.key, q.key, opt)}
                        className={`px-4 py-2 rounded-full border text-sm transition-colors ${
                          answers[section.key]?.[q.key] === opt
                            ? 'bg-accent text-accent-foreground border-accent'
                            : 'border-border hover:border-accent'
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                ) : (
                  <Input
                    value={answers[section.key]?.[q.key] ?? ''}
                    onChange={(e) => handleAnswer(section.key, q.key, e.target.value)}
                    placeholder="Twoja odpowiedź…"
                  />
                )}
              </div>
            ))}
          </div>

          <div className="flex justify-between pt-4">
            <Button
              variant="outline"
              onClick={() => setWizardStep((s) => s - 1)}
              disabled={wizardStep === 0}
            >
              Wstecz
            </Button>
            {isLastStep ? (
              <Button onClick={() => submitSurvey({ answers })} disabled={isPending}>
                {isPending ? 'Wysyłanie…' : 'Wyślij'}
              </Button>
            ) : (
              <Button onClick={() => setWizardStep((s) => s + 1)}>Dalej</Button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

# Kwestionariusz Wiedzy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a password-protected multi-step questionnaire wizard at `/kwestionariusz` for 3 roles (owner + 2 mechanics) with an admin responses view at `/kwestionariusz-odp`, storing answers in Supabase.

**Architecture:** React wizard with 8 steps stored locally in state, single INSERT on submit, unique DB constraint prevents re-submission. Admin view reads all 3 role responses and displays them in tabs. Password validated client-side against `VITE_CREATION_PASSWORD` (same env var as KalendarzAdmin).

**Tech Stack:** React, TypeScript, Tailwind, shadcn/ui, Supabase (direct client), React Query, Vitest + Testing Library.

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `supabase/migrations/006_survey_schema.sql` | Table + RLS |
| Modify | `src/lib/types.ts` | Add SurveyRole, SurveyAnswers, SurveyResponse types |
| Create | `src/lib/surveyQuestions.ts` | SURVEY_SECTIONS constant — all 8 sections with questions |
| Create | `src/hooks/useSurvey.ts` | useCheckRoleSubmitted, useSubmitSurvey, useFetchAllSurveys |
| Create | `src/test/useSurvey.test.ts` | Hook unit tests (supabase mocked) |
| Create | `src/pages/Kwestionariusz.tsx` | Wizard page: password → role → 8-step form → done |
| Create | `src/test/Kwestionariusz.test.tsx` | Page tests (useSurvey mocked) |
| Create | `src/pages/KwestionariuszOdp.tsx` | Admin responses page: password → 3-tab view |
| Create | `src/test/KwestionariuszOdp.test.tsx` | Page tests (useSurvey mocked) |
| Modify | `src/App.tsx` | Add 2 new routes |

---

## Task 1: Database Migration

**Files:**
- Create: `supabase/migrations/006_survey_schema.sql`

- [ ] **Step 1: Write the migration file**

```sql
create table if not exists survey_responses (
  id           uuid primary key default gen_random_uuid(),
  role         text not null check (role in ('wlasciciel', 'serwisant_1', 'serwisant_2')),
  answers      jsonb not null,
  submitted_at timestamptz not null default now()
);

create unique index if not exists survey_responses_role_idx
  on survey_responses(role);

alter table survey_responses enable row level security;

create policy "anon_insert_survey" on survey_responses
  for insert with check (true);

create policy "anon_select_survey" on survey_responses
  for select using (true);
```

- [ ] **Step 2: Apply migration in Supabase dashboard**

Open Supabase project → SQL Editor → paste and run the migration.
Expected: table `survey_responses` created with unique constraint on `role`.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/006_survey_schema.sql
git commit -m "feat: add survey_responses table with role unique constraint"
```

---

## Task 2: Types + Survey Questions

**Files:**
- Modify: `src/lib/types.ts`
- Create: `src/lib/surveyQuestions.ts`

- [ ] **Step 1: Add types to src/lib/types.ts**

Append at the end of the file:

```typescript
export type SurveyRole = 'wlasciciel' | 'serwisant_1' | 'serwisant_2';

export type SurveyAnswers = Record<string, Record<string, string>>;

export interface SurveyResponse {
  id: string;
  role: SurveyRole;
  answers: SurveyAnswers;
  submitted_at: string;
}
```

- [ ] **Step 2: Create src/lib/surveyQuestions.ts**

```typescript
export type QuestionType = 'text' | 'textarea' | 'select';

export interface SurveyQuestion {
  key: string;
  label: string;
  type: QuestionType;
  options?: string[];
}

export interface SurveySection {
  title: string;
  key: string;
  questions: SurveyQuestion[];
}

export const SURVEY_SECTIONS: SurveySection[] = [
  {
    title: 'Profil',
    key: 'profil',
    questions: [
      { key: 'imie', label: 'Imię lub pseudonim (opcjonalne)', type: 'text' },
      { key: 'lata_w_branzy', label: 'Ile lat pracujesz w branży rowerowej?', type: 'text' },
      { key: 'dlaczego_rowery', label: 'Co sprawiło, że zacząłeś/aś pracować z rowerami?', type: 'textarea' },
    ],
  },
  {
    title: 'Historia z Dr Koło',
    key: 'historia',
    questions: [
      { key: 'jak_trafil', label: 'Kiedy i jak trafiłeś/aś do serwisu Dr Koło?', type: 'textarea' },
      { key: 'zaskoczenie', label: 'Co cię zaskoczyło na początku pracy tutaj?', type: 'textarea' },
      { key: 'najciekawsze_zlecenie', label: 'Jakie zlecenie najbardziej zapamiętałeś/aś i dlaczego?', type: 'textarea' },
      { key: 'co_sie_zmienilo', label: 'Co się zmieniło w serwisie od kiedy tu pracujesz?', type: 'textarea' },
    ],
  },
  {
    title: 'Warsztat — przestrzeń i klimat',
    key: 'warsztat',
    questions: [
      { key: 'opis_warsztatu', label: 'Jak opisałbyś/aś warsztat Dr Koło komuś kto nigdy tu nie był?', type: 'textarea' },
      { key: 'duma', label: 'Z czego jesteś najbardziej dumny/a jeśli chodzi o wyposażenie lub organizację warsztatu?', type: 'textarea' },
      { key: 'co_dodalbys', label: 'Co byś dodał/a lub zmienił/a gdybyś mógł/mogła?', type: 'textarea' },
      { key: 'typowy_dzien', label: 'Jak wygląda twój typowy dzień pracy?', type: 'textarea' },
    ],
  },
  {
    title: 'Narzędzia i sprzęt',
    key: 'narzedzia',
    questions: [
      { key: 'ulubione_narzedzie', label: 'Jakie jest twoje ulubione narzędzie i dlaczego?', type: 'textarea' },
      { key: 'nie_oddam', label: 'Którego narzędzia lub urządzenia nie oddałbyś/abyś za nic?', type: 'textarea' },
      { key: 'niezbednik', label: 'Co uważasz za absolutny niezbędnik każdego serwisanta?', type: 'textarea' },
      { key: 'marki_narzedzi', label: 'Których marek narzędzi używasz najchętniej?', type: 'text' },
    ],
  },
  {
    title: 'Naprawy i specjalizacja',
    key: 'naprawy',
    questions: [
      { key: 'co_lubisz_naprawiac', label: 'Co naprawiasz najchętniej i w czym czujesz się najlepiej?', type: 'textarea' },
      { key: 'z_czego_znany', label: 'Z czego jesteś znany/a wśród współpracowników?', type: 'textarea' },
      { key: 'czeste_usterki', label: 'Jakie usterki klienci przynoszą najczęściej?', type: 'textarea' },
      { key: 'pierwsza_naprawa', label: 'Jaką naprawę zrobiłeś/aś ostatnio po raz pierwszy?', type: 'textarea' },
    ],
  },
  {
    title: 'Twój rower',
    key: 'rower',
    questions: [
      { key: 'co_jezdzisz', label: 'Co jeździsz prywatnie? (marka, model, rok)', type: 'text' },
      { key: 'pierwsza_zmiana', label: 'Co jako pierwsze zmieniłeś/aś lub ulepszyłeś/aś w swoim rowerze?', type: 'textarea' },
      { key: 'konfiguracja', label: 'Jak skonfigurowałeś/aś swój rower (geometria, osprzęt)?', type: 'textarea' },
      { key: 'rower_marzen', label: 'Jaki jest twój rower marzeń?', type: 'text' },
    ],
  },
  {
    title: 'Styl jazdy i trasy',
    key: 'styl',
    questions: [
      {
        key: 'typ_jazdy',
        label: 'Jaki typ jazdy preferujesz?',
        type: 'select',
        options: ['MTB', 'Szosa', 'Gravel', 'Trekking', 'Inne'],
      },
      { key: 'czestotliwosc', label: 'Jak często jeździsz prywatnie?', type: 'text' },
      { key: 'ulubiona_trasa', label: 'Jaka jest twoja ulubiona trasa w okolicach Gdańska lub Kartuz?', type: 'textarea' },
      { key: 'z_kim', label: 'Z kim najchętniej jeździsz?', type: 'text' },
    ],
  },
  {
    title: 'Wiedza i filozofia',
    key: 'filozofia',
    questions: [
      { key: 'polecane_marki', label: 'Jakie marki rowerów polecasz klientom i dlaczego?', type: 'textarea' },
      { key: 'polecane_komponenty', label: 'Jakie komponenty lub akcesoria polecasz najczęściej?', type: 'textarea' },
      { key: 'najwazniejsze', label: 'Co uważasz za najważniejszą rzecz w serwisowaniu roweru?', type: 'textarea' },
      { key: 'zdanie_dla_klienta', label: 'Jedno zdanie które chciałbyś/abyś powiedzieć każdemu nowemu klientowi Dr Koło.', type: 'textarea' },
    ],
  },
];
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/types.ts src/lib/surveyQuestions.ts
git commit -m "feat: add survey types and questions constants"
```

---

## Task 3: useSurvey Hook (TDD)

**Files:**
- Create: `src/hooks/useSurvey.ts`
- Create: `src/test/useSurvey.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/test/useSurvey.test.ts`:

```typescript
import { renderHook, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { createTestQueryClient } from './test-utils';
import { QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

import { supabase } from '@/lib/supabase';
const mockFrom = supabase.from as ReturnType<typeof vi.fn>;

import {
  useCheckRoleSubmitted,
  useSubmitSurvey,
  useFetchAllSurveys,
} from '@/hooks/useSurvey';

function wrapper({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={createTestQueryClient()}>
      {children}
    </QueryClientProvider>
  );
}

beforeEach(() => vi.clearAllMocks());

describe('useCheckRoleSubmitted', () => {
  it('returns true when role already has a response', async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'abc' }, error: null }),
    });

    const { result } = renderHook(() => useCheckRoleSubmitted('wlasciciel'), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBe(true);
  });

  it('returns false when role has no response', async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    });

    const { result } = renderHook(() => useCheckRoleSubmitted('serwisant_1'), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBe(false);
  });

  it('is disabled when role is null', () => {
    const { result } = renderHook(() => useCheckRoleSubmitted(null), { wrapper });
    expect(result.current.fetchStatus).toBe('idle');
  });
});

describe('useSubmitSurvey', () => {
  it('calls supabase insert with role and answers', async () => {
    const mockInsert = vi.fn().mockResolvedValue({ error: null });
    mockFrom.mockReturnValue({ insert: mockInsert });

    const { result } = renderHook(() => useSubmitSurvey(), { wrapper });

    result.current.mutate({
      role: 'wlasciciel',
      answers: { profil: { imie: 'Janek' } },
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockInsert).toHaveBeenCalledWith({
      role: 'wlasciciel',
      answers: { profil: { imie: 'Janek' } },
    });
  });
});

describe('useFetchAllSurveys', () => {
  it('returns all survey responses', async () => {
    const mockData = [
      { id: '1', role: 'wlasciciel', answers: {}, submitted_at: '2026-05-12T10:00:00Z' },
    ];
    mockFrom.mockReturnValue({
      select: vi.fn().mockResolvedValue({ data: mockData, error: null }),
    });

    const { result } = renderHook(() => useFetchAllSurveys(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockData);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd D:/drkolo && npx vitest run src/test/useSurvey.test.ts
```

Expected: FAIL — module `@/hooks/useSurvey` not found.

- [ ] **Step 3: Implement useSurvey.ts**

Create `src/hooks/useSurvey.ts`:

```typescript
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { SurveyRole, SurveyAnswers, SurveyResponse } from '@/lib/types';

export function useCheckRoleSubmitted(role: SurveyRole | null) {
  return useQuery({
    queryKey: ['survey_check', role],
    enabled: !!role,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('survey_responses')
        .select('id')
        .eq('role', role as string)
        .maybeSingle();
      if (error) throw error;
      return !!data;
    },
  });
}

export function useSubmitSurvey() {
  return useMutation({
    mutationFn: async ({
      role,
      answers,
    }: {
      role: SurveyRole;
      answers: SurveyAnswers;
    }) => {
      const { error } = await supabase
        .from('survey_responses')
        .insert({ role, answers });
      if (error) throw error;
    },
  });
}

export function useFetchAllSurveys() {
  return useQuery({
    queryKey: ['survey_all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('survey_responses')
        .select('*');
      if (error) throw error;
      return (data ?? []) as SurveyResponse[];
    },
  });
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd D:/drkolo && npx vitest run src/test/useSurvey.test.ts
```

Expected: PASS — 5 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useSurvey.ts src/test/useSurvey.test.ts
git commit -m "feat: add useSurvey hook with tests"
```

---

## Task 4: Kwestionariusz Page (TDD)

**Files:**
- Create: `src/test/Kwestionariusz.test.tsx`
- Create: `src/pages/Kwestionariusz.tsx`

- [ ] **Step 1: Write failing tests**

Create `src/test/Kwestionariusz.test.tsx`:

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderWithProviders } from './test-utils';

vi.mock('@/hooks/useSurvey', () => ({
  useCheckRoleSubmitted: vi.fn(),
  useSubmitSurvey: vi.fn(),
}));

import { useCheckRoleSubmitted, useSubmitSurvey } from '@/hooks/useSurvey';
const mockCheckRole = useCheckRoleSubmitted as ReturnType<typeof vi.fn>;
const mockSubmit = useSubmitSurvey as ReturnType<typeof vi.fn>;

import Kwestionariusz from '@/pages/Kwestionariusz';

const CORRECT_PASSWORD = 'testpass';

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('VITE_CREATION_PASSWORD', CORRECT_PASSWORD);
  mockCheckRole.mockReturnValue({ data: false, isLoading: false, isSuccess: true });
  mockSubmit.mockReturnValue({ mutate: vi.fn(), isPending: false, isSuccess: false });
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('Kwestionariusz', () => {
  it('shows password gate on mount', () => {
    renderWithProviders(<Kwestionariusz />);
    expect(screen.getByPlaceholderText('Hasło')).toBeInTheDocument();
    expect(screen.getByText('Wejdź')).toBeInTheDocument();
  });

  it('shows error on wrong password', () => {
    renderWithProviders(<Kwestionariusz />);
    fireEvent.change(screen.getByPlaceholderText('Hasło'), {
      target: { value: 'wrong' },
    });
    fireEvent.click(screen.getByText('Wejdź'));
    expect(screen.getByText('Nieprawidłowe hasło')).toBeInTheDocument();
  });

  it('shows role selection after correct password', () => {
    renderWithProviders(<Kwestionariusz />);
    fireEvent.change(screen.getByPlaceholderText('Hasło'), {
      target: { value: CORRECT_PASSWORD },
    });
    fireEvent.click(screen.getByText('Wejdź'));
    expect(screen.getByText('Właściciel')).toBeInTheDocument();
    expect(screen.getByText('Serwisant 1')).toBeInTheDocument();
    expect(screen.getByText('Serwisant 2')).toBeInTheDocument();
  });

  it('shows already-done message when role already submitted', () => {
    mockCheckRole.mockReturnValue({ data: true, isLoading: false, isSuccess: true });
    renderWithProviders(<Kwestionariusz />);
    fireEvent.change(screen.getByPlaceholderText('Hasło'), {
      target: { value: CORRECT_PASSWORD },
    });
    fireEvent.click(screen.getByText('Wejdź'));
    fireEvent.click(screen.getByText('Właściciel'));
    expect(screen.getByText(/już wypełniono/i)).toBeInTheDocument();
  });

  it('shows wizard step 1 when role not yet submitted', () => {
    renderWithProviders(<Kwestionariusz />);
    fireEvent.change(screen.getByPlaceholderText('Hasło'), {
      target: { value: CORRECT_PASSWORD },
    });
    fireEvent.click(screen.getByText('Wejdź'));
    fireEvent.click(screen.getByText('Właściciel'));
    expect(screen.getByText('Krok 1 z 8')).toBeInTheDocument();
    expect(screen.getByText('Profil')).toBeInTheDocument();
  });

  it('navigates to next step on Dalej click', () => {
    renderWithProviders(<Kwestionariusz />);
    fireEvent.change(screen.getByPlaceholderText('Hasło'), {
      target: { value: CORRECT_PASSWORD },
    });
    fireEvent.click(screen.getByText('Wejdź'));
    fireEvent.click(screen.getByText('Właściciel'));
    fireEvent.click(screen.getByText('Dalej'));
    expect(screen.getByText('Krok 2 z 8')).toBeInTheDocument();
  });

  it('navigates back on Wstecz click', () => {
    renderWithProviders(<Kwestionariusz />);
    fireEvent.change(screen.getByPlaceholderText('Hasło'), {
      target: { value: CORRECT_PASSWORD },
    });
    fireEvent.click(screen.getByText('Wejdź'));
    fireEvent.click(screen.getByText('Właściciel'));
    fireEvent.click(screen.getByText('Dalej'));
    fireEvent.click(screen.getByText('Wstecz'));
    expect(screen.getByText('Krok 1 z 8')).toBeInTheDocument();
  });

  it('calls mutate on Wyślij click on last step', async () => {
    const mockMutate = vi.fn();
    mockSubmit.mockReturnValue({ mutate: mockMutate, isPending: false, isSuccess: false });

    renderWithProviders(<Kwestionariusz />);
    fireEvent.change(screen.getByPlaceholderText('Hasło'), {
      target: { value: CORRECT_PASSWORD },
    });
    fireEvent.click(screen.getByText('Wejdź'));
    fireEvent.click(screen.getByText('Właściciel'));

    // Skip to last step
    for (let i = 0; i < 7; i++) {
      fireEvent.click(screen.getByText('Dalej'));
    }

    expect(screen.getByText('Wyślij')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Wyślij'));
    expect(mockMutate).toHaveBeenCalledWith(
      expect.objectContaining({ role: 'wlasciciel' })
    );
  });

  it('shows thank-you screen after successful submit', () => {
    mockSubmit.mockReturnValue({ mutate: vi.fn(), isPending: false, isSuccess: true });

    renderWithProviders(<Kwestionariusz />);
    fireEvent.change(screen.getByPlaceholderText('Hasło'), {
      target: { value: CORRECT_PASSWORD },
    });
    fireEvent.click(screen.getByText('Wejdź'));
    fireEvent.click(screen.getByText('Właściciel'));

    expect(screen.getByText(/dziękujemy/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd D:/drkolo && npx vitest run src/test/Kwestionariusz.test.tsx
```

Expected: FAIL — module `@/pages/Kwestionariusz` not found.

- [ ] **Step 3: Implement Kwestionariusz.tsx**

Create `src/pages/Kwestionariusz.tsx`:

```typescript
import { useState } from 'react';
import { SiteHeader } from '@/components/SiteHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useCheckRoleSubmitted, useSubmitSurvey } from '@/hooks/useSurvey';
import { SURVEY_SECTIONS } from '@/lib/surveyQuestions';
import type { SurveyRole, SurveyAnswers } from '@/lib/types';

const ROLES: { value: SurveyRole; label: string }[] = [
  { value: 'wlasciciel', label: 'Właściciel' },
  { value: 'serwisant_1', label: 'Serwisant 1' },
  { value: 'serwisant_2', label: 'Serwisant 2' },
];

export default function Kwestionariusz() {
  const [password, setPassword] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [authError, setAuthError] = useState(false);
  const [role, setRole] = useState<SurveyRole | null>(null);
  const [wizardStep, setWizardStep] = useState(0);
  const [answers, setAnswers] = useState<SurveyAnswers>({});

  const { data: alreadySubmitted, isLoading: checkLoading } = useCheckRoleSubmitted(role);
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

  const handleSubmit = () => {
    if (!role) return;
    submitSurvey({ role, answers });
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

  if (!role) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <SiteHeader />
        <main className="pt-16 flex items-center justify-center min-h-screen">
          <div className="w-full max-w-sm space-y-6 p-8">
            <h1 className="font-display font-bold text-2xl">Kim jesteś?</h1>
            <p className="text-muted-foreground text-sm">
              Wybierz swoją rolę aby rozpocząć kwestionariusz.
            </p>
            <div className="space-y-3">
              {ROLES.map((r) => (
                <Button
                  key={r.value}
                  variant="outline"
                  className="w-full"
                  onClick={() => setRole(r.value)}
                >
                  {r.label}
                </Button>
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (checkLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <SiteHeader />
        <main className="pt-16 flex items-center justify-center min-h-screen">
          <p className="text-muted-foreground">Sprawdzanie…</p>
        </main>
      </div>
    );
  }

  if (alreadySubmitted) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <SiteHeader />
        <main className="pt-16 flex items-center justify-center min-h-screen">
          <div className="text-center space-y-4 p-8">
            <h2 className="font-display font-bold text-2xl">Już wypełniono</h2>
            <p className="text-muted-foreground">
              Formularz dla tej roli został już wypełniony. Dziękujemy!
            </p>
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
          {/* Progress */}
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

          {/* Section */}
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

          {/* Navigation */}
          <div className="flex justify-between pt-4">
            <Button
              variant="outline"
              onClick={() => setWizardStep((s) => s - 1)}
              disabled={wizardStep === 0}
            >
              Wstecz
            </Button>
            {isLastStep ? (
              <Button onClick={handleSubmit} disabled={isPending}>
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
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd D:/drkolo && npx vitest run src/test/Kwestionariusz.test.tsx
```

Expected: PASS — 8 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/pages/Kwestionariusz.tsx src/test/Kwestionariusz.test.tsx
git commit -m "feat: add Kwestionariusz wizard page with tests"
```

---

## Task 5: KwestionariuszOdp Page (TDD)

**Files:**
- Create: `src/test/KwestionariuszOdp.test.tsx`
- Create: `src/pages/KwestionariuszOdp.tsx`

- [ ] **Step 1: Write failing tests**

Create `src/test/KwestionariuszOdp.test.tsx`:

```typescript
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderWithProviders } from './test-utils';

vi.mock('@/hooks/useSurvey', () => ({
  useFetchAllSurveys: vi.fn(),
}));

import { useFetchAllSurveys } from '@/hooks/useSurvey';
const mockFetch = useFetchAllSurveys as ReturnType<typeof vi.fn>;

import KwestionariuszOdp from '@/pages/KwestionariuszOdp';

const CORRECT_PASSWORD = 'testpass';

const MOCK_RESPONSE = {
  id: '1',
  role: 'wlasciciel',
  answers: {
    profil: { imie: 'Marek', lata_w_branzy: '10' },
  },
  submitted_at: '2026-05-12T10:00:00Z',
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('VITE_CREATION_PASSWORD', CORRECT_PASSWORD);
  mockFetch.mockReturnValue({ data: [], isLoading: false });
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('KwestionariuszOdp', () => {
  it('shows password gate on mount', () => {
    renderWithProviders(<KwestionariuszOdp />);
    expect(screen.getByPlaceholderText('Hasło')).toBeInTheDocument();
  });

  it('shows error on wrong password', () => {
    renderWithProviders(<KwestionariuszOdp />);
    fireEvent.change(screen.getByPlaceholderText('Hasło'), {
      target: { value: 'wrong' },
    });
    fireEvent.click(screen.getByText('Wejdź'));
    expect(screen.getByText('Nieprawidłowe hasło')).toBeInTheDocument();
  });

  it('shows 3 role tabs after correct password', () => {
    renderWithProviders(<KwestionariuszOdp />);
    fireEvent.change(screen.getByPlaceholderText('Hasło'), {
      target: { value: CORRECT_PASSWORD },
    });
    fireEvent.click(screen.getByText('Wejdź'));
    expect(screen.getByText('Właściciel')).toBeInTheDocument();
    expect(screen.getByText('Serwisant 1')).toBeInTheDocument();
    expect(screen.getByText('Serwisant 2')).toBeInTheDocument();
  });

  it('shows not-filled message when role has no response', () => {
    mockFetch.mockReturnValue({ data: [], isLoading: false });
    renderWithProviders(<KwestionariuszOdp />);
    fireEvent.change(screen.getByPlaceholderText('Hasło'), {
      target: { value: CORRECT_PASSWORD },
    });
    fireEvent.click(screen.getByText('Wejdź'));
    expect(screen.getByText(/nie wypełniono/i)).toBeInTheDocument();
  });

  it('shows answers when role has a response', () => {
    mockFetch.mockReturnValue({ data: [MOCK_RESPONSE], isLoading: false });
    renderWithProviders(<KwestionariuszOdp />);
    fireEvent.change(screen.getByPlaceholderText('Hasło'), {
      target: { value: CORRECT_PASSWORD },
    });
    fireEvent.click(screen.getByText('Wejdź'));
    expect(screen.getByText('Marek')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd D:/drkolo && npx vitest run src/test/KwestionariuszOdp.test.tsx
```

Expected: FAIL — module `@/pages/KwestionariuszOdp` not found.

- [ ] **Step 3: Implement KwestionariuszOdp.tsx**

Create `src/pages/KwestionariuszOdp.tsx`:

```typescript
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
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd D:/drkolo && npx vitest run src/test/KwestionariuszOdp.test.tsx
```

Expected: PASS — 5 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/pages/KwestionariuszOdp.tsx src/test/KwestionariuszOdp.test.tsx
git commit -m "feat: add KwestionariuszOdp admin view with tests"
```

---

## Task 6: Wire Up Routes in App.tsx

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Add imports and routes**

In `src/App.tsx`, add imports after line 13 (`import ChatAdmin`):

```typescript
import Kwestionariusz from "./pages/Kwestionariusz.tsx";
import KwestionariuszOdp from "./pages/KwestionariuszOdp.tsx";
```

After the `<Route path="/chat-admin" .../>` line, add:

```tsx
<Route path="/kwestionariusz" element={<Kwestionariusz />} />
<Route path="/kwestionariusz-odp" element={<KwestionariuszOdp />} />
```

- [ ] **Step 2: Run full test suite**

```bash
cd D:/drkolo && npx vitest run
```

Expected: All tests pass (no regressions).

- [ ] **Step 3: Commit**

```bash
git add src/App.tsx
git commit -m "feat: register /kwestionariusz and /kwestionariusz-odp routes"
```

---

## Self-Review

**Spec coverage check:**
- ✅ `/kwestionariusz` route — Task 4 + 6
- ✅ `/kwestionariusz-odp` route — Task 5 + 6
- ✅ Password gate (VITE_CREATION_PASSWORD) — Task 4 + 5
- ✅ 3 roles, role selection — Task 4
- ✅ One submission per role (unique DB constraint + alreadySubmitted check) — Task 1 + 4
- ✅ 8 wizard sections with all questions — Task 2
- ✅ Supabase storage — Task 1 + 3
- ✅ Admin tabs view, not-filled state — Task 5
- ✅ No delete/edit in admin view — Task 5

**Type consistency check:**
- `SurveyRole` defined in types.ts, used in useSurvey.ts, Kwestionariusz.tsx, KwestionariuszOdp.tsx — consistent ✅
- `SurveyAnswers` defined in types.ts, used as state type in Kwestionariusz and as hook parameter — consistent ✅
- `SurveyResponse` defined in types.ts, returned by `useFetchAllSurveys`, consumed in KwestionariuszOdp — consistent ✅
- `SURVEY_SECTIONS` from surveyQuestions.ts used in Kwestionariusz and KwestionariuszOdp — consistent ✅
- `useCheckRoleSubmitted`, `useSubmitSurvey`, `useFetchAllSurveys` — names consistent across hook, tests, and pages ✅

import { useEffect, useState } from 'react';
import { useNoIndex } from "@/hooks/useNoIndex";
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { TimelinePicker } from '@/components/TimelinePicker';
import { AppointmentCard } from '@/components/AppointmentCard';
import { WorkingHoursEditor } from '@/components/WorkingHoursEditor';
import { BlockedTimesEditor } from '@/components/BlockedTimesEditor';
import { useCalendarAdminSession } from '@/hooks/useSession';
import { ApiClientError } from '@/lib/calendarAdminApi';
import { 
  useWorkingHours, 
  useAppointmentsByDate, 
  useBlockedTimes, 
  useCreateAppointment,
  usePendingAppointments
} from '@/hooks/useAppointments';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar as CalendarIcon, Plus, Settings, LogOut } from 'lucide-react';
import { toast } from 'sonner';

export default function KalendarzAdmin() {
  useNoIndex();
  const {
    authenticated,
    error: sessionError,
    isLoading: sessionLoading,
    isRestoring,
    login,
    logout,
  } = useCalendarAdminSession();
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState(false);
  const sessionExpired = sessionError instanceof ApiClientError &&
    sessionError.code === 'SESSION_EXPIRED';

  useEffect(() => {
    if (sessionExpired) {
      setPassword('');
      setPasswordError(false);
    }
  }, [sessionExpired]);

  // Main view state
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  
  // Manual appointment form state
  const [mDate, setMDate] = useState<Date | undefined>(new Date());
  const [mTime, setMTime] = useState<string | null>(null);
  const [mName, setMName] = useState('');
  const [mPhone, setMPhone] = useState('');
  const [mManufacturer, setMManufacturer] = useState('');
  const [mModel, setMModel] = useState('');
  const [mNote, setMNote] = useState('');
  const [mDuration, setMDuration] = useState('60');

  // Queries
  const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');
  const mDateStr = mDate ? format(mDate, 'yyyy-MM-dd') : '';
  
  const workingHoursQuery = useWorkingHours(authenticated);
  const appointmentsQuery = useAppointmentsByDate(
    selectedDateStr,
    authenticated,
  );
  const blockedTimesQuery = useBlockedTimes(
    selectedDateStr,
    authenticated,
  );
  
  const manualAppointmentsQuery = useAppointmentsByDate(
    mDateStr,
    authenticated,
  );
  const manualBlockedTimesQuery = useBlockedTimes(
    mDateStr,
    authenticated,
  );
  const pendingAppointmentsQuery = usePendingAppointments(
    authenticated,
  );

  const allWorkingHours = workingHoursQuery.data;
  const appointments = appointmentsQuery.data;
  const blockedTimes = blockedTimesQuery.data;
  const mAppointments = manualAppointmentsQuery.data;
  const mBlockedTimes = manualBlockedTimesQuery.data;
  const pendingAppointments = pendingAppointmentsQuery.data;

  const dayQueriesLoading = workingHoursQuery.isLoading ||
    workingHoursQuery.isFetching ||
    appointmentsQuery.isLoading ||
    appointmentsQuery.isFetching ||
    blockedTimesQuery.isLoading ||
    blockedTimesQuery.isFetching;
  const dayQueriesError = workingHoursQuery.error ??
    appointmentsQuery.error ??
    blockedTimesQuery.error;
  const dayQueriesReady = workingHoursQuery.isSuccess &&
    !workingHoursQuery.isFetching &&
    appointmentsQuery.isSuccess &&
    !appointmentsQuery.isFetching &&
    blockedTimesQuery.isSuccess &&
    !blockedTimesQuery.isFetching;

  const manualQueriesLoading = workingHoursQuery.isLoading ||
    workingHoursQuery.isFetching ||
    manualAppointmentsQuery.isLoading ||
    manualAppointmentsQuery.isFetching ||
    manualBlockedTimesQuery.isLoading ||
    manualBlockedTimesQuery.isFetching;
  const manualQueriesError = workingHoursQuery.error ??
    manualAppointmentsQuery.error ??
    manualBlockedTimesQuery.error;
  const manualQueriesReady = workingHoursQuery.isSuccess &&
    !workingHoursQuery.isFetching &&
    manualAppointmentsQuery.isSuccess &&
    !manualAppointmentsQuery.isFetching &&
    manualBlockedTimesQuery.isSuccess &&
    !manualBlockedTimesQuery.isFetching;
  
  const createMutation = useCreateAppointment();

  const handleLogin = async () => {
    setPasswordError(false);
    if (!password) {
      setPasswordError(true);
      return;
    }
    if (!await login(password)) {
      setPasswordError(true);
    }
  };

  const handleLogout = () => {
    setPassword('');
    setPasswordError(false);
    createMutation.reset();
    logout();
  };

  const handleManualDateSelect = (date: Date | undefined) => {
    setMTime(null);
    setMDate(date);
  };

  const handleCreateManual = async () => {
    if (!manualQueriesReady) {
      toast.error('Poczekaj na załadowanie dostępnych terminów');
      return;
    }
    if (!mDate || !mTime || !mName || !mPhone || !mManufacturer || !mModel) {
      toast.error('Wypełnij wszystkie wymagane pola');
      return;
    }

    try {
      await createMutation.mutateAsync({
        appointment_date: format(mDate, 'yyyy-MM-dd'),
        arrival_time: mTime,
        customer_name: mName,
        customer_phone: mPhone,
        bike_manufacturer: mManufacturer,
        bike_model: mModel,
        service_note: mNote || null,
        estimated_duration_minutes: parseInt(mDuration, 10),
      });
      
      toast.success('Dodano wizytę');
      
      // Reset form
      setMName('');
      setMPhone('');
      setMManufacturer('');
      setMModel('');
      setMNote('');
      setMTime(null);
      
    } catch (error) {
      toast.error('Błąd podczas dodawania wizyty');
    }
  };

  if (isRestoring) {
    return (
      <div
        role="status"
        className="min-h-screen flex items-center justify-center p-4 text-muted-foreground"
      >
        Sprawdzanie sesji...
      </div>
    );
  }

  if (!authenticated) {
    const isWrongPassword = sessionError instanceof ApiClientError &&
      sessionError.status === 401 &&
      sessionError.code !== 'SESSION_EXPIRED';
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-sm space-y-4">
          <h1 className="text-xl font-bold text-center">Panel Serwisu</h1>
          <Input
            type="password"
            placeholder="Hasło"
            value={password}
            onChange={e => {
              setPassword(e.target.value);
              setPasswordError(false);
            }}
            onKeyDown={e => {
              if (e.key === 'Enter' && !sessionLoading) {
                void handleLogin();
              }
            }}
          />
          {sessionExpired && (
            <p role="alert" className="text-sm text-red-500">
              Sesja wygasła. Zaloguj się ponownie.
            </p>
          )}
          {passwordError && !sessionExpired && (
            <p className="text-sm text-red-500">
              {isWrongPassword
                ? 'Nieprawidłowe hasło'
                : 'Nie udało się zalogować. Spróbuj ponownie.'}
            </p>
          )}
          <Button
            className="w-full"
            onClick={() => void handleLogin()}
            disabled={sessionLoading || !password}
          >
            {sessionLoading ? 'Sprawdzanie...' : 'Zaloguj'}
          </Button>
        </div>
      </div>
    );
  }

  const workingHoursForSelected = allWorkingHours?.find(wh => wh.day_of_week === selectedDate.getDay());
  const workingHoursForM = mDate && allWorkingHours?.find(wh => wh.day_of_week === mDate.getDay());

  return (
    <div className="min-h-screen bg-secondary/30 pb-12">
      <header className="bg-background border-b sticky top-0 z-10 shadow-sm">
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-2 font-display font-bold text-lg">
            <CalendarIcon className="w-5 h-5 text-accent" /> Kalendarz Serwisu
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" /> Wyloguj
          </Button>
        </div>
      </header>

      <main className="container pt-8 max-w-5xl">
        <Tabs defaultValue="calendar" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-8 h-12">
            <TabsTrigger value="calendar" className="text-base"><CalendarIcon className="w-4 h-4 mr-2"/> Wizyty</TabsTrigger>
            <TabsTrigger value="manual" className="text-base"><Plus className="w-4 h-4 mr-2"/> Dodaj z telefonu</TabsTrigger>
            <TabsTrigger value="settings" className="text-base"><Settings className="w-4 h-4 mr-2"/> Ustawienia</TabsTrigger>
          </TabsList>
          
          <TabsContent value="calendar" className="space-y-6">

            {pendingAppointmentsQuery.isLoading && (
              <QueryNotice
                kind="loading"
                message="Ładowanie oczekujących zapytań..."
              />
            )}
            {pendingAppointmentsQuery.error && (
              <QueryNotice
                kind="error"
                label="Błąd oczekujących zapytań"
                message="Nie udało się pobrać oczekujących zapytań."
                onRetry={() => void pendingAppointmentsQuery.refetch()}
              />
            )}
            {pendingAppointmentsQuery.isSuccess &&
              pendingAppointments &&
              pendingAppointments.length > 0 && (
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-6 shadow-sm mb-6">
                <h3 className="font-semibold text-lg text-yellow-700 flex items-center gap-2 mb-4">
                  Oczekujące zapytania ({pendingAppointments.length})
                </h3>
                <div className="grid gap-4">
                  {pendingAppointments.map(app => (
                    <AppointmentCard key={app.id} appointment={app} />
                  ))}
                </div>
              </div>
            )}

            <div className="grid md:grid-cols-[300px_1fr] gap-6 items-start">
              <div className="bg-card border rounded-lg p-4 shadow-sm sticky top-24">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(d) => d && setSelectedDate(d)}
                  locale={pl}
                  className="w-full"
                />
              </div>
              
              <div className="space-y-6">
                <div className="bg-card border rounded-lg p-4 shadow-sm">
                  <h3 className="font-semibold mb-4">Podgląd dnia ({format(selectedDate, 'dd.MM.yyyy')})</h3>
                  <TimelinePicker 
                    date={selectedDate}
                    workingHours={workingHoursForSelected}
                    appointments={appointments ?? []}
                    blockedTimes={blockedTimes ?? []}
                    isLoading={dayQueriesLoading}
                    error={dayQueriesError}
                    selectedTime={null}
                    onSelectTime={() => {}}
                    className="opacity-80 pointer-events-none"
                  />
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold text-lg flex items-center justify-between">
                    Lista wizyt
                    <Badge count={dayQueriesReady ? appointments?.length ?? 0 : 0} />
                  </h3>

                  {dayQueriesLoading ? (
                    <QueryNotice
                      kind="loading"
                      message="Ładowanie wizyt dla wybranego dnia..."
                    />
                  ) : dayQueriesError ? (
                    <QueryNotice
                      kind="error"
                      label="Błąd danych wybranego dnia"
                      message="Nie udało się pobrać danych wybranego dnia."
                      onRetry={() => {
                        void Promise.all([
                          workingHoursQuery.refetch(),
                          appointmentsQuery.refetch(),
                          blockedTimesQuery.refetch(),
                        ]);
                      }}
                    />
                  ) : dayQueriesReady && appointments?.length === 0 ? (
                    <div className="text-center p-8 bg-card border border-dashed rounded-lg text-muted-foreground">
                      Brak wizyt w tym dniu.
                    </div>
                  ) : dayQueriesReady && appointments ? (
                    <div className="grid gap-4">
                      {appointments.map(app => (
                        <AppointmentCard key={app.id} appointment={app} />
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="manual">
            <div className="bg-card border rounded-xl shadow-sm p-6 max-w-3xl mx-auto">
              <div className="mb-6 border-b pb-4">
                <h2 className="text-xl font-semibold">Dodaj wizytę ręcznie</h2>
                <p className="text-sm text-muted-foreground">Wypełnij dane dla klienta, który dzwoni lub jest na miejscu.</p>
              </div>

              <div className="grid md:grid-cols-[1fr_300px] gap-8">
                <div className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Imię *</Label>
                      <Input value={mName} onChange={e => setMName(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Telefon *</Label>
                      <Input value={mPhone} onChange={e => setMPhone(e.target.value)} type="tel" />
                    </div>
                    <div className="space-y-2">
                      <Label>Producent roweru *</Label>
                      <Input value={mManufacturer} onChange={e => setMManufacturer(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Model roweru *</Label>
                      <Input value={mModel} onChange={e => setMModel(e.target.value)} />
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label>Szacowany czas (minuty) *</Label>
                      <Input value={mDuration} onChange={e => setMDuration(e.target.value)} type="number" />
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label>Co mamy zrobić? (opis) *</Label>
                      <Textarea value={mNote} onChange={e => setMNote(e.target.value)} />
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label>Wybierz datę *</Label>
                    <Calendar
                      mode="single"
                      selected={mDate}
                      onSelect={handleManualDateSelect}
                      locale={pl}
                      className="rounded-md border bg-background"
                    />
                  </div>
                  
                  {mDate && (
                    <div className="space-y-2">
                      <Label>Wybierz godzinę *</Label>
                      <TimelinePicker
                        date={mDate}
                        workingHours={workingHoursForM}
                        appointments={mAppointments ?? []}
                        blockedTimes={mBlockedTimes ?? []}
                        isLoading={manualQueriesLoading ||
                          (!manualQueriesReady && !manualQueriesError)}
                        error={manualQueriesError}
                        selectedTime={mTime}
                        onSelectTime={setMTime}
                      />
                      {manualQueriesError && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            void Promise.all([
                              workingHoursQuery.refetch(),
                              manualAppointmentsQuery.refetch(),
                              manualBlockedTimesQuery.refetch(),
                            ]);
                          }}
                        >
                          Spróbuj ponownie
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-8 pt-6 border-t flex justify-end">
                <Button
                  size="lg"
                  onClick={() => void handleCreateManual()}
                  disabled={
                    createMutation.isPending ||
                    !manualQueriesReady ||
                    !mTime ||
                    !mName ||
                    !mPhone ||
                    !mManufacturer ||
                    !mModel
                  }
                >
                  {createMutation.isPending ? 'Dodawanie...' : 'Zapisz i zablokuj termin'}
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="settings" className="space-y-8">
            <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <div>
                  <h2 className="text-xl font-semibold">Godziny otwarcia</h2>
                  <p className="text-sm text-muted-foreground">Ustal w jakich godzinach serwis przyjmuje zlecenia online.</p>
                </div>
                <WorkingHoursEditor authenticated={authenticated} />
              </div>

              <div className="space-y-4">
                <div>
                  <h2 className="text-xl font-semibold">Zablokowane terminy</h2>
                  <p className="text-sm text-muted-foreground">Dodaj przerwy (np. obiadowe), urlopy lub wyjazdy. W tych godzinach kalendarz będzie niedostępny dla klientów.</p>
                </div>
                <BlockedTimesEditor authenticated={authenticated} />
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function Badge({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <span className="bg-accent text-accent-foreground text-xs font-bold px-2 py-0.5 rounded-full">
      {count}
    </span>
  );
}

function QueryNotice({
  kind,
  label,
  message,
  onRetry,
}: {
  kind: 'loading' | 'error';
  label?: string;
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div
      role={kind === 'loading' ? 'status' : 'alert'}
      aria-label={label}
      className={
        kind === 'loading'
          ? 'p-4 text-center text-sm text-muted-foreground'
          : 'p-4 text-center text-sm text-destructive border border-destructive/20 rounded-lg bg-destructive/5 space-y-3'
      }
    >
      <p>{message}</p>
      {onRetry && (
        <Button type="button" variant="outline" size="sm" onClick={onRetry}>
          Spróbuj ponownie
        </Button>
      )}
    </div>
  );
}

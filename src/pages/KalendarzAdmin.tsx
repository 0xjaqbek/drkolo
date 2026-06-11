import { useState } from 'react';
import { useNoIndex } from "@/hooks/useNoIndex";
import { format, isBefore, startOfDay } from 'date-fns';
import { pl } from 'date-fns/locale';
import { SiteHeader } from '@/components/SiteHeader';
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
  
  const { data: allWorkingHours } = useWorkingHours(authenticated);
  const { data: appointments = [] } = useAppointmentsByDate(
    selectedDateStr,
    authenticated,
  );
  const { data: blockedTimes = [] } = useBlockedTimes(
    selectedDateStr,
    authenticated,
  );
  
  const { data: mAppointments = [] } = useAppointmentsByDate(
    mDateStr,
    authenticated,
  );
  const { data: mBlockedTimes = [] } = useBlockedTimes(
    mDateStr,
    authenticated,
  );
  const { data: pendingAppointments = [] } = usePendingAppointments(
    authenticated,
  );
  
  const createMutation = useCreateAppointment();

  const handleLogin = async () => {
    setPasswordError(false);
    if (!await login(password)) {
      setPasswordError(true);
    }
  };

  const handleCreateManual = async () => {
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
      sessionError.status === 401;
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
          {passwordError && (
            <p className="text-sm text-red-500">
              {isWrongPassword
                ? 'Nieprawidłowe hasło'
                : 'Nie udało się zalogować. Spróbuj ponownie.'}
            </p>
          )}
          <Button
            className="w-full"
            onClick={() => void handleLogin()}
            disabled={sessionLoading}
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
          <Button variant="ghost" size="sm" onClick={logout}>
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
            
            {pendingAppointments.length > 0 && (
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
                    appointments={appointments}
                    blockedTimes={blockedTimes}
                    selectedTime={null}
                    onSelectTime={() => {}}
                    className="opacity-80 pointer-events-none"
                  />
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold text-lg flex items-center justify-between">
                    Lista wizyt
                    <Badge count={appointments.length} />
                  </h3>
                  
                  {appointments.length === 0 ? (
                    <div className="text-center p-8 bg-card border border-dashed rounded-lg text-muted-foreground">
                      Brak wizyt w tym dniu.
                    </div>
                  ) : (
                    <div className="grid gap-4">
                      {appointments.map(app => (
                        <AppointmentCard key={app.id} appointment={app} />
                      ))}
                    </div>
                  )}
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
                      onSelect={setMDate}
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
                        appointments={mAppointments}
                        blockedTimes={mBlockedTimes}
                        selectedTime={mTime}
                        onSelectTime={setMTime}
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-8 pt-6 border-t flex justify-end">
                <Button size="lg" onClick={handleCreateManual} disabled={createMutation.isPending}>
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

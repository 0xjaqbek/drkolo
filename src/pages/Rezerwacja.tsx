import { useState, useEffect } from 'react';
import { format, isBefore, startOfDay } from 'date-fns';
import { pl } from 'date-fns/locale';
import { useMutation, useQuery } from '@tanstack/react-query';
import { SiteHeader } from '@/components/SiteHeader';
import { TimelinePicker } from '@/components/TimelinePicker';
import { SmsDialog } from '@/components/SmsDialog';
import { Logo } from '@/components/Logo';
import {
  ApiClientError,
  createAppointmentInquiry,
  getAvailability,
} from '@/lib/bookingApi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { ArrowLeft, ArrowRight, Calendar as CalendarIcon, CheckCircle, Clock } from 'lucide-react';
import { toast } from 'sonner';

const SERVICE_PHONE = "+48511061221";

function normalizeTime(time: string | null): string | null {
  if (!time) return null;
  return time.length === 5 ? `${time}:00` : time;
}

export default function Rezerwacja() {
  useEffect(() => {
    document.title = "Umów wizytę — Dr Koło: Serwis Rowerowy Gdańsk";

    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.rel = "canonical";
      document.head.appendChild(canonical);
    }
    canonical.href = "https://drkolo.pl/rezerwacja";

    const desc = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
    if (desc) desc.setAttribute("content", "Zarezerwuj termin w serwisie rowerowym Dr Koło w Gdańsku. Wybierz datę, godzinę i opisz usterkę — odpiszemy SMS-em.");

    return () => {
      document.title = "Dr Koło — Profesjonalny Serwis Rowerowy | Gdańsk · Kartuzy";
      if (canonical) canonical.href = "https://drkolo.pl/";
      if (desc) desc.setAttribute("content", "Dr Koło — profesjonalny serwis rowerowy w Gdańsku i Kartuzach. Naprawa rowerów MTB, szosowych, gravel, elektrycznych. Serwis amortyzatorów. Tel. 511 061 221.");
    };
  }, []);

  const [step, setStep] = useState(1);
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [time, setTime] = useState<string | null>(null);
  
  // Form state
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [manufacturer, setManufacturer] = useState('');
  const [model, setModel] = useState('');
  const [note, setNote] = useState('');
  
  // SMS dialog
  const [smsDialogOpen, setSmsDialogOpen] = useState(false);
  const [smsBody, setSmsBody] = useState('');

  const dateStr = date ? format(date, 'yyyy-MM-dd') : '';
  const availabilityQuery = useQuery({
    queryKey: ['booking-availability', dateStr],
    queryFn: () => getAvailability(dateStr),
    enabled: Boolean(dateStr),
  });
  const createMutation = useMutation({
    mutationFn: createAppointmentInquiry,
  });

  const workingHoursForDate = date && availabilityQuery.data
    ? {
        id: `availability-${dateStr}`,
        day_of_week: date.getDay(),
        open_time: normalizeTime(availabilityQuery.data.open),
        close_time: normalizeTime(availabilityQuery.data.close),
        is_open: Boolean(
          availabilityQuery.data.open && availabilityQuery.data.close,
        ),
      }
    : undefined;

  const handleDateSelect = (selectedDate: Date | undefined) => {
    setDate(selectedDate);
    setTime(null);
  };

  const handleNextStep1 = () => {
    if (!date) {
      toast.error('Wybierz datę');
      return;
    }
    setStep(2);
  };

  const handleNextStep2 = () => {
    if (!time) {
      toast.error('Wybierz godzinę przyjazdu');
      return;
    }
    setStep(3);
  };

  const handleNextStep3 = () => {
    if (!name || !phone || !manufacturer || !model || !note) {
      toast.error('Wypełnij wszystkie pola');
      return;
    }
    setStep(4);
  };

  const handleSubmit = async () => {
    if (!date || !time) return;

    try {
      const result = await createMutation.mutateAsync({
        date: format(date, 'yyyy-MM-dd'),
        time,
        customer_name: name,
        customer_phone: phone,
        bike_manufacturer: manufacturer,
        bike_model: model,
        service_note: note,
      });
      try {
        sessionStorage.setItem(
          `drkolo_booking_${result.id}`,
          result.lookup_token,
        );
      } catch {
        // The inquiry already exists; unavailable browser storage must not retry it.
      }

      const body = `Nowe zapytanie - Dr Koło\nData: ${format(date, 'dd.MM.yyyy')} o ${time}\nImię: ${name}\nRower: ${manufacturer} ${model}\nOpis: ${note}`;
      setSmsBody(body);
      
      const smsUri = `sms:${SERVICE_PHONE}?body=${encodeURIComponent(body)}`;
      
      // Create a hidden iframe/link to trigger the intent without losing state
      const link = document.createElement('a');
      link.href = smsUri;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Fallback dialog for desktop/if it fails
      setTimeout(() => {
        setSmsDialogOpen(true);
      }, 500);

      setStep(5); // Success step
    } catch (error) {
      if (error instanceof ApiClientError && error.code === 'SLOT_TAKEN') {
        setStep(2);
        setTime(null);
        toast.error('Ten termin został właśnie zajęty. Wybierz inną godzinę.');
        await availabilityQuery.refetch();
        return;
      }
      toast.error('Wystąpił błąd. Spróbuj ponownie.');
    }
  };

  const reset = () => {
    setStep(1);
    setDate(undefined);
    setTime(null);
    setName('');
    setPhone('');
    setManufacturer('');
    setModel('');
    setNote('');
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      
      <main className="container max-w-3xl pt-24 pb-16">
        <div className="mb-8 text-center">
          <h1 className="text-3xl md:text-4xl font-display font-bold mb-4">Umów wizytę w serwisie</h1>
          <p className="text-muted-foreground">Wybierz dogodny termin i opisz co dolega Twojemu rowerowi.</p>
        </div>

        {step < 5 && (
          <div className="flex items-center justify-between mb-8 relative">
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-muted -z-10 rounded-full overflow-hidden">
              <div 
                className="h-full bg-accent transition-all duration-500 ease-in-out" 
                style={{ width: `${((step - 1) / 3) * 100}%` }}
              />
            </div>
            {[1, 2, 3, 4].map(s => (
              <div 
                key={s}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-colors ${
                  step >= s ? 'bg-accent border-accent text-accent-foreground' : 'bg-background border-muted text-muted-foreground'
                }`}
              >
                {s}
              </div>
            ))}
          </div>
        )}

        <div className="bg-card border rounded-xl shadow-sm p-6 md:p-8 min-h-[400px]">
          {step === 1 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
              <div className="text-center mb-6">
                <h2 className="text-xl font-semibold flex items-center justify-center gap-2">
                  <CalendarIcon className="w-5 h-5 text-accent" /> Kiedy chcesz przyprowadzić rower?
                </h2>
              </div>
              
              <div className="flex justify-center">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={handleDateSelect}
                  locale={pl}
                  disabled={(day) => {
                    const today = startOfDay(new Date());
                    if (isBefore(day, today)) return true; // past dates
                    return day.getDay() === 0;
                  }}
                  className="rounded-md border bg-background shadow-sm"
                />
              </div>

              <div className="flex justify-end pt-4">
                <Button onClick={handleNextStep1} disabled={!date}>
                  Dalej <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {step === 2 && date && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
              <div className="text-center mb-6">
                <h2 className="text-xl font-semibold flex items-center justify-center gap-2">
                  <Clock className="w-5 h-5 text-accent" /> O której będziesz?
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {format(date, 'EEEE, d MMMM yyyy', { locale: pl })}
                </p>
              </div>

              <TimelinePicker
                date={date}
                workingHours={workingHoursForDate}
                appointments={[]}
                blockedTimes={[]}
                availableSlots={availabilityQuery.data?.slots}
                isLoading={availabilityQuery.isLoading}
                error={availabilityQuery.error}
                selectedTime={time}
                onSelectTime={setTime}
              />

              <div className="flex justify-between pt-4">
                <Button variant="ghost" onClick={() => setStep(1)}>
                  <ArrowLeft className="w-4 h-4 mr-2" /> Wstecz
                </Button>
                <Button onClick={handleNextStep2} disabled={!time}>
                  Dalej <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
              <div className="text-center mb-6">
                <h2 className="text-xl font-semibold">Dane i opis usterki</h2>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Imię *</Label>
                  <Input value={name} onChange={e => setName(e.target.value)} placeholder="Jan" />
                </div>
                <div className="space-y-2">
                  <Label>Telefon *</Label>
                  <Input value={phone} onChange={e => setPhone(e.target.value)} type="tel" placeholder="600 123 456" />
                </div>
                <div className="space-y-2">
                  <Label>Producent roweru *</Label>
                  <Input value={manufacturer} onChange={e => setManufacturer(e.target.value)} placeholder="np. Trek" />
                </div>
                <div className="space-y-2">
                  <Label>Model roweru *</Label>
                  <Input value={model} onChange={e => setModel(e.target.value)} placeholder="np. Fuel EX" />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>Co mamy zrobić? (opis usługi) *</Label>
                  <Textarea 
                    value={note} 
                    onChange={e => setNote(e.target.value)} 
                    placeholder="Opisz problem lub wymień usługi (np. serwis amortyzatora, wymiana łańcucha)..."
                    className="min-h-[100px]"
                  />
                </div>
              </div>

              <div className="flex justify-between pt-4">
                <Button variant="ghost" onClick={() => setStep(2)}>
                  <ArrowLeft className="w-4 h-4 mr-2" /> Wstecz
                </Button>
                <Button onClick={handleNextStep3} disabled={!name || !phone || !manufacturer || !model || !note}>
                  Dalej <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
              <div className="text-center mb-6">
                <h2 className="text-xl font-semibold">Podsumowanie</h2>
                <p className="text-sm text-muted-foreground mt-1">Sprawdź czy wszystko się zgadza przed wysłaniem.</p>
              </div>

              <div className="bg-muted/30 rounded-lg p-6 border space-y-4">
                <div className="grid grid-cols-2 gap-y-4 text-sm">
                  <div>
                    <span className="text-muted-foreground block mb-1">Termin przyjazdu:</span>
                    <strong className="text-base">{date ? format(date, 'dd.MM.yyyy') : ''} godz. {time}</strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground block mb-1">Dane kontaktowe:</span>
                    <strong className="text-base">{name}</strong><br />
                    <span>{phone}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-muted-foreground block mb-1">Rower:</span>
                    <strong className="text-base">{manufacturer} {model}</strong>
                  </div>
                  <div className="col-span-2">
                    <span className="text-muted-foreground block mb-1">Zgłoszenie:</span>
                    <div className="bg-background border rounded-md p-3 mt-1">{note}</div>
                  </div>
                </div>
              </div>

              <div className="bg-accent/10 text-accent-foreground p-4 rounded-lg text-sm border border-accent/20">
                <strong>Ważne:</strong> Po kliknięciu "Wyślij zapytanie" utworzymy zgłoszenie i otworzymy Twoją aplikację SMS z gotową wiadomością.
              </div>

              <div className="flex justify-between pt-4">
                <Button variant="ghost" onClick={() => setStep(3)}>
                  <ArrowLeft className="w-4 h-4 mr-2" /> Wstecz
                </Button>
                <Button size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90" onClick={handleSubmit} disabled={createMutation.isPending}>
                  {createMutation.isPending ? 'Wysyłanie...' : 'Wyślij zapytanie'}
                </Button>
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="text-center py-12 animate-in fade-in slide-in-from-bottom-4 space-y-6">
              <div className="w-20 h-20 bg-green-500/10 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-10 h-10" />
              </div>
              <h2 className="text-2xl font-bold">Zapytanie utworzone!</h2>
              <p className="text-muted-foreground max-w-md mx-auto">
                Serwis zadzwoni do Ciebie, aby potwierdzić termin wizyty.
              </p>
              
              <div className="pt-8">
                <Button variant="outline" onClick={reset}>
                  Złóż kolejne zapytanie
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="py-10 border-t border-border mt-auto">
        <div className="container flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <Logo className="h-7" />
          <div>Kielnieńska 111, Gdańsk 80-299 · {SERVICE_PHONE}</div>
        </div>
      </footer>

      <SmsDialog 
        open={smsDialogOpen} 
        onOpenChange={setSmsDialogOpen} 
        phoneNumber={SERVICE_PHONE} 
        smsBody={smsBody} 
      />
    </div>
  );
}

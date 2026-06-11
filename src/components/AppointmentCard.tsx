import { useState } from 'react';
import { useUpdateAppointment } from '@/hooks/useAppointments';
import type { ServiceAppointment } from '@/lib/types';
import { format, parse } from 'date-fns';
import { Phone, Clock, FileText, Check, X, CheckCircle, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';

interface AppointmentCardProps {
  appointment: ServiceAppointment;
}

export function AppointmentCard({ appointment }: AppointmentCardProps) {
  const updateMutation = useUpdateAppointment();
  const [isEditing, setIsEditing] = useState(false);
  const [duration, setDuration] = useState(appointment.estimated_duration_minutes?.toString() || '60');
  const [note, setNote] = useState(appointment.technician_note || '');

  const statusColors = {
    zapytanie: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
    potwierdzone: 'bg-green-500/10 text-green-600 border-green-500/20',
    odrzucone: 'bg-red-500/10 text-red-600 border-red-500/20',
    zakonczone: 'bg-gray-500/10 text-gray-600 border-gray-500/20',
  };

  const statusLabels = {
    zapytanie: 'Zapytanie',
    potwierdzone: 'Potwierdzone',
    odrzucone: 'Odrzucone',
    zakonczone: 'Zakończone',
  };

  const handleUpdateStatus = (status: ServiceAppointment['status']) => {
    updateMutation.mutate({
      id: appointment.id,
      status,
      estimated_duration_minutes: parseInt(duration, 10),
      technician_note: note,
    });
    setIsEditing(false);
  };

  const handleSaveEdit = () => {
    updateMutation.mutate({
      id: appointment.id,
      estimated_duration_minutes: parseInt(duration, 10) || null,
      technician_note: note,
      ...(appointment.status === 'zapytanie' ? { status: 'potwierdzone' } : {})
    });
    setIsEditing(false);
  };

  const arrivalDate = parse(appointment.arrival_time, 'HH:mm:ss', new Date());

  return (
    <Card className="overflow-hidden transition-all hover:shadow-md">
      <CardHeader className="p-4 pb-2 flex flex-row items-start justify-between space-y-0">
        <div>
          <div className="font-semibold text-lg">{appointment.customer_name}</div>
          <div className="text-sm text-muted-foreground flex items-center gap-2">
            <Clock className="w-3.5 h-3.5" />
            {format(arrivalDate, 'HH:mm')}
            {appointment.estimated_duration_minutes && (
              <span className="text-xs">
                (~{appointment.estimated_duration_minutes} min)
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Badge variant="outline" className={statusColors[appointment.status]}>
            {statusLabels[appointment.status]}
          </Badge>
          {appointment.source === 'manual' && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Manualne</Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="p-4 pt-2 space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Rower</div>
            <div className="font-medium">{appointment.bike_manufacturer} {appointment.bike_model}</div>
          </div>
          <div>
            <div className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Telefon</div>
            <a href={`tel:${appointment.customer_phone}`} className="font-medium text-accent hover:underline flex items-center gap-1">
              <Phone className="w-3.5 h-3.5" />
              {appointment.customer_phone}
            </a>
          </div>
        </div>

        {appointment.service_note && (
          <div className="bg-muted/50 p-3 rounded-md text-sm border">
            <div className="text-muted-foreground text-xs flex items-center gap-1.5 mb-1">
              <FileText className="w-3 h-3" /> Zgłoszenie klienta
            </div>
            {appointment.service_note}
          </div>
        )}

        {(isEditing || appointment.technician_note) && (
          <div className="space-y-3 pt-2 border-t">
            {isEditing ? (
              <>
                <div className="space-y-1.5">
                  <Label className="text-xs">Szacowany czas (minuty)</Label>
                  <Input 
                    type="number" 
                    value={duration} 
                    onChange={e => setDuration(e.target.value)}
                    className="h-8"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Notatka serwisanta (wewnętrzna)</Label>
                  <Textarea 
                    value={note} 
                    onChange={e => setNote(e.target.value)}
                    className="min-h-[60px] text-sm"
                    placeholder="Wpisz notatkę..."
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)}>Anuluj</Button>
                  <Button size="sm" onClick={handleSaveEdit} disabled={updateMutation.isPending}>
                    <Save className="w-4 h-4 mr-1.5" /> Zapisz
                  </Button>
                </div>
              </>
            ) : (
              <div className="text-sm">
                <div className="text-muted-foreground text-xs mb-1">Notatka serwisanta</div>
                <div className="whitespace-pre-wrap">{appointment.technician_note}</div>
              </div>
            )}
          </div>
        )}
      </CardContent>
      
      {!isEditing && (
        <CardFooter className="p-4 pt-0 flex flex-wrap gap-2">
          {appointment.status === 'zapytanie' && (
            <>
              <Button 
                size="sm" 
                className="bg-green-600 hover:bg-green-700 text-white"
                onClick={() => setIsEditing(true)}
              >
                <Check className="w-4 h-4 mr-1" /> Potwierdź
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                onClick={() => handleUpdateStatus('odrzucone')}
              >
                <X className="w-4 h-4 mr-1" /> Odrzuć
              </Button>
            </>
          )}
          
          {appointment.status === 'potwierdzone' && (
            <>
              <Button 
                size="sm" 
                className="bg-gray-800 hover:bg-gray-900 text-white"
                onClick={() => handleUpdateStatus('zakonczone')}
              >
                <CheckCircle className="w-4 h-4 mr-1" /> Zakończ
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setIsEditing(true)}
              >
                <FileText className="w-4 h-4 mr-1" /> Notatka / Czas
              </Button>
            </>
          )}
          
          {(appointment.status === 'odrzucone' || appointment.status === 'zakonczone') && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => handleUpdateStatus('potwierdzone')}
            >
              Przywróć
            </Button>
          )}
        </CardFooter>
      )}
    </Card>
  );
}

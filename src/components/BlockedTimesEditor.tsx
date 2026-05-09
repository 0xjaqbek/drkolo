import { useState } from 'react';
import { format } from 'date-fns';
import { useBlockedTimes, useCreateBlockedTime, useDeleteBlockedTime } from '@/hooks/useAppointments';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Trash2, Plus, Calendar as CalendarIcon, Clock } from 'lucide-react';
import { toast } from 'sonner';

export function BlockedTimesEditor() {
  const { data: blockedTimes, isLoading } = useBlockedTimes();
  const createMutation = useCreateBlockedTime();
  const deleteMutation = useDeleteBlockedTime();

  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [startTime, setStartTime] = useState('12:00');
  const [endTime, setEndTime] = useState('13:00');
  const [reason, setReason] = useState('');

  const handleAdd = async () => {
    if (!date || !startTime || !endTime) {
      toast.error('Wypełnij datę i godziny');
      return;
    }
    
    if (startTime >= endTime) {
      toast.error('Czas zakończenia musi być po czasie rozpoczęcia');
      return;
    }

    try {
      await createMutation.mutateAsync({
        block_date: date,
        start_time: `${startTime}:00`,
        end_time: `${endTime}:00`,
        reason: reason || null,
      });
      toast.success('Dodano zablokowany czas');
      setReason('');
    } catch (error) {
      toast.error('Błąd podczas dodawania');
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Czy na pewno chcesz usunąć tę blokadę?')) {
      try {
        await deleteMutation.mutateAsync(id);
        toast.success('Usunięto');
      } catch (error) {
        toast.error('Błąd podczas usuwania');
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="p-4 border rounded-lg bg-card space-y-4">
        <h3 className="font-medium flex items-center gap-2">
          <Plus className="w-4 h-4" /> Dodaj nową blokadę
        </h3>
        <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-1.5">
            <Label>Data</Label>
            <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Od godziny</Label>
            <Input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Do godziny</Label>
            <Input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Powód (opcjonalnie)</Label>
            <Input value={reason} onChange={e => setReason(e.target.value)} placeholder="np. Przerwa obiadowa" />
          </div>
        </div>
        <div className="flex justify-end">
          <Button onClick={handleAdd} disabled={createMutation.isPending}>
            Dodaj blokadę
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="font-medium">Istniejące blokady</h3>
        {isLoading ? (
          <div className="text-sm text-muted-foreground">Ładowanie...</div>
        ) : blockedTimes?.length === 0 ? (
          <div className="text-sm text-muted-foreground p-4 border border-dashed rounded-lg text-center">
            Brak zablokowanych terminów.
          </div>
        ) : (
          <div className="grid gap-2">
            {blockedTimes?.map(block => (
              <div key={block.id} className="flex items-center justify-between p-3 border rounded-lg bg-background">
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
                  <div className="flex items-center gap-1.5 text-sm font-medium">
                    <CalendarIcon className="w-3.5 h-3.5 text-muted-foreground" />
                    {block.block_date}
                  </div>
                  <div className="flex items-center gap-1.5 text-sm">
                    <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                    {block.start_time.substring(0, 5)} - {block.end_time.substring(0, 5)}
                  </div>
                  {block.reason && (
                    <div className="text-sm text-muted-foreground italic">
                      "{block.reason}"
                    </div>
                  )}
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="text-red-500 hover:text-red-600 hover:bg-red-50 shrink-0"
                  onClick={() => handleDelete(block.id)}
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

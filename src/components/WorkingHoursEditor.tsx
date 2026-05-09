import { useState } from 'react';
import { useWorkingHours, useUpdateWorkingHours } from '@/hooks/useAppointments';
import type { WorkingHours } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Save } from 'lucide-react';
import { toast } from 'sonner';

const DAYS = ['Niedziela', 'Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota'];

export function WorkingHoursEditor() {
  const { data: workingHours, isLoading } = useWorkingHours();
  const updateMutation = useUpdateWorkingHours();
  const [editingId, setEditingId] = useState<string | null>(null);

  // local state for editing a row
  const [editData, setEditData] = useState<Partial<WorkingHours>>({});

  if (isLoading || !workingHours) return <div className="p-4 text-center">Ładowanie...</div>;

  const handleEdit = (wh: WorkingHours) => {
    setEditingId(wh.id);
    setEditData({
      open_time: wh.open_time?.substring(0, 5) || '08:00',
      close_time: wh.close_time?.substring(0, 5) || '17:00',
      is_open: wh.is_open,
    });
  };

  const handleSave = async (id: string) => {
    try {
      await updateMutation.mutateAsync({
        id,
        open_time: editData.is_open ? `${editData.open_time}:00` : null,
        close_time: editData.is_open ? `${editData.close_time}:00` : null,
        is_open: editData.is_open,
      });
      toast.success('Zapisano godziny otwarcia');
      setEditingId(null);
    } catch (error) {
      toast.error('Błąd podczas zapisywania');
    }
  };

  const handleCancel = () => {
    setEditingId(null);
  };

  // Ensure rows are ordered Monday(1) to Sunday(0)
  const sortedHours = [...workingHours].sort((a, b) => {
    const aDay = a.day_of_week === 0 ? 7 : a.day_of_week;
    const bDay = b.day_of_week === 0 ? 7 : b.day_of_week;
    return aDay - bDay;
  });

  return (
    <div className="space-y-4">
      <div className="grid gap-3">
        {sortedHours.map((wh) => {
          const isEditing = editingId === wh.id;
          
          return (
            <div key={wh.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg bg-card gap-4">
              <div className="w-32 font-medium">
                {DAYS[wh.day_of_week]}
              </div>
              
              {isEditing ? (
                <div className="flex-1 flex flex-wrap items-center gap-4">
                  <div className="flex items-center space-x-2">
                    <Switch 
                      id={`open-${wh.id}`}
                      checked={editData.is_open} 
                      onCheckedChange={(c) => setEditData(prev => ({ ...prev, is_open: c }))} 
                    />
                    <Label htmlFor={`open-${wh.id}`}>{editData.is_open ? 'Otwarte' : 'Zamknięte'}</Label>
                  </div>
                  
                  {editData.is_open && (
                    <div className="flex items-center gap-2">
                      <Input 
                        type="time" 
                        value={editData.open_time || ''} 
                        onChange={e => setEditData(prev => ({ ...prev, open_time: e.target.value }))}
                        className="w-24"
                      />
                      <span>-</span>
                      <Input 
                        type="time" 
                        value={editData.close_time || ''} 
                        onChange={e => setEditData(prev => ({ ...prev, close_time: e.target.value }))}
                        className="w-24"
                      />
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex-1 text-sm text-muted-foreground">
                  {wh.is_open ? (
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-500"></div>
                      {wh.open_time?.substring(0, 5)} - {wh.close_time?.substring(0, 5)}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-red-500"></div>
                      Zamknięte
                    </div>
                  )}
                </div>
              )}
              
              <div className="flex items-center gap-2 shrink-0">
                {isEditing ? (
                  <>
                    <Button variant="ghost" size="sm" onClick={handleCancel}>Anuluj</Button>
                    <Button size="sm" onClick={() => handleSave(wh.id)} disabled={updateMutation.isPending}>
                      <Save className="w-4 h-4 mr-1.5" /> Zapisz
                    </Button>
                  </>
                ) : (
                  <Button variant="outline" size="sm" onClick={() => handleEdit(wh)}>
                    Edytuj
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

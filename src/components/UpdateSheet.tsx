import { useState, useRef } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Camera } from 'lucide-react';

interface UpdateSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (note: string, photos: File[]) => Promise<void>;
  title?: string;
}

export function UpdateSheet({
  open,
  onOpenChange,
  onSubmit,
  title = 'Dodaj aktualizację',
}: UpdateSheetProps) {
  const [note, setNote] = useState('');
  const [photos, setPhotos] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setPhotos(prev => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const handleSubmit = async () => {
    if (note.trim() === '' && photos.length === 0) return;
    setSubmitting(true);
    try {
      await onSubmit(note, photos);
      setNote('');
      setPhotos([]);
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setNote('');
      setPhotos([]);
    }
    onOpenChange(open);
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
        </SheetHeader>
        <div className="space-y-4 mt-4 pb-4">
          <Textarea
            placeholder="Notatka (opcjonalnie)..."
            value={note}
            onChange={e => setNote(e.target.value)}
            rows={3}
          />
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFiles}
            className="hidden"
          />
          <Button
            variant="outline"
            className="w-full"
            onClick={() => fileRef.current?.click()}
          >
            <Camera className="mr-2 h-4 w-4" />
            Dodaj zdjęcia ({photos.length})
          </Button>
          {photos.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {photos.map((f, i) => (
                <img
                  key={i}
                  src={URL.createObjectURL(f)}
                  alt=""
                  className="w-16 h-16 object-cover rounded border"
                />
              ))}
            </div>
          )}
          <Button
            className="w-full"
            onClick={handleSubmit}
            disabled={submitting || (note.trim() === '' && photos.length === 0)}
          >
            {submitting ? 'Zapisywanie...' : 'Zapisz'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

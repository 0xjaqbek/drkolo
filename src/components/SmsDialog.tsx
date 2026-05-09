import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Copy, Phone } from 'lucide-react';
import { toast } from 'sonner';

interface SmsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  phoneNumber: string;
  smsBody: string;
}

export function SmsDialog({ open, onOpenChange, phoneNumber, smsBody }: SmsDialogProps) {
  const handleCopy = () => {
    navigator.clipboard.writeText(smsBody);
    toast.success('Skopiowano do schowka');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Wyślij SMS do serwisu</DialogTitle>
          <DialogDescription>
            Wygląda na to, że Twoja przeglądarka nie potrafi automatycznie otworzyć aplikacji SMS.
            Wyślij poniższą wiadomość ręcznie na numer <strong>{phoneNumber}</strong>.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="bg-muted p-4 rounded-md text-sm whitespace-pre-wrap font-mono border">
            {smsBody}
          </div>
          
          <div className="flex flex-col sm:flex-row gap-2">
            <Button className="flex-1" onClick={handleCopy} variant="secondary">
              <Copy className="w-4 h-4 mr-2" />
              Skopiuj treść
            </Button>
            <Button className="flex-1 bg-accent text-accent-foreground hover:bg-accent/90" asChild>
              <a href={`tel:${phoneNumber.replace(/\s+/g, '')}`}>
                <Phone className="w-4 h-4 mr-2" />
                Zadzwoń do nas
              </a>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

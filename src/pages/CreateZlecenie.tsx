import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '@/hooks/useSession';
import { useCatalog } from '@/hooks/useZlecenie';
import { useCreateZlecenie } from '@/hooks/useZlecenieActions';
import { CatalogPicker } from '@/components/CatalogPicker';
import { SiteHeader } from '@/components/SiteHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { X, Plus } from 'lucide-react';

export default function CreateZlecenie() {
  const { authenticated, login } = useSession();
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState(false);
  const [bikeModel, setBikeModel] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [customItem, setCustomItem] = useState('');
  const [createdHash, setCreatedHash] = useState<string | null>(null);
  const [createdPhone, setCreatedPhone] = useState('');

  const navigate = useNavigate();
  const { data: catalog } = useCatalog();
  const createMutation = useCreateZlecenie();

  const handleLogin = () => {
    if (!login(password)) {
      setPasswordError(true);
    }
  };

  const addItems = (labels: string[]) => setSelectedItems(prev => [...prev, ...labels]);

  const removeItem = (index: number) =>
    setSelectedItems(prev => prev.filter((_, i) => i !== index));

  const addCustomItem = () => {
    if (customItem.trim()) {
      setSelectedItems(prev => [...prev, customItem.trim()]);
      setCustomItem('');
    }
  };

  const handleSubmit = async () => {
    if (!bikeModel.trim() || !phone.trim()) return;
    const zlecenie = await createMutation.mutateAsync({
      bike_model: bikeModel.trim(),
      customer_phone: phone.trim(),
      items: selectedItems,
    });
    setCreatedHash(zlecenie.hash);
    setCreatedPhone(phone.trim());
  };

  if (!authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-sm space-y-4">
          <h1 className="text-xl font-bold text-center">Dostęp chroniony</h1>
          <Input
            type="password"
            placeholder="Hasło"
            value={password}
            onChange={e => {
              setPassword(e.target.value);
              setPasswordError(false);
            }}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
          />
          {passwordError && (
            <p className="text-sm text-red-500">Nieprawidłowe hasło</p>
          )}
          <Button className="w-full" onClick={handleLogin}>
            Zaloguj
          </Button>
        </div>
      </div>
    );
  }

  if (createdHash) {
    const link = `https://drkolo.pl/zlecenie/${createdHash}`;
    const smsBody = encodeURIComponent(
      `Twój rower jest w serwisie Dr Koło. Śledź postęp: ${link}`
    );
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-sm space-y-4 text-center">
          <div className="text-green-500 text-5xl">✓</div>
          <h1 className="text-xl font-bold">Zlecenie utworzone!</h1>
          <p className="text-sm text-muted-foreground font-mono tracking-widest">
            {createdHash}
          </p>
          <a href={`sms:${createdPhone}?body=${smsBody}`} className="block">
            <Button className="w-full" size="lg">
              Wyślij SMS do klienta
            </Button>
          </a>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => navigate(`/zlecenie/${createdHash}`)}
          >
            Otwórz zlecenie
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="max-w-2xl mx-auto p-4 space-y-6 pb-12">
        <h1 className="text-2xl font-bold">Nowe zlecenie</h1>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="bike-model">Model roweru *</Label>
            <Input
              id="bike-model"
              value={bikeModel}
              onChange={e => setBikeModel(e.target.value)}
              placeholder="np. Trek Fuel EX 9.8"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Telefon klienta *</Label>
            <Input
              id="phone"
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="+48 600 123 456"
            />
          </div>
        </div>

        {catalog && (
          <div className="space-y-2">
            <Label>Wybierz usługi z katalogu</Label>
            <CatalogPicker
              regular={catalog.regular}
              packages={catalog.packages}
              onAddItems={addItems}
            />
          </div>
        )}

        <div className="space-y-2">
          <Label>Dodaj własną pozycję</Label>
          <div className="flex gap-2">
            <Input
              value={customItem}
              onChange={e => setCustomItem(e.target.value)}
              placeholder="Nazwa usługi..."
              onKeyDown={e => e.key === 'Enter' && addCustomItem()}
            />
            <Button variant="outline" onClick={addCustomItem}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {selectedItems.length > 0 && (
          <div className="space-y-2">
            <Label>Zakres prac ({selectedItems.length})</Label>
            <div className="space-y-1">
              {selectedItems.map((item, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 bg-muted rounded px-3 py-2 text-sm"
                >
                  <span className="flex-1">{item}</span>
                  <button onClick={() => removeItem(i)} aria-label="Usuń">
                    <X className="h-4 w-4 text-muted-foreground" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <Button
          className="w-full"
          size="lg"
          onClick={handleSubmit}
          disabled={!bikeModel.trim() || !phone.trim() || createMutation.isPending}
        >
          {createMutation.isPending ? 'Tworzenie...' : 'Utwórz zlecenie'}
        </Button>
      </div>
    </div>
  );
}

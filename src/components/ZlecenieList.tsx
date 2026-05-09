import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useZlecenieList } from '@/hooks/useZlecenie';
import { useDeleteZlecenie, useUpdateZlecenie } from '@/hooks/useZlecenieActions';
import { SiteHeader } from '@/components/SiteHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import type { Zlecenie, ZlecenieStatus } from '@/lib/types';
import {
  Pencil,
  Trash2,
  ExternalLink,
  Search,
  Bike,
  Phone,
  Calendar,
  ArrowLeft,
} from 'lucide-react';

interface ZlecenieListProps {
  onBack: () => void;
}

export function ZlecenieList({ onBack }: ZlecenieListProps) {
  const navigate = useNavigate();
  const { data: zlecenia, isLoading } = useZlecenieList();
  const deleteMutation = useDeleteZlecenie();
  const updateMutation = useUpdateZlecenie();

  const [searchQuery, setSearchQuery] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Zlecenie | null>(null);
  const [editTarget, setEditTarget] = useState<Zlecenie | null>(null);
  const [editBikeModel, setEditBikeModel] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editStatus, setEditStatus] = useState<ZlecenieStatus>('oczekuje');

  const filteredZlecenia = (zlecenia ?? []).filter((z) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      z.bike_model.toLowerCase().includes(q) ||
      z.customer_phone.toLowerCase().includes(q) ||
      z.hash.toLowerCase().includes(q) ||
      z.status.toLowerCase().includes(q)
    );
  });

  const openEdit = (z: Zlecenie) => {
    setEditTarget(z);
    setEditBikeModel(z.bike_model);
    setEditPhone(z.customer_phone);
    setEditStatus(z.status);
  };

  const handleEditSave = async () => {
    if (!editTarget) return;
    await updateMutation.mutateAsync({
      id: editTarget.id,
      bike_model: editBikeModel.trim(),
      customer_phone: editPhone.trim(),
      status: editStatus,
    });
    setEditTarget(null);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await deleteMutation.mutateAsync(deleteTarget.id);
    setDeleteTarget(null);
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('pl-PL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const statusLabel: Record<ZlecenieStatus, string> = {
    oczekuje: 'Oczekuje',
    w_trakcie: 'W trakcie',
    gotowe: 'Gotowe',
  };

  const statusColor: Record<ZlecenieStatus, string> = {
    oczekuje:
      'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700',
    w_trakcie:
      'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-800',
    gotowe:
      'bg-green-100 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800',
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="max-w-4xl mx-auto p-4 pt-20 space-y-6 pb-12">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">Zlecenia</h1>
            <p className="text-sm text-muted-foreground">
              {zlecenia?.length ?? 0} zleceń w bazie
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="search-zlecenia"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Szukaj po modelu, telefonie, hashu..."
            className="pl-10"
          />
        </div>

        {/* List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <p className="text-muted-foreground">Ładowanie...</p>
          </div>
        ) : filteredZlecenia.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center space-y-2">
            <Bike className="h-12 w-12 text-muted-foreground/40" />
            <p className="text-muted-foreground">
              {searchQuery.trim() ? 'Brak wyników wyszukiwania' : 'Brak zleceń w bazie'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredZlecenia.map((z) => (
              <div
                key={z.id}
                className="group bg-card border border-border rounded-lg p-4 hover:border-accent/50 transition-all duration-300 hover:shadow-md"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="flex-1 min-w-0 space-y-2">
                    {/* Title row */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-base truncate">{z.bike_model}</h3>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusColor[z.status]}`}
                      >
                        {statusLabel[z.status]}
                      </span>
                    </div>

                    {/* Details */}
                    <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                      <span className="flex items-center gap-1.5">
                        <Phone className="h-3.5 w-3.5" />
                        {z.customer_phone}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5" />
                        {formatDate(z.created_at)}
                      </span>
                      <span className="font-mono text-xs opacity-60">#{z.hash}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0 border-t pt-3 mt-1 sm:mt-0 sm:pt-0 sm:border-0 justify-end">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      onClick={() => navigate(`/zlecenie/${z.hash}`)}
                      title="Otwórz zlecenie"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-accent"
                      onClick={() => openEdit(z)}
                      title="Edytuj"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-red-500"
                      onClick={() => setDeleteTarget(z)}
                      title="Usuń"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editTarget} onOpenChange={(open) => !open && setEditTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edytuj zlecenie</DialogTitle>
            <DialogDescription>
              Zmień dane zlecenia #{editTarget?.hash}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="edit-bike-model">Model roweru</Label>
              <Input
                id="edit-bike-model"
                value={editBikeModel}
                onChange={(e) => setEditBikeModel(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-phone">Telefon klienta</Label>
              <Input
                id="edit-phone"
                type="tel"
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <StatusBadge
                status={editStatus}
                onStatusChange={(s) => setEditStatus(s)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTarget(null)}>
              Anuluj
            </Button>
            <Button
              onClick={handleEditSave}
              disabled={!editBikeModel.trim() || !editPhone.trim() || updateMutation.isPending}
            >
              {updateMutation.isPending ? 'Zapisywanie...' : 'Zapisz'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Usunąć zlecenie?</AlertDialogTitle>
            <AlertDialogDescription>
              Czy na pewno chcesz usunąć zlecenie{' '}
              <strong>{deleteTarget?.bike_model}</strong> (#{deleteTarget?.hash})?
              Ta operacja jest nieodwracalna.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anuluj</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deleteMutation.isPending ? 'Usuwanie...' : 'Usuń'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

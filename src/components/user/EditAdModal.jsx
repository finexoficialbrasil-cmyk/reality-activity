import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import UserAdvertisementForm from './UserAdvertisementForm';

export default function EditAdModal({ ad, user, userPoints, onClose, onSaved }) {
  if (!ad) return null;

  return (
    <Dialog open={!!ad} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-gold">Editar Anúncio</DialogTitle>
        </DialogHeader>
        <UserAdvertisementForm
          user={user}
          userPoints={userPoints}
          ad={ad}
          onAdCreated={() => {
            onSaved();
            onClose();
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
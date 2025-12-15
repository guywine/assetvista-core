import { useState } from 'react';
import { AssetClass } from '@/types/portfolio';
import { ASSET_CLASSES } from '@/constants/portfolio';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface PendingAssetDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string, assetClass: AssetClass, valueUsd: number) => Promise<void>;
}

export function PendingAssetDialog({ isOpen, onClose, onSave }: PendingAssetDialogProps) {
  const [name, setName] = useState('');
  const [assetClass, setAssetClass] = useState<AssetClass>('Public Equity');
  const [valueUsd, setValueUsd] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim() || !valueUsd) return;

    setIsSaving(true);
    try {
      await onSave(name.trim(), assetClass, parseFloat(valueUsd) || 0);
      // Reset form
      setName('');
      setAssetClass('Public Equity');
      setValueUsd('');
      onClose();
    } catch (error) {
      // Error handled in hook
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    setName('');
    setAssetClass('Public Equity');
    setValueUsd('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-financial-primary text-lg font-bold">
            Add Pending Asset
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="pending-name">Name *</Label>
            <Input
              id="pending-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., NVIDIA, Treasury Bond"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="pending-class">Asset Class *</Label>
            <Select
              value={assetClass}
              onValueChange={(value) => setAssetClass(value as AssetClass)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ASSET_CLASSES.map((cls) => (
                  <SelectItem key={cls} value={cls}>
                    {cls}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="pending-value">Value (USD) *</Label>
            <Input
              id="pending-value"
              type="number"
              value={valueUsd}
              onChange={(e) => setValueUsd(e.target.value)}
              placeholder="e.g., 50000"
              min="0"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!name.trim() || !valueUsd || isSaving}
          >
            {isSaving ? 'Adding...' : 'Add'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

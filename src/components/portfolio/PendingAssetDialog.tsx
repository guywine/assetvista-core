import { useState, useMemo } from 'react';
import { Asset, AssetClass } from '@/types/portfolio';
import { ASSET_CLASSES } from '@/constants/portfolio';
import { useAssetLookup } from '@/hooks/useAssetLookup';
import { useToast } from '@/hooks/use-toast';
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
  existingAssets: Asset[];
}

export function PendingAssetDialog({ isOpen, onClose, onSave, existingAssets }: PendingAssetDialogProps) {
  const [name, setName] = useState('');
  const [assetClass, setAssetClass] = useState<AssetClass>('Public Equity');
  const [valueUsd, setValueUsd] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const { findSimilarAssetNames, findAssetsByName, findPotentialDuplicates } = useAssetLookup(existingAssets);
  const { toast } = useToast();

  const suggestedAssets = useMemo(() => {
    if (!name.trim()) return [];
    return findSimilarAssetNames(name.trim()).slice(0, 5);
  }, [name, findSimilarAssetNames]);

  const handleSave = async () => {
    const trimmedName = name.trim();
    if (!trimmedName || !valueUsd) return;

    // Check for exact match
    const exactMatch = findAssetsByName(trimmedName);
    if (exactMatch.length > 0) {
      toast({
        title: "Asset already exists",
        description: `An asset named "${trimmedName}" already exists. Use the suggestions to select it, or choose a different name.`,
        variant: "destructive"
      });
      return;
    }

    // Check for near-duplicate names
    const nearDuplicates = findPotentialDuplicates(trimmedName);
    if (nearDuplicates.length > 0) {
      toast({
        title: "Similar asset name exists",
        description: `A similar asset "${nearDuplicates[0]}" already exists. Please use consistent naming.`,
        variant: "destructive"
      });
      return;
    }

    setIsSaving(true);
    try {
      await onSave(trimmedName, assetClass, parseFloat(valueUsd) || 0);
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
    setShowSuggestions(false);
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
          <div className="space-y-2 relative">
            <Label htmlFor="pending-name">Name *</Label>
            <Input
              id="pending-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              placeholder="e.g., NVIDIA, Treasury Bond"
              autoComplete="off"
            />
            {showSuggestions && suggestedAssets.length > 0 && (
              <div className="absolute z-50 w-full mt-1 bg-background border border-border rounded-md shadow-lg max-h-48 overflow-auto">
                <div className="p-2 text-xs text-muted-foreground border-b border-border">
                  Click to use existing asset name:
                </div>
                {suggestedAssets.map(assetName => (
                  <button
                    key={assetName}
                    type="button"
                    className="w-full px-3 py-2 text-left hover:bg-muted text-sm transition-colors"
                    onMouseDown={() => {
                      setName(assetName);
                      setShowSuggestions(false);
                    }}
                  >
                    {assetName}
                  </button>
                ))}
              </div>
            )}
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

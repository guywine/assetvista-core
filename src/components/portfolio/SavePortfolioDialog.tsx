import { useState } from 'react';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Save, AlertCircle } from 'lucide-react';
import { Asset, FXRates, ViewCurrency } from '@/types/portfolio';

interface SavePortfolioDialogProps {
  assets: Asset[];
  fxRates: FXRates;
  viewCurrency: ViewCurrency;
  onSave: (name: string, description: string) => void;
}

export function SavePortfolioDialog({ assets, fxRates, viewCurrency, onSave }: SavePortfolioDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const defaultName = format(new Date(), 'yyyy-MM-dd');

  const handleSave = () => {
    const finalName = name.trim() ? `${defaultName} - ${name.trim()}` : defaultName;
    onSave(finalName, description);
    setOpen(false);
    setName('');
    setDescription('');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Save className="h-4 w-4" />
          Save Portfolio
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Save Portfolio Snapshot</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Please ensure your FX rates are up to date before saving. Current view currency: {viewCurrency}
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="name">Additional Name (optional)</Label>
            <Input
              id="name"
              placeholder="e.g., Q4 Review, After Rebalancing"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <p className="text-sm text-muted-foreground">
              Full name will be: {name.trim() ? `${defaultName} - ${name.trim()}` : defaultName}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              placeholder="Brief notes about this portfolio state..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <div className="text-sm text-muted-foreground">
            This snapshot will include {assets.length} assets and current FX rates.
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              Save Snapshot
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
import { useState, useMemo } from 'react';
import { Asset } from '@/types/portfolio';
import { getEligibleLimitedLiquidityAssets } from '@/lib/liquidity-utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Settings, X, Plus, Search } from 'lucide-react';

interface LiquiditySettingsDialogProps {
  assets: Asset[];
  limitedLiquidityAssets: Set<string>;
  onAdd: (assetName: string) => Promise<boolean>;
  onRemove: (assetName: string) => Promise<boolean>;
}

export function LiquiditySettingsDialog({
  assets,
  limitedLiquidityAssets,
  onAdd,
  onRemove,
}: LiquiditySettingsDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Get unique eligible assets (Public Equity + Commodities & more)
  const eligibleAssets = useMemo(() => {
    const eligible = getEligibleLimitedLiquidityAssets(assets);
    // Get unique asset names
    const uniqueNames = new Set(eligible.map(a => a.name));
    return Array.from(uniqueNames).sort();
  }, [assets]);

  // Filter assets based on search term
  const filteredAssets = useMemo(() => {
    if (!searchTerm.trim()) return eligibleAssets;
    const term = searchTerm.toLowerCase();
    return eligibleAssets.filter(name => name.toLowerCase().includes(term));
  }, [eligibleAssets, searchTerm]);

  // Separate into marked and unmarked
  const markedAssets = useMemo(() => {
    return filteredAssets.filter(name => limitedLiquidityAssets.has(name));
  }, [filteredAssets, limitedLiquidityAssets]);

  const unmarkedAssets = useMemo(() => {
    return filteredAssets.filter(name => !limitedLiquidityAssets.has(name));
  }, [filteredAssets, limitedLiquidityAssets]);

  const handleAdd = async (assetName: string) => {
    setIsProcessing(true);
    await onAdd(assetName);
    setIsProcessing(false);
  };

  const handleRemove = async (assetName: string) => {
    setIsProcessing(true);
    await onRemove(assetName);
    setIsProcessing(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Settings className="h-4 w-4" />
          <span className="hidden sm:inline">Limited Liquidity Settings</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Limited Liquidity Assets</DialogTitle>
          <DialogDescription>
            Mark equity assets that have limited liquidity. These will be grouped separately in the Liquidity Table.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search assets..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Currently marked assets */}
          {markedAssets.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground">
                Marked as Limited Liquidity ({markedAssets.length})
              </h4>
              <div className="flex flex-wrap gap-2">
                {markedAssets.map(name => (
                  <Badge 
                    key={name} 
                    variant="secondary" 
                    className="gap-1 pr-1"
                  >
                    {name}
                    <button
                      onClick={() => handleRemove(name)}
                      disabled={isProcessing}
                      className="ml-1 p-0.5 rounded-full hover:bg-destructive/20 transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Available assets to mark */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground">
              Available Assets ({unmarkedAssets.length})
            </h4>
            <ScrollArea className="h-[200px] border rounded-md p-2">
              {unmarkedAssets.length === 0 ? (
                <div className="text-sm text-muted-foreground text-center py-4">
                  {searchTerm ? 'No matching assets found' : 'All eligible assets are marked'}
                </div>
              ) : (
                <div className="space-y-1">
                  {unmarkedAssets.map(name => (
                    <button
                      key={name}
                      onClick={() => handleAdd(name)}
                      disabled={isProcessing}
                      className="w-full flex items-center justify-between p-2 text-sm rounded-md hover:bg-muted transition-colors text-left"
                    >
                      <span>{name}</span>
                      <Plus className="h-4 w-4 text-muted-foreground" />
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Info text */}
          <p className="text-xs text-muted-foreground">
            Only Public Equity and Commodities & more assets can be marked as limited liquidity.
            Assets in this list will appear under "Equities - Limited Liquidity" instead of "Equities - Liquid".
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

import { useState } from 'react';
import { Asset } from '@/types/portfolio';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Edit2, Check, X } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface PricingTableProps {
  groupAAssets: Asset[];
  groupBAssets: Asset[];
  onUpdateAsset: (asset: Asset) => Promise<Asset>;
}

interface EditingAsset {
  id: string;
  price: string;
  ytw: string;
}

export function PricingTable({ 
  groupAAssets, 
  groupBAssets, 
  onUpdateAsset 
}: PricingTableProps) {
  const [editingAsset, setEditingAsset] = useState<EditingAsset | null>(null);
  const { toast } = useToast();

  const allAssets = [...groupAAssets, ...groupBAssets];

  const handleStartEdit = (asset: Asset) => {
    setEditingAsset({
      id: asset.id,
      price: asset.price.toString(),
      ytw: asset.ytw ? (asset.ytw * 100).toString() : '', // Convert to percentage for editing
    });
  };

  const handleSave = async () => {
    if (!editingAsset) return;
    
    const originalAsset = allAssets.find(a => a.id === editingAsset.id);
    if (!originalAsset) return;

    try {
      const price = parseFloat(editingAsset.price);
      const ytw = editingAsset.ytw ? parseFloat(editingAsset.ytw) / 100 : undefined; // Convert percentage back to decimal

      if (isNaN(price) || price < 0) {
        toast({
          title: "Invalid Input",
          description: "Price must be a valid positive number",
          variant: "destructive",
        });
        return;
      }

      if (editingAsset.ytw && (isNaN(ytw!) || ytw! < 0)) {
        toast({
          title: "Invalid Input", 
          description: "YTW must be a valid positive number",
          variant: "destructive",
        });
        return;
      }

      const updatedAsset: Asset = {
        ...originalAsset,
        price,
        ytw,
        updated_at: new Date().toISOString(),
      };

      await onUpdateAsset(updatedAsset);
      setEditingAsset(null);

      toast({
        title: "Success",
        description: "Asset pricing updated successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update asset pricing",
        variant: "destructive",
      });
    }
  };

  const handleCancel = () => {
    setEditingAsset(null);
  };

  const isGroupB = (asset: Asset) => {
    return asset.class === 'Fixed Income' && 
           ['Corporate', 'Gov long', 'Gov 1-2', 'CPI linked'].includes(asset.sub_class);
  };

  const formatLastUpdated = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM d, yyyy');
    } catch {
      return '';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          Quick Pricing Updates ({allAssets.length} assets)
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Update prices and YTW for assets that require regular pricing updates
        </p>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border max-h-[600px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-background border-b z-10">
              <tr className="text-left">
                <th className="p-2 font-medium text-muted-foreground">Asset Name</th>
                <th className="p-2 font-medium text-muted-foreground text-right">Price</th>
                <th className="p-2 font-medium text-muted-foreground text-right">YTW</th>
                <th className="p-2 font-medium text-muted-foreground">Last Updated</th>
                <th className="p-2 font-medium text-muted-foreground w-16">Edit</th>
              </tr>
            </thead>
            <tbody>
              {allAssets.map((asset, index) => {
                const isEditing = editingAsset?.id === asset.id;
                const showYTW = isGroupB(asset);
                const isEven = index % 2 === 0;

                return (
                  <tr 
                    key={asset.id} 
                    className={`hover:bg-muted/50 transition-colors ${
                      isEven ? 'bg-muted/20' : 'bg-background'
                    }`}
                  >
                    <td className="p-2 py-1.5 font-medium max-w-[200px] truncate">
                      {asset.name}
                    </td>
                    <td className="p-2 py-1.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {isEditing ? (
                          <>
                            <Input
                              type="number"
                              step="0.01"
                              value={editingAsset.price}
                              onChange={(e) => setEditingAsset(prev => 
                                prev ? { ...prev, price: e.target.value } : null
                              )}
                              className="w-20 h-7 text-xs text-right"
                            />
                            <span className="text-xs text-muted-foreground min-w-[28px]">
                              {asset.origin_currency}
                            </span>
                          </>
                        ) : (
                          <>
                            <span className="font-medium">{asset.price}</span>
                            <span className="text-xs text-muted-foreground ml-1">
                              {asset.origin_currency}
                            </span>
                          </>
                        )}
                      </div>
                    </td>
                    <td className="p-2 py-1.5 text-right">
                      {showYTW ? (
                        <div className="flex items-center justify-end gap-1">
                          {isEditing ? (
                            <>
                              <Input
                                type="number"
                                step="0.01"
                                value={editingAsset.ytw}
                                onChange={(e) => setEditingAsset(prev => 
                                  prev ? { ...prev, ytw: e.target.value } : null
                                )}
                                className="w-16 h-7 text-xs text-right"
                                placeholder="0.00"
                              />
                              <span className="text-xs text-muted-foreground">%</span>
                            </>
                          ) : (
                            <>
                              <span className="font-medium">
                                {asset.ytw ? (asset.ytw * 100).toFixed(2) : '-'}
                              </span>
                              {asset.ytw && (
                                <span className="text-xs text-muted-foreground">%</span>
                              )}
                            </>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="p-2 py-1.5 text-xs text-muted-foreground">
                      {formatLastUpdated(asset.updated_at)}
                    </td>
                    <td className="p-2 py-1.5">
                      <div className="flex items-center gap-1">
                        {isEditing ? (
                          <>
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              onClick={handleSave}
                              className="h-6 w-6 p-0 text-financial-success hover:text-financial-success hover:bg-financial-success/10"
                            >
                              <Check className="h-3 w-3" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              onClick={handleCancel}
                              className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </>
                        ) : (
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            onClick={() => handleStartEdit(asset)}
                            className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground hover:bg-muted"
                          >
                            <Edit2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          
          {allAssets.length === 0 && (
            <div className="p-8 text-center text-muted-foreground">
              No assets found that require regular pricing updates.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
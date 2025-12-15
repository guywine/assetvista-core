import { useState } from 'react';
import { usePendingAssets, PendingAsset } from '@/hooks/usePendingAssets';
import { useAssetLookup } from '@/hooks/useAssetLookup';
import { Asset, AssetClass } from '@/types/portfolio';
import { formatCurrency } from '@/lib/portfolio-utils';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Pencil, Plus, PlusCircle, Trash2 } from 'lucide-react';
import { PendingAssetDialog } from './PendingAssetDialog';
import { Skeleton } from '@/components/ui/skeleton';

interface PendingAssetsProps {
  onCreateAsset: (data: { name: string; class: AssetClass }) => void;
  existingAssets: Asset[];
}

export function PendingAssets({ onCreateAsset, existingAssets }: PendingAssetsProps) {
  const { pendingAssets, isLoading, addPendingAsset, updatePendingAsset, deletePendingAsset, totalValue } = usePendingAssets();
  const { findAssetsByName } = useAssetLookup(existingAssets);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<PendingAsset | null>(null);

  const getExistingHoldingsCount = (assetName: string): number => {
    return findAssetsByName(assetName).length;
  };

  const handleCreateAsset = (asset: PendingAsset) => {
    onCreateAsset({ name: asset.name, class: asset.asset_class as AssetClass });
  };

  const handleRemove = async (id: string) => {
    await deletePendingAsset(id);
  };

  const handleAddPendingAsset = async (name: string, assetClass: AssetClass, valueUsd: number) => {
    await addPendingAsset(name, assetClass, valueUsd);
  };

  const handleEdit = (asset: PendingAsset) => {
    setEditingAsset(asset);
    setIsDialogOpen(true);
  };

  const handleUpdatePendingAsset = async (id: string, assetClass: AssetClass, valueUsd: number) => {
    await updatePendingAsset(id, assetClass, valueUsd);
    setEditingAsset(null);
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingAsset(null);
  };

  if (isLoading) {
    return (
      <Card className="bg-gradient-to-br from-muted/30 to-muted/10 shadow-card border-border/50">
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="bg-gradient-to-br from-muted/30 to-muted/10 shadow-card border-border/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-bold text-foreground">Pending Assets</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Total: {formatCurrency(totalValue, 'USD')}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsDialogOpen(true)}
              className="gap-1"
            >
              <Plus className="h-4 w-4" />
              Add
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {pendingAssets.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <p className="text-sm">No pending assets</p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsDialogOpen(true)}
                className="mt-2 gap-1"
              >
                <PlusCircle className="h-4 w-4" />
                Add your first pending asset
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Name</TableHead>
                  <TableHead className="text-xs">Class</TableHead>
                  <TableHead className="text-xs text-right">Value (USD)</TableHead>
                  <TableHead className="text-xs w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingAssets.map((asset) => (
                  <TableRow key={asset.id}>
                    <TableCell className="text-sm font-medium py-2">
                      <div className="flex items-center gap-2">
                        {asset.name}
                        {(() => {
                          const count = getExistingHoldingsCount(asset.name);
                          if (count > 0) {
                            return (
                              <Badge className="text-xs px-1.5 py-0 bg-primary/20 text-primary border-primary/30">
                                {count} holding{count > 1 ? 's' : ''}
                              </Badge>
                            );
                          }
                          return null;
                        })()}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground py-2">
                      {asset.asset_class}
                    </TableCell>
                    <TableCell className="text-sm font-mono text-right py-2">
                      {formatCurrency(asset.value_usd, 'USD')}
                    </TableCell>
                    <TableCell className="py-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => handleEdit(asset)}
                            className="gap-2"
                          >
                            <Pencil className="h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleCreateAsset(asset)}
                            className="gap-2"
                          >
                            <PlusCircle className="h-4 w-4" />
                            Create Asset
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleRemove(asset.id)}
                            className="gap-2 text-destructive focus:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                            Remove
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <PendingAssetDialog
        isOpen={isDialogOpen}
        onClose={handleDialogClose}
        onSave={handleAddPendingAsset}
        onUpdate={handleUpdatePendingAsset}
        existingAssets={existingAssets}
        editingAsset={editingAsset}
      />
    </>
  );
}

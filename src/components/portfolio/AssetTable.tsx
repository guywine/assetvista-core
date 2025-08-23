import { useState, useMemo } from 'react';
import { Asset, ViewCurrency, FXRates, FilterCriteria, AssetCalculations } from '@/types/portfolio';
import { calculateAssetValue, calculatePercentages, formatCurrency, formatPercentage } from '@/lib/portfolio-utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Edit2, Plus } from 'lucide-react';

interface AssetTableProps {
  assets: Asset[];
  viewCurrency: ViewCurrency;
  fxRates: FXRates;
  filters: FilterCriteria;
  onEditAsset: (asset: Asset) => void;
  onAddAsset: () => void;
}

export function AssetTable({ 
  assets, 
  viewCurrency, 
  fxRates, 
  filters, 
  onEditAsset, 
  onAddAsset 
}: AssetTableProps) {
  const [sortField, setSortField] = useState<keyof Asset>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const filteredAssets = useMemo(() => {
    return assets.filter(asset => {
      if (filters.class && !filters.class.includes(asset.class)) return false;
      if (filters.sub_class && !filters.sub_class.includes(asset.sub_class)) return false;
      if (filters.account_entity && !filters.account_entity.includes(asset.account_entity)) return false;
      if (filters.account_bank && !filters.account_bank.includes(asset.account_bank)) return false;
      if (filters.origin_currency && !filters.origin_currency.includes(asset.origin_currency)) return false;
      
      if (filters.maturity_date_from && asset.maturity_date) {
        if (asset.maturity_date < filters.maturity_date_from) return false;
      }
      if (filters.maturity_date_to && asset.maturity_date) {
        if (asset.maturity_date > filters.maturity_date_to) return false;
      }
      
      return true;
    });
  }, [assets, filters]);

  const calculations = useMemo(() => {
    const calcs = new Map<string, AssetCalculations>();
    filteredAssets.forEach(asset => {
      calcs.set(asset.id, calculateAssetValue(asset, fxRates, viewCurrency));
    });
    return calculatePercentages(filteredAssets, calcs);
  }, [filteredAssets, fxRates, viewCurrency]);

  const sortedAssets = useMemo(() => {
    return [...filteredAssets].sort((a, b) => {
      let aValue: any = a[sortField];
      let bValue: any = b[sortField];
      
      // Handle special case for calculated values
      if (sortField === 'name' && calculations.has(a.id) && calculations.has(b.id)) {
        // You can add custom sorting logic here if needed
      }
      
      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }
      
      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredAssets, calculations, sortField, sortDirection]);

  const totalValue = useMemo(() => {
    return filteredAssets.reduce((sum, asset) => {
      const calc = calculations.get(asset.id);
      return sum + (calc?.display_value || 0);
    }, 0);
  }, [filteredAssets, calculations]);

  const handleSort = (field: keyof Asset) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getClassBadgeVariant = (assetClass: string) => {
    switch (assetClass) {
      case 'Public Equity': return 'default';
      case 'Private Equity': return 'secondary';
      case 'Fixed Income': return 'outline';
      default: return 'default';
    }
  };

  return (
    <Card className="bg-gradient-to-br from-card to-muted/20 shadow-card border-border/50">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div>
          <CardTitle className="text-2xl font-bold text-financial-primary">Portfolio Assets</CardTitle>
          <p className="text-muted-foreground mt-1">
            {filteredAssets.length} assets • Total Value: {formatCurrency(totalValue, viewCurrency)}
          </p>
        </div>
        <Button 
          onClick={onAddAsset} 
          className="bg-gradient-to-r from-financial-primary to-financial-primary/80 hover:from-financial-primary/90 hover:to-financial-primary/70 text-white shadow-financial"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Asset
        </Button>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border border-border/50 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/70">
                <TableHead 
                  className="cursor-pointer font-semibold text-financial-primary" 
                  onClick={() => handleSort('name')}
                >
                  Name
                </TableHead>
                <TableHead 
                  className="cursor-pointer font-semibold text-financial-primary" 
                  onClick={() => handleSort('class')}
                >
                  Class
                </TableHead>
                <TableHead 
                  className="cursor-pointer font-semibold text-financial-primary" 
                  onClick={() => handleSort('account_entity')}
                >
                  Entity
                </TableHead>
                <TableHead 
                  className="cursor-pointer font-semibold text-financial-primary" 
                  onClick={() => handleSort('quantity')}
                >
                  Quantity
                </TableHead>
                <TableHead 
                  className="cursor-pointer font-semibold text-financial-primary" 
                  onClick={() => handleSort('price')}
                >
                  Price
                </TableHead>
                <TableHead className="cursor-pointer font-semibold text-financial-primary">
                  Value ({viewCurrency})
                </TableHead>
                <TableHead className="cursor-pointer font-semibold text-financial-primary">
                  % of Total
                </TableHead>
                <TableHead className="font-semibold text-financial-primary">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedAssets.map((asset) => {
                const calc = calculations.get(asset.id);
                return (
                  <TableRow 
                    key={asset.id} 
                    className="hover:bg-muted/30 transition-colors border-border/30"
                  >
                    <TableCell className="font-medium text-foreground">
                      {asset.name}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getClassBadgeVariant(asset.class)} className="text-xs">
                        {asset.class}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{asset.account_entity}</TableCell>
                    <TableCell className="text-right font-mono">
                      {asset.quantity.toLocaleString(undefined, { maximumFractionDigits: 4 })}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatCurrency(asset.price, asset.origin_currency as ViewCurrency)}
                    </TableCell>
                    <TableCell className="text-right font-mono font-semibold text-financial-success">
                      {calc ? formatCurrency(calc.display_value, viewCurrency) : '-'}
                    </TableCell>
                    <TableCell className="text-right font-mono text-muted-foreground">
                      {calc ? formatPercentage(calc.percentage_of_scope) : '-'}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEditAsset(asset)}
                        className="h-8 w-8 p-0 hover:bg-muted/50"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        
        {filteredAssets.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-lg">No assets match your current filters</p>
            <Button 
              onClick={onAddAsset} 
              variant="outline" 
              className="mt-4"
            >
              Add Your First Asset
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
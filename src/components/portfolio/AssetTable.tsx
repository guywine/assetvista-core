import React, { useMemo, useState } from 'react';
import { Asset, ViewCurrency, FXRates, FilterCriteria, GroupedAssets } from '@/types/portfolio';
import { calculateAssetValue, calculatePercentages, formatCurrency, formatPercentage, filterAssetsByFilters } from '@/lib/portfolio-utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ArrowUpDown, ArrowUp, ArrowDown, MoreHorizontal, Edit, Trash2, ChevronRight, ChevronDown, Plus } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { GroupByField } from './PortfolioGrouping';
import { format } from 'date-fns';

interface AssetTableProps {
  assets: Asset[];
  viewCurrency: ViewCurrency;
  fxRates: FXRates;
  filters: FilterCriteria;
  groupByFields?: GroupByField[];
  groupSortBy?: 'value' | 'alphabetical';
  onEditAsset: (asset: Asset) => void;
  onDeleteAsset: (asset: Asset) => void;
  onDuplicateAsset: (asset: Asset) => void;
  onAddAsset: () => void;
}

export function AssetTable({ 
  assets, 
  viewCurrency, 
  fxRates, 
  filters, 
  groupByFields = [],
  groupSortBy = 'value',
  onEditAsset, 
  onDeleteAsset, 
  onDuplicateAsset,
  onAddAsset 
}: AssetTableProps) {
  const [sortField, setSortField] = useState<keyof Asset | 'value' | 'percentage' | 'updated_at'>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [deletingAsset, setDeletingAsset] = useState<Asset | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // Filter assets based on current filters
  const filteredAssets = useMemo(() => {
    return filterAssetsByFilters(assets, filters);
  }, [assets, filters]);

  // Group assets if groupByFields is provided
  const groupedAssets = useMemo(() => {
    if (groupByFields.length === 0) return null;
    
    const groups: { [key: string]: Asset[] } = {};
    
    filteredAssets.forEach(asset => {
      const groupKey = groupByFields.map(field => String(asset[field])).join(' • ');
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(asset);
    });

    // Calculate total value of all filtered assets for percentage calculation
    const totalFilteredValue = filteredAssets.reduce((sum, asset) => {
      const calc = calculateAssetValue(asset, fxRates, viewCurrency);
      return sum + calc.display_value;
    }, 0);

    const groupedData = Object.entries(groups).map(([key, assets]): GroupedAssets => {
      // Sort assets within group by value (descending)
      const sortedAssets = assets.sort((a, b) => {
        const aCalc = calculateAssetValue(a, fxRates, viewCurrency);
        const bCalc = calculateAssetValue(b, fxRates, viewCurrency);
        return bCalc.display_value - aCalc.display_value;
      });

      const calculations = sortedAssets.map(asset => calculateAssetValue(asset, fxRates, viewCurrency));
      const totalValue = calculations.reduce((sum, calc) => sum + calc.display_value, 0);
      const percentageOfTotal = totalFilteredValue > 0 ? (totalValue / totalFilteredValue) * 100 : 0;

      return {
        key,
        assets: sortedAssets,
        aggregates: {
          totalValue,
          assetCount: sortedAssets.length,
          percentageOfTotal,
        },
      };
    });

    // Sort groups based on user preference
    return groupedData.sort((a, b) => {
      if (groupSortBy === 'value') {
        return b.aggregates.totalValue - a.aggregates.totalValue;
      } else {
        return a.key.localeCompare(b.key);
      }
    });
  }, [filteredAssets, groupByFields, fxRates, viewCurrency, groupSortBy]);

  // Calculate aggregated data based on filtered assets
  const { calculations, sortedAssets } = useMemo(() => {
    const calcs = filteredAssets.map(asset => ({
      asset,
      calculation: calculateAssetValue(asset, fxRates, viewCurrency),
    }));

    const calculationsWithPercentages = calculatePercentages(
      filteredAssets,
      new Map(calcs.map(({ asset, calculation }) => [asset.id, calculation]))
    );

    // Sort assets
    const sorted = [...calcs].sort((a, b) => {
      let aValue: any, bValue: any;

      if (sortField === 'value') {
        aValue = calculationsWithPercentages.get(a.asset.id)?.display_value || 0;
        bValue = calculationsWithPercentages.get(b.asset.id)?.display_value || 0;
      } else if (sortField === 'percentage') {
        aValue = calculationsWithPercentages.get(a.asset.id)?.percentage_of_scope || 0;
        bValue = calculationsWithPercentages.get(b.asset.id)?.percentage_of_scope || 0;
      } else {
        aValue = a.asset[sortField as keyof Asset];
        bValue = b.asset[sortField as keyof Asset];
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        const comparison = aValue.localeCompare(bValue);
        return sortDirection === 'asc' ? comparison : -comparison;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return {
      calculations: calculationsWithPercentages,
      sortedAssets: sorted,
    };
  }, [filteredAssets, fxRates, viewCurrency, sortField, sortDirection]);

  const handleSort = (field: keyof Asset | 'value' | 'percentage' | 'updated_at') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const toggleGroup = (groupKey: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupKey)) {
      newExpanded.delete(groupKey);
    } else {
      newExpanded.add(groupKey);
    }
    setExpandedGroups(newExpanded);
  };

  const getSortIcon = (field: keyof Asset | 'value' | 'percentage' | 'updated_at') => {
    if (sortField !== field) return <ArrowUpDown className="ml-2 h-4 w-4" />;
    return sortDirection === 'asc' ? <ArrowUp className="ml-2 h-4 w-4" /> : <ArrowDown className="ml-2 h-4 w-4" />;
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
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Assets ({filteredAssets.length})</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Total Value: {formatCurrency(
                filteredAssets.reduce((sum, asset) => {
                  const calculation = calculateAssetValue(asset, fxRates, viewCurrency);
                  return sum + calculation.display_value;
                }, 0),
                viewCurrency
              )}
            </p>
          </div>
          <Button 
            onClick={onAddAsset}
            className="bg-gradient-to-r from-financial-success to-financial-success/80 hover:from-financial-success/90 hover:to-financial-success/70 text-white shadow-lg"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Asset
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="cursor-pointer" onClick={() => handleSort('name')}>
                  <div className="flex items-center">
                    Name
                    {getSortIcon('name')}
                  </div>
                </TableHead>
                <TableHead className="cursor-pointer" onClick={() => handleSort('class')}>
                  <div className="flex items-center">
                    Class
                    {getSortIcon('class')}
                  </div>
                </TableHead>
                <TableHead className="cursor-pointer" onClick={() => handleSort('sub_class')}>
                  <div className="flex items-center">
                    Sub Class
                    {getSortIcon('sub_class')}
                  </div>
                </TableHead>
                <TableHead className="cursor-pointer" onClick={() => handleSort('account_entity')}>
                  <div className="flex items-center">
                    Entity
                    {getSortIcon('account_entity')}
                  </div>
                </TableHead>
                <TableHead className="cursor-pointer" onClick={() => handleSort('account_bank')}>
                  <div className="flex items-center">
                    Bank Account
                    {getSortIcon('account_bank')}
                  </div>
                </TableHead>
                <TableHead className="cursor-pointer" onClick={() => handleSort('origin_currency')}>
                  <div className="flex items-center">
                    Currency
                    {getSortIcon('origin_currency')}
                  </div>
                </TableHead>
                <TableHead className="cursor-pointer text-right" onClick={() => handleSort('quantity')}>
                  <div className="flex items-center justify-end">
                    Quantity
                    {getSortIcon('quantity')}
                  </div>
                </TableHead>
                <TableHead className="cursor-pointer text-right" onClick={() => handleSort('price')}>
                  <div className="flex items-center justify-end">
                    Price
                    {getSortIcon('price')}
                  </div>
                </TableHead>
                <TableHead className="cursor-pointer text-right" onClick={() => handleSort('value')}>
                  <div className="flex items-center justify-end">
                    Value ({viewCurrency})
                    {getSortIcon('value')}
                  </div>
                </TableHead>
                <TableHead className="cursor-pointer text-right" onClick={() => handleSort('percentage')}>
                  <div className="flex items-center justify-end">
                    % of Total
                    {getSortIcon('percentage')}
                  </div>
                </TableHead>
                <TableHead className="cursor-pointer" onClick={() => handleSort('updated_at')}>
                  <div className="flex items-center">
                    Last Updated
                    {getSortIcon('updated_at')}
                  </div>
                </TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {groupedAssets ? (
                // Grouped rendering
                groupedAssets.map((group) => (
                  <React.Fragment key={group.key}>
                    {/* Group header row */}
                    <TableRow className="bg-muted/30 hover:bg-muted/50 border-t-2 border-muted">
                      <TableCell 
                        colSpan={12} 
                        className="font-semibold cursor-pointer"
                        onClick={() => toggleGroup(group.key)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {expandedGroups.has(group.key) ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                            <span>{group.key}</span>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span>Value: {formatCurrency(group.aggregates.totalValue, viewCurrency)} ({formatPercentage(group.aggregates.percentageOfTotal)} of total)</span>
                            <span>Assets: {group.aggregates.assetCount}</span>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                    
                    {/* Group assets (if expanded) */}
                    {expandedGroups.has(group.key) && group.assets.map((asset) => {
                      const calculation = calculations.get(asset.id);
                      if (!calculation) return null;

                      return (
                        <TableRow key={asset.id} className="hover:bg-muted/50">
                          <TableCell className="font-medium pl-8">{asset.class === 'Cash' ? '' : asset.name}</TableCell>
                          <TableCell>{asset.class}</TableCell>
                          <TableCell>{asset.class === 'Cash' ? '' : asset.sub_class}</TableCell>
                          <TableCell>{asset.account_entity}</TableCell>
                          <TableCell>{asset.account_bank}</TableCell>
                          <TableCell>{asset.origin_currency}</TableCell>
                          <TableCell className="text-right">{asset.quantity.toLocaleString()}</TableCell>
                          <TableCell className="text-right">{asset.price}</TableCell>
                          <TableCell className="text-right font-semibold">
                            {formatCurrency(calculation.display_value, viewCurrency)}
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground">
                            {formatPercentage(calculation.percentage_of_scope)}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {formatLastUpdated(asset.updated_at)}
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                  <span className="sr-only">Open menu</span>
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                               <DropdownMenuContent align="end">
                                 <DropdownMenuItem onClick={() => onEditAsset(asset)}>
                                   <Edit className="mr-2 h-4 w-4" />
                                   Edit
                                 </DropdownMenuItem>
                                 <DropdownMenuItem onClick={() => onDuplicateAsset(asset)}>
                                   Duplicate Holding
                                 </DropdownMenuItem>
                                 <DropdownMenuItem 
                                   onClick={() => setDeletingAsset(asset)}
                                   className="text-destructive"
                                 >
                                   <Trash2 className="mr-2 h-4 w-4" />
                                   Delete
                                 </DropdownMenuItem>
                               </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </React.Fragment>
                ))
              ) : (
                // Standard rendering (no grouping)
                sortedAssets.map(({ asset }) => {
                  const calculation = calculations.get(asset.id);
                  if (!calculation) return null;

                  return (
                    <TableRow key={asset.id} className="hover:bg-muted/50">
                      <TableCell className="font-medium">{asset.class === 'Cash' ? '' : asset.name}</TableCell>
                      <TableCell>{asset.class}</TableCell>
                      <TableCell>{asset.class === 'Cash' ? '' : asset.sub_class}</TableCell>
                      <TableCell>{asset.account_entity}</TableCell>
                      <TableCell>{asset.account_bank}</TableCell>
                      <TableCell>{asset.origin_currency}</TableCell>
                      <TableCell className="text-right">{asset.quantity.toLocaleString()}</TableCell>
                      <TableCell className="text-right">{asset.price}</TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatCurrency(calculation.display_value, viewCurrency)}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {formatPercentage(calculation.percentage_of_scope)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatLastUpdated(asset.updated_at)}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Open menu</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                           <DropdownMenuContent align="end">
                             <DropdownMenuItem onClick={() => onEditAsset(asset)}>
                               <Edit className="mr-2 h-4 w-4" />
                               Edit
                             </DropdownMenuItem>
                             <DropdownMenuItem onClick={() => onDuplicateAsset(asset)}>
                               Duplicate Holding
                             </DropdownMenuItem>
                             <DropdownMenuItem 
                               onClick={() => setDeletingAsset(asset)}
                               className="text-destructive"
                             >
                               <Trash2 className="mr-2 h-4 w-4" />
                               Delete
                             </DropdownMenuItem>
                           </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
              
              {(groupedAssets ? groupedAssets.length === 0 : sortedAssets.length === 0) && (
                <TableRow>
                  <TableCell colSpan={12} className="text-center py-8 text-muted-foreground">
                    {filteredAssets.length === 0 ? (
                      <div className="space-y-3">
                        <p>No assets match the current filters.</p>
                        <Button onClick={onAddAsset} variant="outline">
                          Add Asset
                        </Button>
                      </div>
                    ) : (
                      "No assets to display"
                    )}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <AlertDialog open={!!deletingAsset} onOpenChange={() => setDeletingAsset(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Asset</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{deletingAsset?.name}"? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (deletingAsset) {
                    onDeleteAsset(deletingAsset);
                    setDeletingAsset(null);
                  }
                }}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
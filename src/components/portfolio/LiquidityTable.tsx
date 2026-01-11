import { useMemo } from 'react';
import { Asset, FXRates, ViewCurrency, Beneficiary } from '@/types/portfolio';
import { BENEFICIARIES } from '@/constants/portfolio';
import { 
  LIQUIDITY_CATEGORIES, 
  LIQUIDITY_CATEGORY_DESCRIPTIONS,
  calculateLiquidityMatrix,
  type LiquidityCategory 
} from '@/lib/liquidity-utils';
import { formatCurrency } from '@/lib/portfolio-utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ChevronDown, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LiquiditySettingsDialog } from './LiquiditySettingsDialog';
import { useLimitedLiquidityAssets } from '@/hooks/useLimitedLiquidityAssets';

interface LiquidityTableProps {
  assets: Asset[];
  viewCurrency: ViewCurrency;
  fxRates: FXRates;
}

export function LiquidityTable({ assets, viewCurrency, fxRates }: LiquidityTableProps) {
  const { 
    limitedLiquidityAssets, 
    isLoading, 
    addLimitedLiquidityAsset, 
    removeLimitedLiquidityAsset 
  } = useLimitedLiquidityAssets();

  const matrixData = useMemo(() => {
    return calculateLiquidityMatrix(
      assets,
      limitedLiquidityAssets,
      fxRates,
      viewCurrency
    );
  }, [assets, limitedLiquidityAssets, fxRates, viewCurrency]);

  const formatValue = (value: number): string => {
    return formatCurrency(value, viewCurrency);
  };

  const getCellClassName = (value: number): string => {
    if (value === 0) return 'text-muted-foreground';
    return 'font-medium';
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Liquidity Table</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-32 flex items-center justify-center text-muted-foreground">
            Loading...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-xl font-bold">Liquidity Table</CardTitle>
        <LiquiditySettingsDialog
          assets={assets}
          limitedLiquidityAssets={limitedLiquidityAssets}
          onAdd={addLimitedLiquidityAsset}
          onRemove={removeLimitedLiquidityAsset}
        />
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[200px] font-bold">Category</TableHead>
                {BENEFICIARIES.map(beneficiary => (
                  <TableHead key={beneficiary} className="text-right font-bold min-w-[100px]">
                    {beneficiary}
                  </TableHead>
                ))}
                <TableHead className="text-right font-bold min-w-[120px] bg-muted/30">
                  Total
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {LIQUIDITY_CATEGORIES.map(category => {
                const beneficiaryMap = matrixData.matrix.get(category);
                const rowTotal = matrixData.rowTotals.get(category) || 0;
                
                return (
                  <TableRow key={category} className="hover:bg-muted/50">
                    <TableCell className="font-medium">{category}</TableCell>
                    {BENEFICIARIES.map(beneficiary => {
                      const value = beneficiaryMap?.get(beneficiary) || 0;
                      return (
                        <TableCell 
                          key={beneficiary} 
                          className={`text-right ${getCellClassName(value)}`}
                        >
                          {formatValue(value)}
                        </TableCell>
                      );
                    })}
                    <TableCell className="text-right font-bold bg-muted/30">
                      {formatValue(rowTotal)}
                    </TableCell>
                  </TableRow>
                );
              })}
              
              {/* Totals row */}
              <TableRow className="bg-muted/50 hover:bg-muted/70 font-bold border-t-2">
                <TableCell className="font-bold">TOTAL</TableCell>
                {BENEFICIARIES.map(beneficiary => {
                  const columnTotal = matrixData.columnTotals.get(beneficiary) || 0;
                  return (
                    <TableCell key={beneficiary} className="text-right font-bold">
                      {formatValue(columnTotal)}
                    </TableCell>
                  );
                })}
                <TableCell className="text-right font-bold bg-primary/10">
                  {formatValue(matrixData.grandTotal)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>

        {/* Category descriptions */}
        <Collapsible>
          <CollapsibleTrigger className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ChevronDown className="h-4 w-4" />
            <span>What's included in each category?</span>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-3">
            <ul className="text-sm text-muted-foreground space-y-1.5 pl-6">
              {LIQUIDITY_CATEGORIES.map(category => (
                <li key={category}>
                  <strong className="text-foreground">{category}:</strong>{' '}
                  {LIQUIDITY_CATEGORY_DESCRIPTIONS[category]}
                </li>
              ))}
            </ul>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}

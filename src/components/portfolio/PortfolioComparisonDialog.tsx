import { PortfolioSnapshot, FXRates } from '@/types/portfolio';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import { useState } from "react";
import {
  calculatePortfolioDeltas,
  calculatePublicEquityDeltas,
  getTopDeltas,
  formatCurrencyValue,
  findNewAndDeletedPositions,
  AssetDelta,
  PositionChange
} from '@/lib/portfolio-comparison-utils';
import { Badge } from "@/components/ui/badge";

interface PortfolioComparisonDialogProps {
  portfolioA: PortfolioSnapshot | null;
  portfolioB: PortfolioSnapshot | null;
  currentFxRates: FXRates;
  isOpen: boolean;
  onClose: () => void;
}

export function PortfolioComparisonDialog({
  portfolioA,
  portfolioB,
  currentFxRates,
  isOpen,
  onClose,
}: PortfolioComparisonDialogProps) {
  const [openSections, setOpenSections] = useState({
    cash: true,
    publicEquity: true,
    fixedIncome: true,
    privateEquity: true,
    realEstate: true,
    newDeletedPositions: true,
  });

  if (!portfolioA || !portfolioB) return null;

  const cashDeltas = getTopDeltas(
    calculatePortfolioDeltas(portfolioA, portfolioB, currentFxRates, 'cash'),
    10
  ).filter(d => d.deltaUSD !== 0);

  const publicEquityDeltas = getTopDeltas(
    calculatePublicEquityDeltas(portfolioA, portfolioB, currentFxRates),
    15
  ).filter(d => d.deltaUSD !== 0);

  const fixedIncomeDeltas = getTopDeltas(
    calculatePortfolioDeltas(portfolioA, portfolioB, currentFxRates, 'fixed_income'),
    10
  ).filter(d => d.deltaUSD !== 0);

  const privateEquityDeltas = getTopDeltas(
    calculatePortfolioDeltas(portfolioA, portfolioB, currentFxRates, 'private_equity'),
    10
  ).filter(d => d.deltaUSD !== 0);

  const realEstateDeltas = getTopDeltas(
    calculatePortfolioDeltas(portfolioA, portfolioB, currentFxRates, 'real_estate'),
    10
  ).filter(d => d.deltaUSD !== 0);

  const positionChanges = findNewAndDeletedPositions(portfolioA, portfolioB, currentFxRates);

  const DeltaTable = ({ deltas, portfolioAName, portfolioBName }: { 
    deltas: AssetDelta[], 
    portfolioAName: string, 
    portfolioBName: string 
  }) => {
    if (deltas.length === 0) {
      return (
        <div className="text-sm text-muted-foreground p-4 text-center">
          No changes found
        </div>
      );
    }

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[35%]">Asset Name</TableHead>
            <TableHead className="text-right w-[20%]">{portfolioAName}</TableHead>
            <TableHead className="text-right w-[20%]">{portfolioBName}</TableHead>
            <TableHead className="text-right w-[25%]">Delta</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {deltas.map((delta, index) => {
            const isPositive = delta.deltaUSD > 0;
            const isNegative = delta.deltaUSD < 0;
            
            return (
              <TableRow key={`${delta.assetName}-${index}`}>
                <TableCell className="font-medium">{delta.assetName}</TableCell>
                <TableCell className="text-right text-muted-foreground">
                  {delta.valueA === 0 ? '-' : formatCurrencyValue(delta.valueA, delta.originCurrency)}
                </TableCell>
                <TableCell className="text-right text-muted-foreground">
                  {delta.valueB === 0 ? '-' : formatCurrencyValue(delta.valueB, delta.originCurrency)}
                </TableCell>
                <TableCell className={`text-right font-semibold ${
                  isPositive ? 'text-financial-success' : isNegative ? 'text-destructive' : 'text-muted-foreground'
                }`}>
                  {isPositive && '+'}
                  {formatCurrencyValue(delta.deltaUSD, 'USD')}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    );
  };

  const PublicEquityDeltaTable = ({ deltas, portfolioAName, portfolioBName }: { 
    deltas: AssetDelta[], 
    portfolioAName: string, 
    portfolioBName: string 
  }) => {
    if (deltas.length === 0) {
      return (
        <div className="text-sm text-muted-foreground p-4 text-center">
          No changes found
        </div>
      );
    }

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[28%]">Asset Name</TableHead>
            <TableHead className="text-right w-[18%]">{portfolioAName}</TableHead>
            <TableHead className="text-right w-[18%]">{portfolioBName}</TableHead>
            <TableHead className="text-right w-[22%]">Delta</TableHead>
            <TableHead className="text-right w-[14%]">Price%</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {deltas.map((delta, index) => {
            const isPositive = delta.deltaUSD > 0;
            const isNegative = delta.deltaUSD < 0;
            const priceIsPositive = delta.priceChangePercent !== undefined && delta.priceChangePercent > 0;
            const priceIsNegative = delta.priceChangePercent !== undefined && delta.priceChangePercent < 0;
            
            return (
              <TableRow key={`${delta.assetName}-${index}`}>
                <TableCell className="font-medium">{delta.assetName}</TableCell>
                <TableCell className="text-right text-muted-foreground">
                  {delta.valueA === 0 ? '-' : formatCurrencyValue(delta.valueA, delta.originCurrency)}
                </TableCell>
                <TableCell className="text-right text-muted-foreground">
                  {delta.valueB === 0 ? '-' : formatCurrencyValue(delta.valueB, delta.originCurrency)}
                </TableCell>
                <TableCell className={`text-right font-semibold ${
                  isPositive ? 'text-financial-success' : isNegative ? 'text-destructive' : 'text-muted-foreground'
                }`}>
                  {isPositive && '+'}
                  {formatCurrencyValue(delta.deltaUSD, 'USD')}
                </TableCell>
                <TableCell className={`text-right font-semibold ${
                  delta.priceChangePercent === undefined 
                    ? 'text-muted-foreground' 
                    : priceIsPositive 
                    ? 'text-financial-success' 
                    : priceIsNegative 
                    ? 'text-destructive'
                    : 'text-muted-foreground'
                }`}>
                  {delta.priceChangePercent !== undefined 
                    ? `${delta.priceChangePercent >= 0 ? '+' : ''}${delta.priceChangePercent.toFixed(2)}%`
                    : '-'
                  }
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    );
  };

  const PositionChangesTable = ({ changes }: { changes: PositionChange[] }) => {
    if (changes.length === 0) {
      return (
        <div className="text-sm text-muted-foreground p-4 text-center">
          No new or deleted positions found
        </div>
      );
    }

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[30%]">Asset Name</TableHead>
            <TableHead className="w-[20%]">Class / Sub-class</TableHead>
            <TableHead className="text-right w-[18%]">Value</TableHead>
            <TableHead className="text-right w-[18%]">Value (USD)</TableHead>
            <TableHead className="text-center w-[14%]">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {changes.map((change, index) => (
            <TableRow key={`${change.assetName}-${index}`}>
              <TableCell className="font-medium">{change.assetName}</TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {change.assetClass} / {change.subClass}
              </TableCell>
              <TableCell className="text-right text-muted-foreground">
                {formatCurrencyValue(change.value, change.originCurrency)}
              </TableCell>
              <TableCell className="text-right text-muted-foreground">
                {formatCurrencyValue(change.valueUSD, 'USD')}
              </TableCell>
              <TableCell className="text-center">
                <Badge 
                  variant={change.changeType === 'new' ? 'default' : 'destructive'}
                  className={change.changeType === 'new' ? 'bg-financial-success hover:bg-financial-success/80' : ''}
                >
                  {change.changeType === 'new' ? 'New' : 'Deleted'}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:max-w-3xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Portfolio Comparison</SheetTitle>
          <p className="text-sm text-muted-foreground">
            {portfolioA.name} vs {portfolioB.name}
          </p>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {/* Cash Delta */}
          <Collapsible
            open={openSections.cash}
            onOpenChange={(open) => setOpenSections({ ...openSections, cash: open })}
          >
            <div className="border rounded-lg">
              <CollapsibleTrigger className="w-full px-4 py-3 flex items-center justify-between hover:bg-muted/50 transition-colors">
                <h3 className="font-semibold">Cash Delta (Top 10)</h3>
                <ChevronDown className={`h-5 w-5 transition-transform ${openSections.cash ? 'rotate-180' : ''}`} />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="border-t">
                  <DeltaTable 
                    deltas={cashDeltas} 
                    portfolioAName={portfolioA.name}
                    portfolioBName={portfolioB.name}
                  />
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>

          {/* Public Equity Delta */}
          <Collapsible
            open={openSections.publicEquity}
            onOpenChange={(open) => setOpenSections({ ...openSections, publicEquity: open })}
          >
            <div className="border rounded-lg">
              <CollapsibleTrigger className="w-full px-4 py-3 flex items-center justify-between hover:bg-muted/50 transition-colors">
                <h3 className="font-semibold">Public Equity Delta (Top 15)</h3>
                <ChevronDown className={`h-5 w-5 transition-transform ${openSections.publicEquity ? 'rotate-180' : ''}`} />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="border-t">
                  <PublicEquityDeltaTable 
                    deltas={publicEquityDeltas} 
                    portfolioAName={portfolioA.name}
                    portfolioBName={portfolioB.name}
                  />
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>

          {/* Fixed Income Delta */}
          <Collapsible
            open={openSections.fixedIncome}
            onOpenChange={(open) => setOpenSections({ ...openSections, fixedIncome: open })}
          >
            <div className="border rounded-lg">
              <CollapsibleTrigger className="w-full px-4 py-3 flex items-center justify-between hover:bg-muted/50 transition-colors">
                <h3 className="font-semibold">Fixed Income Delta (Top 10)</h3>
                <ChevronDown className={`h-5 w-5 transition-transform ${openSections.fixedIncome ? 'rotate-180' : ''}`} />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="border-t">
                  <DeltaTable 
                    deltas={fixedIncomeDeltas} 
                    portfolioAName={portfolioA.name}
                    portfolioBName={portfolioB.name}
                  />
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>

          {/* Private Equity Delta */}
          <Collapsible
            open={openSections.privateEquity}
            onOpenChange={(open) => setOpenSections({ ...openSections, privateEquity: open })}
          >
            <div className="border rounded-lg">
              <CollapsibleTrigger className="w-full px-4 py-3 flex items-center justify-between hover:bg-muted/50 transition-colors">
                <h3 className="font-semibold">Private Equity Delta (Top 10)</h3>
                <ChevronDown className={`h-5 w-5 transition-transform ${openSections.privateEquity ? 'rotate-180' : ''}`} />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="border-t">
                  <DeltaTable 
                    deltas={privateEquityDeltas} 
                    portfolioAName={portfolioA.name}
                    portfolioBName={portfolioB.name}
                  />
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>

          {/* Real Estate Delta */}
          <Collapsible
            open={openSections.realEstate}
            onOpenChange={(open) => setOpenSections({ ...openSections, realEstate: open })}
          >
            <div className="border rounded-lg">
              <CollapsibleTrigger className="w-full px-4 py-3 flex items-center justify-between hover:bg-muted/50 transition-colors">
                <h3 className="font-semibold">Real Estate Delta (Top 10)</h3>
                <ChevronDown className={`h-5 w-5 transition-transform ${openSections.realEstate ? 'rotate-180' : ''}`} />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="border-t">
                  <DeltaTable 
                    deltas={realEstateDeltas} 
                    portfolioAName={portfolioA.name}
                    portfolioBName={portfolioB.name}
                  />
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>

          {/* New or Deleted Positions */}
          <Collapsible
            open={openSections.newDeletedPositions}
            onOpenChange={(open) => setOpenSections({ ...openSections, newDeletedPositions: open })}
          >
            <div className="border rounded-lg">
              <CollapsibleTrigger className="w-full px-4 py-3 flex items-center justify-between hover:bg-muted/50 transition-colors">
                <h3 className="font-semibold">New or Deleted Positions</h3>
                <ChevronDown className={`h-5 w-5 transition-transform ${openSections.newDeletedPositions ? 'rotate-180' : ''}`} />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="border-t">
                  <PositionChangesTable changes={positionChanges} />
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>
        </div>
      </SheetContent>
    </Sheet>
  );
}

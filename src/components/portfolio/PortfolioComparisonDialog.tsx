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
  getTopDeltas,
  formatCurrencyValue,
  AssetDelta
} from '@/lib/portfolio-comparison-utils';

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
    liquid: true,
    privateEquity: true,
    realEstate: true,
  });

  if (!portfolioA || !portfolioB) return null;

  const liquidDeltas = getTopDeltas(
    calculatePortfolioDeltas(portfolioA, portfolioB, currentFxRates, 'liquid'),
    20
  );

  const privateEquityDeltas = getTopDeltas(
    calculatePortfolioDeltas(portfolioA, portfolioB, currentFxRates, 'private_equity'),
    10
  );

  const realEstateDeltas = getTopDeltas(
    calculatePortfolioDeltas(portfolioA, portfolioB, currentFxRates, 'real_estate'),
    10
  );

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
          {/* Liquid Portfolio Delta */}
          <Collapsible
            open={openSections.liquid}
            onOpenChange={(open) => setOpenSections({ ...openSections, liquid: open })}
          >
            <div className="border rounded-lg">
              <CollapsibleTrigger className="w-full px-4 py-3 flex items-center justify-between hover:bg-muted/50 transition-colors">
                <h3 className="font-semibold">Liquid Portfolio Delta (Top 20)</h3>
                <ChevronDown className={`h-5 w-5 transition-transform ${openSections.liquid ? 'rotate-180' : ''}`} />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="border-t">
                  <DeltaTable 
                    deltas={liquidDeltas} 
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
        </div>
      </SheetContent>
    </Sheet>
  );
}

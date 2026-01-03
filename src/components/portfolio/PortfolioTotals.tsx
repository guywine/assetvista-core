import { useMemo, useState } from 'react';
import { Asset, ViewCurrency, FXRates, AssetClass } from '@/types/portfolio';
import { calculateAssetValue, formatCurrency } from '@/lib/portfolio-utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PortfolioTotalsProps {
  assets: Asset[];
  viewCurrency: ViewCurrency;
  fxRates: FXRates;
}

interface AssetTotal {
  name: string;
  totalValue: number;
}

interface SubClassTotal {
  subClassName: string;
  subClassTotal: number;
  assets: AssetTotal[];
}

interface ClassTotal {
  className: AssetClass;
  classTotal: number;
  subClasses: SubClassTotal[];
}

export function PortfolioTotals({ assets, viewCurrency, fxRates }: PortfolioTotalsProps) {
  const [expandedClasses, setExpandedClasses] = useState<Set<string>>(new Set());
  const [expandedSubClasses, setExpandedSubClasses] = useState<Set<string>>(new Set());

  // Calculate hierarchical totals: Class > Sub-Class > Asset Name
  const { totalsData, grandTotal } = useMemo(() => {
    if (Object.keys(fxRates).length === 0) {
      return { totalsData: [], grandTotal: 0 };
    }

    // Group assets and calculate values
    const classMap = new Map<AssetClass, Map<string, Map<string, number>>>();

    assets.forEach(asset => {
      const calculation = calculateAssetValue(asset, fxRates, viewCurrency);
      const value = calculation.display_value;

      if (!classMap.has(asset.class)) {
        classMap.set(asset.class, new Map());
      }
      const subClassMap = classMap.get(asset.class)!;

      if (!subClassMap.has(asset.sub_class)) {
        subClassMap.set(asset.sub_class, new Map());
      }
      const assetMap = subClassMap.get(asset.sub_class)!;

      const currentValue = assetMap.get(asset.name) || 0;
      assetMap.set(asset.name, currentValue + value);
    });

    // Convert to structured array and sort
    const totalsData: ClassTotal[] = [];
    let grandTotal = 0;

    // Define class order for consistent display
    const classOrder: AssetClass[] = [
      'Public Equity',
      'Fixed Income',
      'Real Estate',
      'Private Equity',
      'Commodities & more'
    ];

    classOrder.forEach(className => {
      const subClassMap = classMap.get(className);
      if (!subClassMap) return;

      const subClasses: SubClassTotal[] = [];
      let classTotal = 0;

      // Sort sub-classes by value (descending)
      const sortedSubClasses = Array.from(subClassMap.entries())
        .map(([subClassName, assetMap]) => {
          const assets: AssetTotal[] = Array.from(assetMap.entries())
            .map(([name, totalValue]) => ({ name, totalValue }))
            .sort((a, b) => b.totalValue - a.totalValue);
          
          const subClassTotal = assets.reduce((sum, a) => sum + a.totalValue, 0);
          return { subClassName, subClassTotal, assets };
        })
        .sort((a, b) => b.subClassTotal - a.subClassTotal);

      sortedSubClasses.forEach(subClass => {
        subClasses.push(subClass);
        classTotal += subClass.subClassTotal;
      });

      if (classTotal > 0) {
        totalsData.push({ className, classTotal, subClasses });
        grandTotal += classTotal;
      }
    });

    return { totalsData, grandTotal };
  }, [assets, fxRates, viewCurrency]);

  const toggleClass = (className: string) => {
    setExpandedClasses(prev => {
      const next = new Set(prev);
      if (next.has(className)) {
        next.delete(className);
      } else {
        next.add(className);
      }
      return next;
    });
  };

  const toggleSubClass = (key: string) => {
    setExpandedSubClasses(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Portfolio Totals</CardTitle>
          <span className="text-lg font-semibold font-mono">
            {formatCurrency(grandTotal, viewCurrency)}
          </span>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-border/50">
          {totalsData.map(classData => {
            const isClassExpanded = expandedClasses.has(classData.className);
            
            return (
              <Collapsible
                key={classData.className}
                open={isClassExpanded}
                onOpenChange={() => toggleClass(classData.className)}
              >
                <CollapsibleTrigger className="w-full flex justify-between items-center px-4 py-2.5 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-2">
                    <ChevronRight 
                      className={cn(
                        "h-4 w-4 text-muted-foreground transition-transform duration-200",
                        isClassExpanded && "rotate-90"
                      )} 
                    />
                    <span className="font-semibold text-foreground">{classData.className}</span>
                  </div>
                  <span className="font-mono font-semibold text-foreground">
                    {formatCurrency(classData.classTotal, viewCurrency)}
                  </span>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="bg-muted/20">
                    {classData.subClasses.map(subClassData => {
                      const subClassKey = `${classData.className}-${subClassData.subClassName}`;
                      const isSubClassExpanded = expandedSubClasses.has(subClassKey);
                      
                      return (
                        <Collapsible
                          key={subClassKey}
                          open={isSubClassExpanded}
                          onOpenChange={() => toggleSubClass(subClassKey)}
                        >
                          <CollapsibleTrigger className="w-full flex justify-between items-center px-6 py-1.5 hover:bg-muted/30 transition-colors">
                            <div className="flex items-center gap-2">
                              <ChevronRight 
                                className={cn(
                                  "h-3 w-3 text-muted-foreground transition-transform duration-200",
                                  isSubClassExpanded && "rotate-90"
                                )} 
                              />
                              <span className="text-sm text-foreground">{subClassData.subClassName}</span>
                            </div>
                            <span className="font-mono text-sm text-foreground">
                              {formatCurrency(subClassData.subClassTotal, viewCurrency)}
                            </span>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <div className="bg-muted/10">
                              {subClassData.assets.map(asset => (
                                <div 
                                  key={asset.name}
                                  className="flex justify-between items-center px-10 py-1 hover:bg-muted/20 transition-colors"
                                >
                                  <span className="text-sm text-muted-foreground truncate pr-4">
                                    {asset.name}
                                  </span>
                                  <span className="font-mono text-sm text-muted-foreground flex-shrink-0">
                                    {formatCurrency(asset.totalValue, viewCurrency)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </CollapsibleContent>
                        </Collapsible>
                      );
                    })}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

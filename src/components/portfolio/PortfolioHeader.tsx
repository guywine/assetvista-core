import { ViewCurrency, AssetClass } from '@/types/portfolio';
import { formatCurrency } from '@/lib/portfolio-utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { DollarSign, Banknote, TrendingUp, Filter, Plus, Settings } from 'lucide-react';
interface PortfolioHeaderProps {
  viewCurrency: ViewCurrency;
  onViewCurrencyChange: (currency: ViewCurrency) => void;
  totalValue: number;
  assetCount: number;
  classTotals: Array<{
    class: AssetClass;
    value: number;
    count: number;
  }>;
  onManageFX: () => void;
}
export function PortfolioHeader({
  viewCurrency,
  onViewCurrencyChange,
  totalValue,
  assetCount,
  classTotals,
  onManageFX
}: PortfolioHeaderProps) {
  return <div className="space-y-6">
      {/* Main Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-financial-primary to-financial-primary/70 bg-clip-text text-transparent">Simon &amp; Sons</h1>
          <p className="text-muted-foreground mt-2">Portfolio Management Dashboard</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <ToggleGroup type="single" value={viewCurrency} onValueChange={value => value && onViewCurrencyChange(value as ViewCurrency)} className="bg-muted/50 p-1 rounded-lg">
            <ToggleGroupItem value="USD" className="data-[state=on]:bg-financial-primary data-[state=on]:text-white font-semibold px-6">
              <DollarSign className="h-4 w-4 mr-1" />
              USD
            </ToggleGroupItem>
            <ToggleGroupItem value="ILS" className="data-[state=on]:bg-financial-primary data-[state=on]:text-white font-semibold px-6">
              <Banknote className="h-4 w-4 mr-1" />
              ILS
            </ToggleGroupItem>
          </ToggleGroup>

          

        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Value Card */}
        <Card className="bg-gradient-to-br from-financial-primary/5 to-financial-primary/10 border-financial-primary/20 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Portfolio Value</p>
                <h3 className="text-3xl font-bold text-financial-primary mt-1">
                  {formatCurrency(totalValue, viewCurrency)}
                </h3>
              </div>
              <div className="h-12 w-12 bg-financial-primary/10 rounded-full flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-financial-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Custom Breakdown Cards */}
        {(() => {
          // Calculate Liquid + Fixed Income (all except Real Estate and Private Equity)
          const liquidFixedIncome = classTotals
            .filter(item => !['Real Estate', 'Private Equity'].includes(item.class))
            .reduce((sum, item) => ({ value: sum.value + item.value, count: sum.count + item.count }), { value: 0, count: 0 });
          
          // Get Private Equity
          const privateEquity = classTotals.find(item => item.class === 'Private Equity') || { value: 0, count: 0 };
          
          // Get Real Estate
          const realEstate = classTotals.find(item => item.class === 'Real Estate') || { value: 0, count: 0 };

          return [
            { name: 'Liquid + Fixed Income', ...liquidFixedIncome },
            { name: 'Private Equity', ...privateEquity },
            { name: 'Real Estate', ...realEstate }
          ].map(({ name, value, count }) => (
            <Card key={name} className="bg-gradient-to-br from-muted/20 to-muted/40 border-border/50 shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{name}</p>
                    <h3 className="text-2xl font-bold text-foreground mt-1">
                      {formatCurrency(value, viewCurrency)}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">{count} assets</p>
                  </div>
                  <Badge variant="secondary" className="text-xs font-semibold">
                    {count > 0 ? Math.round(value / totalValue * 100) : 0}%
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ));
        })()}
      </div>

    </div>;
}
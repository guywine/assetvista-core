import { Asset, ViewCurrency, FXRates, AssetCalculations } from '@/types/portfolio';
import { calculateAssetValue, formatCurrency, formatPercentage } from '@/lib/portfolio-utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

interface PortfolioSummaryProps {
  assets: Asset[];
  viewCurrency: ViewCurrency;
  fxRates: FXRates;
}

export function PortfolioSummary({ assets, viewCurrency, fxRates }: PortfolioSummaryProps) {
  // Calculate all asset values
  const calculations = new Map<string, AssetCalculations>();
  assets.forEach(asset => {
    calculations.set(asset.id, calculateAssetValue(asset, fxRates, viewCurrency));
  });

  const totalValue = assets.reduce((sum, asset) => {
    const calc = calculations.get(asset.id);
    return sum + (calc?.display_value || 0);
  }, 0);

  // Holdings by Class
  const holdingsByClass = assets.reduce((acc, asset) => {
    const calc = calculations.get(asset.id);
    const value = calc?.display_value || 0;
    
    if (!acc[asset.class]) {
      acc[asset.class] = { count: 0, value: 0 };
    }
    acc[asset.class].count++;
    acc[asset.class].value += value;
    
    return acc;
  }, {} as Record<string, { count: number; value: number }>);

  // Holdings by Entity
  const holdingsByEntity = assets.reduce((acc, asset) => {
    const calc = calculations.get(asset.id);
    const value = calc?.display_value || 0;
    
    if (!acc[asset.account_entity]) {
      acc[asset.account_entity] = 0;
    }
    acc[asset.account_entity] += value;
    
    return acc;
  }, {} as Record<string, number>);

  // Top 10 Positions
  const topPositions = assets
    .map(asset => ({
      asset,
      value: calculations.get(asset.id)?.display_value || 0,
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);

  // Fixed Income YTW calculations
  const fixedIncomeAssets = assets.filter(asset => asset.class === 'Fixed Income' && asset.ytw !== undefined);
  
  const fixedIncomeWeightedYTW = fixedIncomeAssets.length > 0 ? 
    fixedIncomeAssets.reduce((sum, asset) => {
      const calc = calculations.get(asset.id);
      const value = calc?.display_value || 0;
      return sum + (asset.ytw! * value);
    }, 0) / fixedIncomeAssets.reduce((sum, asset) => {
      const calc = calculations.get(asset.id);
      return sum + (calc?.display_value || 0);
    }, 0) : 0;

  // Pie chart data for asset allocation
  const pieData = Object.entries(holdingsByClass).map(([className, data]) => ({
    name: className,
    value: data.value,
    percentage: totalValue > 0 ? (data.value / totalValue) * 100 : 0,
  }));

  // Sub-class breakdown by asset class
  const subClassBreakdown = assets.reduce((acc, asset) => {
    const calc = calculations.get(asset.id);
    const value = calc?.display_value || 0;
    
    if (!acc[asset.class]) {
      acc[asset.class] = {};
    }
    if (!acc[asset.class][asset.sub_class]) {
      acc[asset.class][asset.sub_class] = 0;
    }
    acc[asset.class][asset.sub_class] += value;
    
    return acc;
  }, {} as Record<string, Record<string, number>>);

  // Create pie chart data for each asset class
  const subClassPieData = Object.entries(subClassBreakdown).reduce((acc, [assetClass, subClasses]) => {
    const classTotal = Object.values(subClasses).reduce((sum, value) => sum + value, 0);
    acc[assetClass] = Object.entries(subClasses).map(([subClass, value]) => ({
      name: subClass,
      value: value,
      percentage: classTotal > 0 ? (value / classTotal) * 100 : 0,
    }));
    return acc;
  }, {} as Record<string, Array<{ name: string; value: number; percentage: number }>>);

  const COLORS = ['hsl(var(--financial-primary))', 'hsl(var(--financial-success))', 'hsl(var(--financial-warning))'];
  const SUB_CLASS_COLORS = [
    'hsl(var(--chart-1))',
    'hsl(var(--chart-2))',
    'hsl(var(--chart-3))',
    'hsl(var(--chart-4))',
    'hsl(var(--chart-5))',
  ];

  return (
    <div className="space-y-6">
      {/* First Row - Holdings Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Holdings by Class */}
        <Card className="bg-gradient-to-br from-card to-muted/20 shadow-card border-border/50">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-financial-primary">Holdings by Class</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-semibold">Class</TableHead>
                  <TableHead className="font-semibold">Count</TableHead>
                  <TableHead className="font-semibold text-right">Value</TableHead>
                  <TableHead className="font-semibold text-right">% of Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(holdingsByClass).map(([className, data]) => (
                  <TableRow key={className}>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {className}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono">{data.count}</TableCell>
                    <TableCell className="text-right font-mono font-semibold text-financial-success">
                      {formatCurrency(data.value, viewCurrency)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatPercentage(totalValue > 0 ? (data.value / totalValue) * 100 : 0)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Holdings by Entity */}
        <Card className="bg-gradient-to-br from-card to-muted/20 shadow-card border-border/50">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-financial-primary">Holdings by Entity</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-semibold">Entity</TableHead>
                  <TableHead className="font-semibold text-right">Value</TableHead>
                  <TableHead className="font-semibold text-right">% of Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(holdingsByEntity)
                  .sort(([,a], [,b]) => b - a)
                  .map(([entity, value]) => (
                  <TableRow key={entity}>
                    <TableCell className="font-medium">{entity}</TableCell>
                    <TableCell className="text-right font-mono font-semibold text-financial-success">
                      {formatCurrency(value, viewCurrency)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatPercentage(totalValue > 0 ? (value / totalValue) * 100 : 0)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Second Row - Charts and Top Positions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Positions */}
        <Card className="bg-gradient-to-br from-card to-muted/20 shadow-card border-border/50">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-financial-primary">Top 5 Positions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topPositions.slice(0, 5).map(({ asset, value }) => (
                <div key={asset.id} className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate text-sm">{asset.name}</p>
                    <Badge variant="outline" className="text-xs mt-1">
                      {asset.class}
                    </Badge>
                  </div>
                  <div className="text-right ml-4">
                    <p className="font-mono font-semibold text-financial-success text-sm">
                      {formatCurrency(value, viewCurrency)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatPercentage(totalValue > 0 ? (value / totalValue) * 100 : 0)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Overall Asset Allocation Chart */}
        <Card className="bg-gradient-to-br from-card to-muted/20 shadow-card border-border/50">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-financial-primary">Asset Allocation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-52 p-4">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percentage }) => `${name}: ${percentage.toFixed(1)}%`}
                    outerRadius={45}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => [formatCurrency(value, viewCurrency), 'Value']} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Fixed Income YTW */}
        {fixedIncomeAssets.length > 0 && (
          <Card className="bg-gradient-to-br from-card to-muted/20 shadow-card border-border/50">
            <CardHeader>
              <CardTitle className="text-lg font-bold text-financial-primary">Fixed Income YTW</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-2">Weighted Average YTW</p>
                <p className="text-2xl font-bold text-financial-success">
                  {(fixedIncomeWeightedYTW * 100).toFixed(2)}%
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Third Row - Sub-class Charts */}
      {Object.keys(subClassPieData).length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Object.entries(subClassPieData).map(([assetClass, data]) => {
            const classTotal = holdingsByClass[assetClass]?.value || 0;
            
            if (data.length <= 1) return null; // Don't show chart if only one sub-class
            
            return (
              <Card key={assetClass} className="bg-gradient-to-br from-card to-muted/20 shadow-card border-border/50">
                <CardHeader>
                  <CardTitle className="text-base font-bold text-financial-primary">
                    {assetClass} Sub-classes
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Total: {formatCurrency(classTotal, viewCurrency)}
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="h-48 p-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={data}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percentage }) => `${name}: ${percentage.toFixed(1)}%`}
                          outerRadius={40}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={SUB_CLASS_COLORS[index % SUB_CLASS_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => [formatCurrency(value, viewCurrency), 'Value']} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
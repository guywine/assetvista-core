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

  // Pie chart data
  const pieData = Object.entries(holdingsByClass).map(([className, data]) => ({
    name: className,
    value: data.value,
    percentage: totalValue > 0 ? (data.value / totalValue) * 100 : 0,
  }));

  const COLORS = ['hsl(var(--financial-primary))', 'hsl(var(--financial-success))', 'hsl(var(--financial-warning))'];

  return (
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

      {/* Top Positions */}
      <Card className="bg-gradient-to-br from-card to-muted/20 shadow-card border-border/50">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-financial-primary">Top 10 Positions</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-semibold">Asset</TableHead>
                <TableHead className="font-semibold">Class</TableHead>
                <TableHead className="font-semibold text-right">Value</TableHead>
                <TableHead className="font-semibold text-right">% of Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {topPositions.map(({ asset, value }) => (
                <TableRow key={asset.id}>
                  <TableCell className="font-medium">{asset.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {asset.class}
                    </Badge>
                  </TableCell>
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

      {/* Asset Allocation Chart & Fixed Income YTW */}
      <div className="space-y-6">
        {/* Pie Chart */}
        <Card className="bg-gradient-to-br from-card to-muted/20 shadow-card border-border/50">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-financial-primary">Asset Allocation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percentage }) => `${name}: ${percentage.toFixed(1)}%`}
                    outerRadius={80}
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
              <CardTitle className="text-xl font-bold text-financial-primary">Fixed Income YTW</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-2">Weighted Average YTW</p>
                <p className="text-3xl font-bold text-financial-success">
                  {formatPercentage(fixedIncomeWeightedYTW)}
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
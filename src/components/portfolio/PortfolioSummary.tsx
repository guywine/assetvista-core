import { Asset, ViewCurrency, FXRates, AssetCalculations } from '@/types/portfolio';
import { calculateAssetValue, formatCurrency, formatPercentage, calculateWeightedYTW } from '@/lib/portfolio-utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { useState } from 'react';
interface PortfolioSummaryProps {
  assets: Asset[];
  viewCurrency: ViewCurrency;
  fxRates: FXRates;
}
export function PortfolioSummary({
  assets,
  viewCurrency,
  fxRates
}: PortfolioSummaryProps) {
  // State for managing asset class visibility in pie chart
  const [visibleAssetClasses, setVisibleAssetClasses] = useState<Record<string, boolean>>({});

  // State for managing Real Estate inclusion in beneficiaries chart
  const [includeRealEstate, setIncludeRealEstate] = useState<boolean>(true);

  // State for managing Real Estate inclusion in currency chart
  const [includeRealEstateInCurrency, setIncludeRealEstateInCurrency] = useState<boolean>(true);

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
      acc[asset.class] = {
        count: 0,
        value: 0
      };
    }
    acc[asset.class].count++;
    acc[asset.class].value += value;
    return acc;
  }, {} as Record<string, {
    count: number;
    value: number;
  }>);

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

  // Initialize visibility state if empty
  if (Object.keys(visibleAssetClasses).length === 0) {
    const initialVisibility: Record<string, boolean> = {};
    Object.keys(holdingsByClass).forEach(className => {
      initialVisibility[className] = true;
    });
    setVisibleAssetClasses(initialVisibility);
  }

  // Filter pie chart data based on visible asset classes
  const filteredHoldingsByClass = Object.entries(holdingsByClass).filter(([className]) => visibleAssetClasses[className]).reduce((acc, [className, data]) => {
    acc[className] = data;
    return acc;
  }, {} as Record<string, {
    count: number;
    value: number;
  }>);

  // Calculate filtered total value for enabled asset classes only
  const filteredTotalValue = Object.values(filteredHoldingsByClass).reduce((sum, data) => sum + data.value, 0);

  // Pie chart data for asset allocation (filtered)
  const pieData = Object.entries(filteredHoldingsByClass).map(([className, data]) => ({
    name: className,
    value: data.value,
    percentage: filteredTotalValue > 0 ? data.value / filteredTotalValue * 100 : 0
  }));

  // Beneficiaries calculations (exclude Private Equity, exclude Tom, optionally exclude Real Estate)
  const beneficiariesAssets = assets.filter(asset => {
    if (asset.class === 'Private Equity') return false;
    if (asset.beneficiary === 'Tom') return false;
    if (!includeRealEstate && asset.class === 'Real Estate') return false;
    return true;
  });
  const holdingsByBeneficiary = beneficiariesAssets.reduce((acc, asset) => {
    const calc = calculations.get(asset.id);
    const value = calc?.display_value || 0;
    if (!acc[asset.beneficiary]) {
      acc[asset.beneficiary] = 0;
    }
    acc[asset.beneficiary] += value;
    return acc;
  }, {} as Record<string, number>);

  // Filter to only include Shimon, Hagit, Kids
  const targetBeneficiaries = ['Shimon', 'Hagit', 'Kids'];
  const filteredBeneficiaries = Object.entries(holdingsByBeneficiary).filter(([beneficiary]) => targetBeneficiaries.includes(beneficiary)).reduce((acc, [beneficiary, value]) => {
    acc[beneficiary] = value;
    return acc;
  }, {} as Record<string, number>);
  const beneficiariesTotalValue = Object.values(filteredBeneficiaries).reduce((sum, value) => sum + value, 0);

  // Beneficiaries pie chart data
  const beneficiariesPieData = Object.entries(filteredBeneficiaries).map(([beneficiary, value]) => ({
    name: beneficiary,
    value: value,
    percentage: beneficiariesTotalValue > 0 ? value / beneficiariesTotalValue * 100 : 0
  }));

  // Currency calculations (exclude Private Equity, optionally exclude Real Estate)
  const currencyAssets = assets.filter(asset => {
    if (asset.class === 'Private Equity') return false;
    if (!includeRealEstateInCurrency && asset.class === 'Real Estate') return false;
    return true;
  });
  const holdingsByCurrency = currencyAssets.reduce((acc, asset) => {
    const calc = calculations.get(asset.id);
    const value = calc?.display_value || 0;
    if (!acc[asset.origin_currency]) {
      acc[asset.origin_currency] = 0;
    }
    acc[asset.origin_currency] += value;
    return acc;
  }, {} as Record<string, number>);

  const currencyTotalValue = Object.values(holdingsByCurrency).reduce((sum, value) => sum + value, 0);

  // Currency pie chart data
  const currencyPieData = Object.entries(holdingsByCurrency).map(([currency, value]) => ({
    name: currency,
    value: value,
    percentage: currencyTotalValue > 0 ? value / currencyTotalValue * 100 : 0
  }));

  // Fixed Income YTW calculations
  const fixedIncomeAssets = assets.filter(asset => asset.class === 'Fixed Income' && asset.ytw !== undefined);
  const fixedIncomeWeightedYTW = calculateWeightedYTW(assets, calculations);

  // Fixed Income sub-class YTW calculations
  const fixedIncomeSubClassYTW = fixedIncomeAssets.reduce((acc, asset) => {
    const calc = calculations.get(asset.id);
    const value = calc?.display_value || 0;
    if (!acc[asset.sub_class]) {
      acc[asset.sub_class] = {
        totalValue: 0,
        weightedYTW: 0
      };
    }
    acc[asset.sub_class].totalValue += value;
    acc[asset.sub_class].weightedYTW += asset.ytw! * value;
    return acc;
  }, {} as Record<string, {
    totalValue: number;
    weightedYTW: number;
  }>);

  // Calculate final weighted YTW for each sub-class
  const fixedIncomeSubClassAverageYTW = Object.entries(fixedIncomeSubClassYTW).reduce((acc, [subClass, data]) => {
    acc[subClass] = data.totalValue > 0 ? data.weightedYTW / data.totalValue : 0;
    return acc;
  }, {} as Record<string, number>);

  // Fixed Income pie chart data
  const fixedIncomeSubClasses = subClassBreakdown['Fixed Income'] || {};
  const fixedIncomePieData = Object.entries(fixedIncomeSubClasses).map(([subClass, value]) => ({
    name: subClass,
    value: value,
    percentage: holdingsByClass['Fixed Income']?.value > 0 ? value / holdingsByClass['Fixed Income'].value * 100 : 0
  }));

  // Create pie chart data for each asset class that has assets
  const subClassPieData = Object.entries(subClassBreakdown).reduce((acc, [assetClass, subClasses]) => {
    const classTotal = Object.values(subClasses).reduce((sum, value) => sum + value, 0);

    // Only create pie data if there are assets in this class
    if (classTotal > 0) {
      acc[assetClass] = Object.entries(subClasses).map(([subClass, value]) => ({
        name: subClass,
        value: value,
        percentage: classTotal > 0 ? value / classTotal * 100 : 0
      }));
    }
    return acc;
  }, {} as Record<string, Array<{
    name: string;
    value: number;
    percentage: number;
  }>>);
  const COLORS = ['hsl(var(--chart-1))',
  // Public Equity
  'hsl(var(--chart-2))',
  // Private Equity  
  'hsl(var(--chart-3))',
  // Fixed Income
  'hsl(var(--chart-4))',
  // Cash
  'hsl(var(--chart-5))',
  // Commodities & more
  'hsl(var(--financial-primary))' // Real Estate
  ];
  const SUB_CLASS_COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];
  return <div className="space-y-8">{/* Increased spacing between major sections */}
      {/* First Row - Holdings Tables */}
      

      {/* Second Row - Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Overall Asset Allocation Chart */}
        <Card className="bg-gradient-to-br from-card to-muted/20 shadow-card border-border/50">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-financial-primary">Asset Allocation</CardTitle>
            <p className="text-sm text-muted-foreground">
              Total: {formatCurrency(filteredTotalValue, viewCurrency)} ({Object.values(visibleAssetClasses).filter(Boolean).length} classes selected)
            </p>
          </CardHeader>
          <CardContent>
            <div className="h-72 p-2">{/* Increased height from h-56 to h-72 and padding */}
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="40%" outerRadius={65} fill="#8884d8" dataKey="value">
                    {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                  </Pie>
                   <Tooltip formatter={(value: number) => [formatCurrency(value, viewCurrency), 'Value']} />
                   <Legend verticalAlign="bottom" height={50} formatter={(value, entry) => `${value}: ${(entry.payload.value / filteredTotalValue * 100).toFixed(1)}%`} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            
            {/* Asset Class Values Summary with Toggles */}
            <div className="mt-4 space-y-2">
              {Object.entries(holdingsByClass).map(([className, data]) => <div key={className} className="flex justify-between items-center py-2 text-sm">
                  <div className="flex items-center gap-3">
                    <Switch checked={visibleAssetClasses[className] || false} onCheckedChange={checked => setVisibleAssetClasses(prev => ({
                  ...prev,
                  [className]: checked
                }))} />
                    <span className={`${visibleAssetClasses[className] ? 'text-foreground' : 'text-muted-foreground/50'}`}>
                      {className}
                    </span>
                  </div>
                  <span className={`font-mono font-semibold ${visibleAssetClasses[className] ? 'text-foreground' : 'text-muted-foreground/50'}`}>
                    {formatCurrency(data.value, viewCurrency)}
                  </span>
                </div>)}
            </div>
          </CardContent>
        </Card>

        {/* Value by Beneficiaries Chart */}
        <Card className="bg-gradient-to-br from-card to-muted/20 shadow-card border-border/50">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-financial-primary">Value by Beneficiaries</CardTitle>
            <p className="text-sm text-muted-foreground">
              Total asset value, excluding Private Equity{!includeRealEstate ? ' and Real Estate' : ''}
            </p>
            <div className="flex items-center space-x-2 mt-2">
              <Switch checked={includeRealEstate} onCheckedChange={setIncludeRealEstate} />
              <span className="text-sm text-muted-foreground">Include Real Estate</span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-72 p-2">{/* Increased height and padding for consistency */}
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={beneficiariesPieData} cx="50%" cy="40%" outerRadius={65} fill="#8884d8" dataKey="value">
                    {beneficiariesPieData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(value: number) => [formatCurrency(value, viewCurrency), 'Value']} />
                  <Legend verticalAlign="bottom" height={50} formatter={(value, entry) => `${value}: ${formatCurrency(entry.payload.value, viewCurrency)} (${(entry.payload.value / beneficiariesTotalValue * 100).toFixed(1)}%)`} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            
            {/* Beneficiaries Summary */}
            <div className="mt-4 space-y-2">
              {Object.entries(filteredBeneficiaries).map(([beneficiary, value]) => <div key={beneficiary} className="flex justify-between items-center py-1 text-sm">
                  <span className="text-foreground">{beneficiary}</span>
                  <span className="font-mono font-semibold text-foreground">
                    {formatCurrency(value, viewCurrency)}
                  </span>
                </div>)}
              <div className="border-t pt-2 mt-2">
                <div className="flex justify-between items-center py-1 text-sm font-bold">
                  <span className="text-foreground">Total</span>
                  <span className="font-mono font-semibold text-financial-success">
                    {formatCurrency(beneficiariesTotalValue, viewCurrency)}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Value by Currency Chart */}
        <Card className="bg-gradient-to-br from-card to-muted/20 shadow-card border-border/50">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-financial-primary">Value by Currency</CardTitle>
            <p className="text-sm text-muted-foreground">
              Total asset value, excluding Private Equity{!includeRealEstateInCurrency ? ' and Real Estate' : ''}
            </p>
            <div className="flex items-center space-x-2 mt-2">
              <Switch checked={includeRealEstateInCurrency} onCheckedChange={setIncludeRealEstateInCurrency} />
              <span className="text-sm text-muted-foreground">Include Real Estate</span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-72 p-2">{/* Increased height and padding for consistency */}
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={currencyPieData} cx="50%" cy="40%" outerRadius={65} fill="#8884d8" dataKey="value">
                    {currencyPieData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(value: number) => [formatCurrency(value, viewCurrency), 'Value']} />
                  <Legend verticalAlign="bottom" height={50} formatter={(value, entry) => `${value}: ${formatCurrency(entry.payload.value, viewCurrency)} (${(entry.payload.value / currencyTotalValue * 100).toFixed(1)}%)`} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            
            {/* Currency Summary */}
            <div className="mt-4 space-y-2">
              {Object.entries(holdingsByCurrency).map(([currency, value]) => <div key={currency} className="flex justify-between items-center py-1 text-sm">
                  <span className="text-foreground">{currency}</span>
                  <span className="font-mono font-semibold text-foreground">
                    {formatCurrency(value, viewCurrency)}
                  </span>
                </div>)}
              <div className="border-t pt-2 mt-2">
                <div className="flex justify-between items-center py-1 text-sm font-bold">
                  <span className="text-foreground">Total</span>
                  <span className="font-mono font-semibold text-financial-success">
                    {formatCurrency(currencyTotalValue, viewCurrency)}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>


      {/* Public Equity Dedicated Section */}
      {holdingsByClass['Public Equity']?.value > 0 && <div className="space-y-4 pt-8 border-t border-financial-primary/20">{/* Added elegant top border */}
          <div className="flex items-center gap-4 mb-6">
            <div className="h-0.5 flex-1 bg-muted-foreground/20 rounded-full"></div>
            <h2 className="text-3xl font-bold text-muted-foreground">
              Public Equity, Commodities &amp; more
            </h2>
            <div className="h-0.5 flex-1 bg-muted-foreground/20 rounded-full"></div>
          </div>
          
          {/* Top 10 Positions Bar Chart for Public Equity and Commodities & more */}
          {(() => {
        // Filter assets for Public Equity and Commodities & more
        const targetClasses = ['Public Equity', 'Commodities & more'];
        const filteredAssets = assets.filter(asset => targetClasses.includes(asset.class));

        // Group by asset name and sum their values
        const positionsByName = filteredAssets.reduce((acc, asset) => {
          const calc = calculations.get(asset.id);
          const value = calc?.display_value || 0;
          if (!acc[asset.name]) {
            acc[asset.name] = {
              name: asset.name,
              class: asset.class,
              sub_class: asset.sub_class,
              totalValue: 0
            };
          }
          acc[asset.name].totalValue += value;
          return acc;
        }, {} as Record<string, {
          name: string;
          class: string;
          sub_class: string;
          totalValue: number;
        }>);

        // Calculate total value for percentage calculations
        const classesTotal = (holdingsByClass['Public Equity']?.value || 0) + (holdingsByClass['Commodities & more']?.value || 0);

        // Get top 10 positions
        const top10Positions = Object.values(positionsByName).sort((a, b) => b.totalValue - a.totalValue).slice(0, 10);

        // Format data for bar chart
        const chartData = top10Positions.map(position => ({
          name: position.name.length > 15 ? position.name.substring(0, 15) + '...' : position.name,
          fullName: position.name,
          value: position.totalValue,
          percentage: classesTotal > 0 ? position.totalValue / classesTotal * 100 : 0,
          class: position.class
        }));
        return chartData.length > 0 ? <Card className="bg-gradient-to-br from-card to-muted/20 shadow-card border-border/50 mb-6">
                <CardHeader>
                  <CardTitle className="text-lg font-bold text-financial-primary">
                    Top 10 Public Equity Positions
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Public Equity & Commodities combined by asset name
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="h-80 p-1">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} margin={{
                  top: 20,
                  right: 30,
                  left: 20,
                  bottom: 80
                }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                        <XAxis dataKey="name" tick={{
                    fontSize: 12,
                    fill: '#6B7280'
                  }} angle={-45} textAnchor="end" height={80} />
                        <YAxis tick={{
                    fontSize: 12,
                    fill: '#6B7280'
                  }} tickFormatter={value => formatCurrency(value, viewCurrency)} />
                        <Tooltip formatter={(value: number, name, props) => [formatCurrency(value, viewCurrency), 'Value']} labelFormatter={(label, payload) => {
                    if (payload && payload[0]) {
                      const data = payload[0].payload;
                      return `${data.fullName} (${data.class})`;
                    }
                    return label;
                  }} contentStyle={{
                    backgroundColor: '#1F2937',
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    fontSize: '14px'
                  }} />
                        <Bar dataKey="value" fill="hsl(var(--financial-primary))" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card> : null;
      })()}
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Public Equity Sub-class Pie Chart */}
            <Card className="bg-gradient-to-br from-card to-muted/20 shadow-card border-border/50">
              <CardHeader>
                <CardTitle className="text-lg font-bold text-financial-primary">
                  Public Equity Sub-classes
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Total: {formatCurrency(holdingsByClass['Public Equity'].value, viewCurrency)}
                </p>
              </CardHeader>
              <CardContent>
                <div className="h-64 p-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={subClassPieData['Public Equity'] || []} cx="50%" cy="50%" outerRadius={70} fill="#8884d8" dataKey="value">
                        {(subClassPieData['Public Equity'] || []).map((entry, index) => <Cell key={`cell-${index}`} fill={SUB_CLASS_COLORS[index % SUB_CLASS_COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(value: number) => [formatCurrency(value, viewCurrency), 'Value']} />
                      <Legend verticalAlign="bottom" height={36} formatter={(value, entry) => `${value}: ${(entry.payload.value / holdingsByClass['Public Equity'].value * 100).toFixed(1)}%`} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Commodities & more Sub-class Pie Chart */}
            {holdingsByClass['Commodities & more']?.value > 0 && <Card className="bg-gradient-to-br from-card to-muted/20 shadow-card border-border/50">
                <CardHeader>
                  <CardTitle className="text-lg font-bold text-financial-primary">
                    Commodities & more Sub-classes
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Total: {formatCurrency(holdingsByClass['Commodities & more'].value, viewCurrency)}
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="h-64 p-1">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={subClassPieData['Commodities & more'] || []} cx="50%" cy="50%" outerRadius={70} fill="#8884d8" dataKey="value">
                          {(subClassPieData['Commodities & more'] || []).map((entry, index) => <Cell key={`cell-${index}`} fill={SUB_CLASS_COLORS[index % SUB_CLASS_COLORS.length]} />)}
                        </Pie>
                        <Tooltip formatter={(value: number) => [formatCurrency(value, viewCurrency), 'Value']} />
                        <Legend verticalAlign="bottom" height={36} formatter={(value, entry) => `${value}: ${(entry.payload.value / holdingsByClass['Commodities & more'].value * 100).toFixed(1)}%`} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>}

            {/* Big Tech Assets Pie Chart */}
            {(() => {
          const bigTechAssets = assets.filter(asset => asset.class === 'Public Equity' && asset.sub_class === 'Big Tech');

          // Group Big Tech assets by name and sum their values
          const bigTechByName = bigTechAssets.reduce((acc, asset) => {
            const calc = calculations.get(asset.id);
            const value = calc?.display_value || 0;
            if (!acc[asset.name]) {
              acc[asset.name] = 0;
            }
            acc[asset.name] += value;
            return acc;
          }, {} as Record<string, number>);
          const bigTechTotal = Object.values(bigTechByName).reduce((sum, value) => sum + value, 0);
          const bigTechPieData = Object.entries(bigTechByName).map(([name, value]) => ({
            name: name,
            value: value,
            percentage: bigTechTotal > 0 ? value / bigTechTotal * 100 : 0
          }));
          return bigTechAssets.length > 0 ? <Card className="bg-gradient-to-br from-card to-muted/20 shadow-card border-border/50">
                  <CardHeader>
                    <CardTitle className="text-lg font-bold text-financial-primary">
                      Big Tech Holdings
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Total: {formatCurrency(bigTechTotal, viewCurrency)}
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64 p-1">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={bigTechPieData} cx="50%" cy="50%" outerRadius={70} fill="#8884d8" dataKey="value">
                            {bigTechPieData.map((entry, index) => <Cell key={`cell-${index}`} fill={SUB_CLASS_COLORS[index % SUB_CLASS_COLORS.length]} />)}
                          </Pie>
                          <Tooltip formatter={(value: number) => [formatCurrency(value, viewCurrency), 'Value']} />
                          <Legend verticalAlign="bottom" height={36} formatter={(value, entry) => `${value}: ${(entry.payload.value / bigTechTotal * 100).toFixed(1)}%`} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card> : null;
        })()}
          </div>
        </div>}

      {/* Fixed Income Dedicated Section */}
      {fixedIncomeAssets.length > 0 && holdingsByClass['Fixed Income']?.value > 0 && <div className="space-y-4 pt-8 border-t border-financial-primary/20">{/* Added elegant top border */}
          <div className="flex items-center gap-4 mb-6">
            <div className="h-0.5 flex-1 bg-muted-foreground/20 rounded-full"></div>
            <h2 className="text-3xl font-bold text-muted-foreground">
              Fixed Income
            </h2>
            <div className="h-0.5 flex-1 bg-muted-foreground/20 rounded-full"></div>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Fixed Income Sub-class Pie Chart */}
            <Card className="bg-gradient-to-br from-card to-muted/20 shadow-card border-border/50">
              <CardHeader>
                <CardTitle className="text-lg font-bold text-financial-primary">
                  Fixed Income Sub-classes
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Total: {formatCurrency(holdingsByClass['Fixed Income'].value, viewCurrency)}
                </p>
              </CardHeader>
              <CardContent>
                <div className="h-64 p-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={fixedIncomePieData} cx="50%" cy="50%" outerRadius={70} fill="#8884d8" dataKey="value">
                        {fixedIncomePieData.map((entry, index) => <Cell key={`cell-${index}`} fill={SUB_CLASS_COLORS[index % SUB_CLASS_COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(value: number) => [formatCurrency(value, viewCurrency), 'Value']} />
                      <Legend verticalAlign="bottom" height={36} formatter={(value, entry) => `${value}: ${(entry.payload.value / holdingsByClass['Fixed Income'].value * 100).toFixed(1)}%`} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Fixed Income YTW Summary */}
            <Card className="bg-gradient-to-br from-card to-muted/20 shadow-card border-border/50">
              <CardHeader>
                <CardTitle className="text-lg font-bold text-financial-primary">
                  Yield to Worst (YTW)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* Overall Fixed Income YTW */}
                <div className="mb-6 p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-2">All Fixed Income</p>
                  <p className="text-2xl font-bold text-financial-success">
                    {(fixedIncomeWeightedYTW * 100).toFixed(2)}%
                  </p>
                </div>

                {/* YTW by Sub-class */}
                <div className="space-y-3">
                  <p className="text-sm font-semibold text-muted-foreground">YTW by Sub-class:</p>
                  {Object.entries(fixedIncomeSubClassAverageYTW).map(([subClass, ytw]) => <div key={subClass} className="flex justify-between items-center py-2 border-b border-border/30">
                      <Badge variant="outline" className="text-xs">
                        {subClass}
                      </Badge>
                      <span className="font-mono font-semibold text-financial-success">
                        {(ytw * 100).toFixed(2)}%
                      </span>
                    </div>)}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>}

      {/* Real Estate Section */}
      {holdingsByClass['Real Estate']?.value > 0 && <div className="space-y-4 pt-8 border-t border-financial-primary/20">{/* Added elegant top border */}
          <div className="flex items-center gap-4 mb-6">
            <div className="h-0.5 flex-1 bg-muted-foreground/20 rounded-full"></div>
            <h2 className="text-3xl font-bold text-muted-foreground">
              Real Estate
            </h2>
            <div className="h-0.5 flex-1 bg-muted-foreground/20 rounded-full"></div>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Real Estate Sub-class Pie Chart */}
            <Card className="bg-gradient-to-br from-card to-muted/20 shadow-card border-border/50">
              <CardHeader>
                <CardTitle className="text-lg font-bold text-financial-primary">
                  Real Estate Sub-classes
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Total: {formatCurrency(holdingsByClass['Real Estate'].value, viewCurrency)}
                </p>
              </CardHeader>
              <CardContent>
                <div className="h-64 p-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={subClassPieData['Real Estate'] || []} cx="50%" cy="50%" outerRadius={70} fill="#8884d8" dataKey="value">
                        {(subClassPieData['Real Estate'] || []).map((entry, index) => <Cell key={`cell-${index}`} fill={SUB_CLASS_COLORS[index % SUB_CLASS_COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(value: number) => [formatCurrency(value, viewCurrency), 'Value']} />
                      <Legend verticalAlign="bottom" height={36} formatter={(value, entry) => `${value}: ${(entry.payload.value / holdingsByClass['Real Estate'].value * 100).toFixed(1)}%`} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Real Estate Assets Bar Chart */}
            <Card className="bg-gradient-to-br from-card to-muted/20 shadow-card border-border/50">
              <CardHeader>
                <CardTitle className="text-lg font-bold text-financial-primary">
                  Real Estate Assets
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Individual asset values
                </p>
              </CardHeader>
              <CardContent>
                <div className="h-64 p-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={assets.filter(asset => asset.class === 'Real Estate').map(asset => ({
                  name: asset.name,
                  value: calculations.get(asset.id)?.display_value || 0
                })).sort((a, b) => b.value - a.value)} margin={{
                  top: 20,
                  right: 30,
                  left: 20,
                  bottom: 60
                }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" angle={-45} textAnchor="end" height={60} interval={0} tick={{
                    fontSize: 12
                  }} />
                      <YAxis tickFormatter={value => formatCurrency(value, viewCurrency)} tick={{
                    fontSize: 12
                  }} />
                      <Tooltip formatter={(value: number) => [formatCurrency(value, viewCurrency), 'Value']} labelStyle={{
                    color: 'hsl(var(--foreground))'
                  }} contentStyle={{
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }} />
                      <Bar dataKey="value" fill="hsl(var(--chart-1))" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>}

      {/* Private Equity Section */}
      {holdingsByClass['Private Equity']?.value > 0 && <div className="space-y-4 pt-8 border-t border-financial-primary/20">{/* Added elegant top border */}
          <div className="flex items-center gap-4 mb-6">
            <div className="h-0.5 flex-1 bg-muted-foreground/20 rounded-full"></div>
            <h2 className="text-3xl font-bold text-muted-foreground">
              Private Equity
            </h2>
            <div className="h-0.5 flex-1 bg-muted-foreground/20 rounded-full"></div>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Private Equity Sub-class Pie Chart */}
            <Card className="bg-gradient-to-br from-card to-muted/20 shadow-card border-border/50">
              <CardHeader>
                <CardTitle className="text-lg font-bold text-financial-primary">
                  Private Equity Sub-classes
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Total: {formatCurrency(holdingsByClass['Private Equity'].value, viewCurrency)}
                </p>
              </CardHeader>
              <CardContent>
                <div className="h-64 p-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={subClassPieData['Private Equity'] || []} cx="50%" cy="50%" outerRadius={70} fill="#8884d8" dataKey="value">
                        {(subClassPieData['Private Equity'] || []).map((entry, index) => <Cell key={`cell-${index}`} fill={SUB_CLASS_COLORS[index % SUB_CLASS_COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(value: number) => [formatCurrency(value, viewCurrency), 'Value']} />
                      <Legend verticalAlign="bottom" height={36} formatter={(value, entry) => `${value}: ${(entry.payload.value / holdingsByClass['Private Equity'].value * 100).toFixed(1)}%`} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Top 10 Private Equity Assets Bar Chart */}
            <Card className="bg-gradient-to-br from-card to-muted/20 shadow-card border-border/50">
              <CardHeader>
                <CardTitle className="text-lg font-bold text-financial-primary">Top 10 Private Equity Positions</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Factored vs Full Price comparison
                </p>
              </CardHeader>
              <CardContent>
                <div className="h-80 p-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={(() => {
                  // Get Private Equity assets
                  const privateEquityAssets = assets.filter(asset => asset.class === 'Private Equity');

                  // Calculate factored and full price for each asset
                  const assetData = privateEquityAssets.map(asset => {
                    const calc = calculations.get(asset.id);
                    const factored_value = calc?.display_value || 0;
                    const full_price = asset.quantity * (asset.price || 0) * (fxRates[asset.origin_currency]?.[`to_${viewCurrency}`] || 1);
                    return {
                      name: asset.name.length > 15 ? asset.name.substring(0, 15) + '...' : asset.name,
                      fullName: asset.name,
                      factored_value: factored_value,
                      full_price: full_price
                    };
                  });

                  // Sort by factored value and take top 10
                  return assetData.sort((a, b) => b.factored_value - a.factored_value).slice(0, 10);
                })()} margin={{
                  top: 20,
                  right: 30,
                  left: 20,
                  bottom: 80
                }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} interval={0} tick={{
                    fontSize: 11
                  }} />
                      <YAxis tickFormatter={value => formatCurrency(value, viewCurrency)} tick={{
                    fontSize: 12
                  }} />
                      <Tooltip formatter={(value: number, name: string) => [formatCurrency(value, viewCurrency), name]} labelFormatter={label => {
                    const asset = (() => {
                      const privateEquityAssets = assets.filter(asset => asset.class === 'Private Equity');
                      const assetData = privateEquityAssets.map(asset => ({
                        name: asset.name.length > 15 ? asset.name.substring(0, 15) + '...' : asset.name,
                        fullName: asset.name
                      }));
                      return assetData.find(a => a.name === label);
                    })();
                    return asset?.fullName || label;
                  }} labelStyle={{
                    color: 'hsl(var(--foreground))'
                  }} contentStyle={{
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }} />
                      <Bar dataKey="full_price" fill="hsl(var(--chart-3))" name="Full Potential" />
                      <Bar dataKey="factored_value" fill="hsl(var(--chart-2))" name="Factored Value" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>}

      {/* General Asset Class Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Object.entries(holdingsByClass).map(([assetClass, classData]) => {
        const subClasses = subClassBreakdown[assetClass] || {};
        const subClassEntries = Object.entries(subClasses);

        // Skip dedicated sections: Public Equity, Commodities & more, Fixed Income, Real Estate, and Private Equity
        if (['Public Equity', 'Commodities & more', 'Fixed Income', 'Real Estate', 'Private Equity'].includes(assetClass)) return null;

        // Show chart for any asset class that has assets
        if (classData.value === 0) return null;
        const pieData = subClassEntries.map(([subClass, value]) => ({
          name: subClass,
          value: value,
          percentage: classData.value > 0 ? value / classData.value * 100 : 0
        }));
        return <Card key={assetClass} className="bg-gradient-to-br from-card to-muted/20 shadow-card border-border/50">
              <CardHeader>
                <CardTitle className="text-lg font-bold text-financial-primary">
                  {assetClass}
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Total: {formatCurrency(classData.value, viewCurrency)}
                </p>
              </CardHeader>
              <CardContent>
                <div className="h-64 p-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" outerRadius={70} fill="#8884d8" dataKey="value">
                        {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={SUB_CLASS_COLORS[index % SUB_CLASS_COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(value: number) => [formatCurrency(value, viewCurrency), 'Value']} />
                      <Legend verticalAlign="bottom" height={36} formatter={(value, entry) => `${value}: ${(entry.payload.value / classData.value * 100).toFixed(1)}%`} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>;
      })}
      </div>
    </div>;
}
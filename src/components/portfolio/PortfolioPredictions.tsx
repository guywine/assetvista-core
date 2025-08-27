import { useState, useMemo } from 'react';
import { Asset, ViewCurrency, FXRates, AssetClass, FixedIncomeSubClass } from '@/types/portfolio';
import { calculateAssetValue, formatCurrency, formatPercentage, calculateWeightedYTW } from '@/lib/portfolio-utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList, Cell } from 'recharts';
import { ChartContainer } from '@/components/ui/chart';

interface PredictionSettings {
  publicEquityIRR: number;
  commoditiesMoreIRR: number;
  realEstateToggles: Record<string, boolean>;
  realEstateSubClassToggles: Record<string, boolean>;
  realEstateClassToggle: boolean;
  realEstateLiquidationYears: Record<string, string>;
  privateEquityToggles: Record<string, boolean>;
  privateEquitySubClassToggles: Record<string, boolean>;
  privateEquityClassToggle: boolean;
  privateEquityLiquidationYears: Record<string, string>;
}

interface ChartDataPoint {
  year: string;
  Cash: number;
  "Fixed Income": number;
  "Public Equity": number;
  "Commodities & more": number;
  "Real Estate": number;
  "Private Equity Factored": number;
  "Private Equity Potential": number;
}

interface PortfolioPredictionsProps {
  assets: Asset[];
  viewCurrency: ViewCurrency;
  fxRates: FXRates;
}

export function PortfolioPredictions({ assets, viewCurrency, fxRates }: PortfolioPredictionsProps) {
  const currentYear = new Date().getFullYear();
  const yearOptions = [
    currentYear.toString(),
    (currentYear + 1).toString(),
    (currentYear + 2).toString(),
    (currentYear + 3).toString(),
    'later'
  ];

  const [settings, setSettings] = useState<PredictionSettings>({
    publicEquityIRR: 12,
    commoditiesMoreIRR: 12,
    realEstateToggles: {},
    realEstateSubClassToggles: {},
    realEstateClassToggle: false,
    realEstateLiquidationYears: {},
    privateEquityToggles: {},
    privateEquitySubClassToggles: {},
    privateEquityClassToggle: false,
    privateEquityLiquidationYears: {},
  });

  // Group assets by class
  const assetsByClass = useMemo(() => {
    const grouped: Record<AssetClass, Asset[]> = {
      'Cash': [],
      'Fixed Income': [],
      'Public Equity': [],
      'Commodities & more': [],
      'Real Estate': [],
      'Private Equity': []
    };
    
    assets.forEach(asset => {
      grouped[asset.class].push(asset);
    });
    
    return grouped;
  }, [assets]);

  // Calculate asset calculations for totals
  const assetCalculations = useMemo(() => {
    const calculations = new Map();
    assets.forEach(asset => {
      const calc = calculateAssetValue(asset, fxRates, viewCurrency);
      calculations.set(asset.id, calc);
    });
    return calculations;
  }, [assets, fxRates, viewCurrency]);

  // Calculate class totals
  const classTotals = useMemo(() => {
    const totals: Record<AssetClass, number> = {
      'Cash': 0,
      'Fixed Income': 0,
      'Public Equity': 0,
      'Commodities & more': 0,
      'Real Estate': 0,
      'Private Equity': 0
    };

    assets.forEach(asset => {
      const calc = assetCalculations.get(asset.id);
      if (calc) {
        totals[asset.class] += calc.display_value;
      }
    });

    return totals;
  }, [assets, assetCalculations]);

  // Calculate weighted average YTW for Fixed Income
  const fixedIncomeYTW = calculateWeightedYTW(assets, assetCalculations);

  // Helper functions for chart calculations
  const calculateYearValue = (baseValue: number, growthRate: number, yearsFromCurrent: number): number => {
    return baseValue * Math.pow(1 + growthRate / 100, yearsFromCurrent);
  };

  const shouldIncludeAssetInYear = (asset: Asset, year: string, settings: PredictionSettings): boolean => {
    if (asset.class === 'Real Estate') {
      const liquidationYear = settings.realEstateLiquidationYears[asset.id] || currentYear.toString();
      const isToggled = settings.realEstateToggles[asset.id];
      
      if (!isToggled) return false;
      
      if (year === 'current') return false;
      if (liquidationYear === 'later') return year === 'later';
      
      const liquidationYearNum = parseInt(liquidationYear);
      if (year === 'later') return true;
      
      const yearNum = parseInt(year);
      return yearNum >= liquidationYearNum;
    }
    
    if (asset.class === 'Private Equity') {
      const liquidationYear = settings.privateEquityLiquidationYears[asset.id] || currentYear.toString();
      const isToggled = settings.privateEquityToggles[asset.id];
      
      if (!isToggled) return false;
      
      if (year === 'current') return false;
      if (liquidationYear === 'later') return year === 'later';
      
      const liquidationYearNum = parseInt(liquidationYear);
      if (year === 'later') return true;
      
      const yearNum = parseInt(year);
      return yearNum >= liquidationYearNum;
    }
    
    return true; // Other asset classes are always included
  };

  const getAssetValueForYear = (asset: Asset, year: string, calculations: Map<string, any>): { factored: number; potential: number } => {
    const calc = calculations.get(asset.id);
    if (!calc) return { factored: 0, potential: 0 };

    if (asset.class === 'Private Equity') {
      // For Private Equity, calculate both factored and potential values
      let fxRate = 1;
      if (viewCurrency === 'USD') {
        const originToILS = fxRates[asset.origin_currency]?.to_ILS || 1;
        const usdToILS = fxRates['USD']?.to_ILS || 1;
        fxRate = originToILS / usdToILS;
      } else {
        fxRate = fxRates[asset.origin_currency]?.to_ILS || 1;
      }
      
      const fullValue = (asset.price || 0) * asset.quantity * fxRate;
      const factoredValue = calc.display_value; // Already factored
      const potentialDelta = fullValue - factoredValue;
      
      return { factored: factoredValue, potential: potentialDelta };
    } else {
      // For other assets, just return the display value
      return { factored: calc.display_value, potential: 0 };
    }
  };

  // Calculate chart data
  const chartData = useMemo((): ChartDataPoint[] => {
    const years = ['current', (currentYear + 1).toString(), (currentYear + 2).toString(), (currentYear + 3).toString(), 'later'];
    
    return years.map(year => {
      const dataPoint: ChartDataPoint = {
        year,
        Cash: 0,
        "Fixed Income": 0,
        "Public Equity": 0,
        "Commodities & more": 0,
        "Real Estate": 0,
        "Private Equity Factored": 0,
        "Private Equity Potential": 0,
      };

      const yearsFromCurrent = year === 'current' ? 0 : 
                              year === 'later' ? 4 : 
                              parseInt(year) - currentYear;

      assets.forEach(asset => {
        const calc = assetCalculations.get(asset.id);
        if (!calc) return;

        const shouldInclude = shouldIncludeAssetInYear(asset, year, settings);
        if (!shouldInclude) return;

        const assetValues = getAssetValueForYear(asset, year, assetCalculations);

        switch (asset.class) {
          case 'Cash':
            dataPoint.Cash += calc.display_value; // Cash stays constant
            break;
          case 'Fixed Income':
            dataPoint["Fixed Income"] += calculateYearValue(calc.display_value, fixedIncomeYTW * 100, yearsFromCurrent);
            break;
          case 'Public Equity':
            dataPoint["Public Equity"] += calculateYearValue(calc.display_value, settings.publicEquityIRR, yearsFromCurrent);
            break;
          case 'Commodities & more':
            dataPoint["Commodities & more"] += calculateYearValue(calc.display_value, settings.commoditiesMoreIRR, yearsFromCurrent);
            break;
          case 'Real Estate':
            dataPoint["Real Estate"] += assetValues.factored; // Current value at liquidation
            break;
          case 'Private Equity':
            dataPoint["Private Equity Factored"] += assetValues.factored;
            dataPoint["Private Equity Potential"] += assetValues.potential;
            break;
        }
      });

      return dataPoint;
    });
  }, [assets, assetCalculations, settings, currentYear, fixedIncomeYTW, fxRates, viewCurrency]);

  // Helper functions for toggle management
  const updateRealEstateToggle = (assetId: string, value: boolean) => {
    setSettings(prev => ({
      ...prev,
      realEstateToggles: { ...prev.realEstateToggles, [assetId]: value }
    }));
  };

  const updateRealEstateSubClassToggle = (subClass: string, value: boolean) => {
    setSettings(prev => {
      const newSettings = {
        ...prev,
        realEstateSubClassToggles: { ...prev.realEstateSubClassToggles, [subClass]: value }
      };
      
      // Update individual asset toggles for this subclass
      const realEstateAssets = assetsByClass['Real Estate'].filter(asset => asset.sub_class === subClass);
      realEstateAssets.forEach(asset => {
        newSettings.realEstateToggles[asset.id] = value;
      });
      
      return newSettings;
    });
  };

  const updateRealEstateClassToggle = (value: boolean) => {
    setSettings(prev => {
      const newSettings = {
        ...prev,
        realEstateClassToggle: value,
        realEstateToggles: {},
        realEstateSubClassToggles: {}
      };
      
      // Update all real estate assets and subclasses
      assetsByClass['Real Estate'].forEach(asset => {
        newSettings.realEstateToggles[asset.id] = value;
      });
      
      const realEstateSubClasses = [...new Set(assetsByClass['Real Estate'].map(a => a.sub_class))];
      realEstateSubClasses.forEach(subClass => {
        newSettings.realEstateSubClassToggles[subClass] = value;
      });
      
      return newSettings;
    });
  };

  // Similar functions for Private Equity
  const updatePrivateEquityToggle = (assetId: string, value: boolean) => {
    setSettings(prev => ({
      ...prev,
      privateEquityToggles: { ...prev.privateEquityToggles, [assetId]: value }
    }));
  };

  const updatePrivateEquitySubClassToggle = (subClass: string, value: boolean) => {
    setSettings(prev => {
      const newSettings = {
        ...prev,
        privateEquitySubClassToggles: { ...prev.privateEquitySubClassToggles, [subClass]: value }
      };
      
      const privateEquityAssets = assetsByClass['Private Equity'].filter(asset => asset.sub_class === subClass);
      privateEquityAssets.forEach(asset => {
        newSettings.privateEquityToggles[asset.id] = value;
      });
      
      return newSettings;
    });
  };

  const updatePrivateEquityClassToggle = (value: boolean) => {
    setSettings(prev => {
      const newSettings = {
        ...prev,
        privateEquityClassToggle: value,
        privateEquityToggles: {},
        privateEquitySubClassToggles: {}
      };
      
      assetsByClass['Private Equity'].forEach(asset => {
        newSettings.privateEquityToggles[asset.id] = value;
      });
      
      const privateEquitySubClasses = [...new Set(assetsByClass['Private Equity'].map(a => a.sub_class))];
      privateEquitySubClasses.forEach(subClass => {
        newSettings.privateEquitySubClassToggles[subClass] = value;
      });
      
      return newSettings;
    });
  };

  // Calculate totals for toggleable assets
  const getToggleableTotal = (assetClass: AssetClass, includeFactored = false) => {
    const classAssets = assetsByClass[assetClass];
    const toggleField = assetClass === 'Real Estate' ? 'realEstateToggles' : 'privateEquityToggles';
    
    return classAssets.reduce((total, asset) => {
      if (settings[toggleField][asset.id]) {
        if (assetClass === 'Private Equity') {
          // For Private Equity: calc.display_value is already factored, need to calculate full potential
          const calc = assetCalculations.get(asset.id);
          if (calc) {
            if (includeFactored) {
              return total + calc.display_value; // Already factored
            } else {
              // Calculate full potential using the same logic as calculateAssetValue
              let fxRate = 1;
              if (viewCurrency === 'USD') {
                const originToILS = fxRates[asset.origin_currency]?.to_ILS || 1;
                const usdToILS = fxRates['USD']?.to_ILS || 1;
                fxRate = originToILS / usdToILS;
              } else { // ILS
                fxRate = fxRates[asset.origin_currency]?.to_ILS || 1;
              }
              const fullPotentialValue = (asset.price || 0) * asset.quantity * fxRate;
              return total + fullPotentialValue;
            }
          }
        } else {
          // For Real Estate: use calc.display_value
          const calc = assetCalculations.get(asset.id);
          if (calc) {
            return total + calc.display_value;
          }
        }
      }
      return total;
    }, 0);
  };

  const chartConfig = {
    Cash: { color: 'hsl(var(--chart-1))' },
    "Fixed Income": { color: 'hsl(var(--chart-2))' },
    "Public Equity": { color: 'hsl(var(--chart-3))' },
    "Commodities & more": { color: 'hsl(var(--chart-4))' },
    "Real Estate": { color: 'hsl(var(--chart-5))' },
    "Private Equity Factored": { color: 'hsl(var(--primary))' },
    "Private Equity Potential": { color: 'hsl(var(--primary) / 0.6)' },
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
          <p className="font-medium mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.dataKey}: {formatCurrency(entry.value, viewCurrency)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const formatMillions = (value: number): string => {
    const millions = value / 1000000;
    return millions.toFixed(1);
  };

  const renderCustomLabel = (entry: any) => {
    if (!entry) return null;
    
    // Calculate total for this bar
    const total = Object.keys(entry)
      .filter(key => key !== 'year')
      .reduce((sum, key) => sum + (entry[key] || 0), 0);
    
    if (total === 0) return null;
    
    return `${formatMillions(total)}M`;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left Column - Settings */}
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Prediction Model Settings</CardTitle>
            <CardDescription>
              Configure your portfolio predictions for the next 3 years
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            
            {/* Cash */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-foreground">Cash</h3>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Current Total Value:</span>
                <span className="font-medium">{formatCurrency(classTotals['Cash'], viewCurrency)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Expected IRR:</span>
                <span className="font-medium">0%</span>
              </div>
            </div>

            <Separator />

            {/* Fixed Income */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-foreground">Fixed Income</h3>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Current Total Value:</span>
                <span className="font-medium">{formatCurrency(classTotals['Fixed Income'], viewCurrency)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Weighted Average YTW:</span>
                <span className="font-medium">{(fixedIncomeYTW * 100).toFixed(2)}%</span>
              </div>
            </div>

            <Separator />

            {/* Public Equity */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-foreground">Public Equity</h3>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Current Total Value:</span>
                <span className="font-medium">{formatCurrency(classTotals['Public Equity'], viewCurrency)}</span>
              </div>
              <div className="flex justify-between items-center">
                <Label htmlFor="public-equity-irr" className="text-muted-foreground">Expected IRR (%):</Label>
                <Input
                  id="public-equity-irr"
                  type="number"
                  value={settings.publicEquityIRR}
                  onChange={(e) => setSettings(prev => ({ ...prev, publicEquityIRR: Number(e.target.value) }))}
                  className="w-20 text-right"
                  step="0.1"
                />
              </div>
            </div>

            <Separator />

            {/* Commodities & more */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-foreground">Commodities & more</h3>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Current Total Value:</span>
                <span className="font-medium">{formatCurrency(classTotals['Commodities & more'], viewCurrency)}</span>
              </div>
              <div className="flex justify-between items-center">
                <Label htmlFor="commodities-irr" className="text-muted-foreground">Expected IRR (%):</Label>
                <Input
                  id="commodities-irr"
                  type="number"
                  value={settings.commoditiesMoreIRR}
                  onChange={(e) => setSettings(prev => ({ ...prev, commoditiesMoreIRR: Number(e.target.value) }))}
                  className="w-20 text-right"
                  step="0.1"
                />
              </div>
            </div>

            <Separator />

            {/* Real Estate */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-foreground">Real Estate</h3>
                <div className="flex items-center space-x-2">
                  <Label htmlFor="re-class-toggle" className="text-sm">Include All</Label>
                  <Switch
                    id="re-class-toggle"
                    checked={settings.realEstateClassToggle}
                    onCheckedChange={updateRealEstateClassToggle}
                  />
                </div>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Included Total Value:</span>
                <span className="font-medium">{formatCurrency(getToggleableTotal('Real Estate'), viewCurrency)}</span>
              </div>

              {/* Real Estate Sub-classes */}
              {[...new Set(assetsByClass['Real Estate'].map(a => a.sub_class))].map(subClass => (
                <div key={subClass} className="ml-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-foreground">{subClass}</h4>
                    <div className="flex items-center space-x-2">
                      <Label htmlFor={`re-sub-${subClass}`} className="text-sm">Include</Label>
                      <Switch
                        id={`re-sub-${subClass}`}
                        checked={settings.realEstateSubClassToggles[subClass] || false}
                        onCheckedChange={(value) => updateRealEstateSubClassToggle(subClass, value)}
                      />
                    </div>
                  </div>

                  {/* Individual Assets */}
                  {assetsByClass['Real Estate']
                    .filter(asset => asset.sub_class === subClass)
                    .map(asset => (
                       <div key={asset.id} className="ml-4 flex items-center justify-between text-sm">
                         <div className="flex items-center space-x-2">
                           <span className="text-muted-foreground">{asset.name}</span>
                           <span className="text-xs text-muted-foreground">
                             {formatCurrency(assetCalculations.get(asset.id)?.display_value || 0, viewCurrency)}
                           </span>
                         </div>
                        <div className="flex items-center space-x-4">
                          <Select 
                            value={settings.realEstateLiquidationYears[asset.id] || currentYear.toString()}
                            onValueChange={(value) => setSettings(prev => ({
                              ...prev,
                              realEstateLiquidationYears: { ...prev.realEstateLiquidationYears, [asset.id]: value }
                            }))}
                          >
                            <SelectTrigger className="w-20">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {yearOptions.map(year => (
                                <SelectItem key={year} value={year}>{year}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <div className="flex items-center space-x-2">
                            <Label htmlFor={`re-${asset.id}`} className="text-xs">Include</Label>
                            <Switch
                              id={`re-${asset.id}`}
                              checked={settings.realEstateToggles[asset.id] || false}
                              onCheckedChange={(value) => updateRealEstateToggle(asset.id, value)}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              ))}
            </div>

            <Separator />

            {/* Private Equity */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-foreground">Private Equity</h3>
                <div className="flex items-center space-x-2">
                  <Label htmlFor="pe-class-toggle" className="text-sm">Include All</Label>
                  <Switch
                    id="pe-class-toggle"
                    checked={settings.privateEquityClassToggle}
                    onCheckedChange={updatePrivateEquityClassToggle}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Factored Value:</span>
                  <span className="font-medium">{formatCurrency(getToggleableTotal('Private Equity', true), viewCurrency)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Full Potential Value:</span>
                  <span className="font-medium">{formatCurrency(getToggleableTotal('Private Equity', false), viewCurrency)}</span>
                </div>
              </div>

              {/* Private Equity Sub-classes */}
              {[...new Set(assetsByClass['Private Equity'].map(a => a.sub_class))].map(subClass => (
                <div key={subClass} className="ml-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-foreground">{subClass}</h4>
                    <div className="flex items-center space-x-2">
                      <Label htmlFor={`pe-sub-${subClass}`} className="text-sm">Include</Label>
                      <Switch
                        id={`pe-sub-${subClass}`}
                        checked={settings.privateEquitySubClassToggles[subClass] || false}
                        onCheckedChange={(value) => updatePrivateEquitySubClassToggle(subClass, value)}
                      />
                    </div>
                  </div>

                  {/* Individual Assets */}
                  {assetsByClass['Private Equity']
                    .filter(asset => asset.sub_class === subClass)
                    .map(asset => (
                       <div key={asset.id} className="ml-4 flex items-center justify-between text-sm">
                         <div className="flex items-center space-x-2">
                           <span className="text-muted-foreground">{asset.name}</span>
                           <span className="text-xs text-muted-foreground">
                             {formatCurrency(assetCalculations.get(asset.id)?.display_value || 0, viewCurrency)}
                           </span>
                           {asset.factor !== undefined && (
                             <span className="text-xs text-muted-foreground bg-muted px-1 py-0.5 rounded">
                               {(asset.factor * 100).toFixed(0)}%
                             </span>
                           )}
                         </div>
                        <div className="flex items-center space-x-4">
                          <Select 
                            value={settings.privateEquityLiquidationYears[asset.id] || currentYear.toString()}
                            onValueChange={(value) => setSettings(prev => ({
                              ...prev,
                              privateEquityLiquidationYears: { ...prev.privateEquityLiquidationYears, [asset.id]: value }
                            }))}
                          >
                            <SelectTrigger className="w-20">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {yearOptions.map(year => (
                                <SelectItem key={year} value={year}>{year}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <div className="flex items-center space-x-2">
                            <Label htmlFor={`pe-${asset.id}`} className="text-xs">Include</Label>
                            <Switch
                              id={`pe-${asset.id}`}
                              checked={settings.privateEquityToggles[asset.id] || false}
                              onCheckedChange={(value) => updatePrivateEquityToggle(asset.id, value)}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              ))}
            </div>

          </CardContent>
        </Card>
      </div>

      {/* Right Column - Chart */}
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Liquid Portfolio Projection</CardTitle>
            <CardDescription>
              Evolution of your liquid portfolio over time based on prediction settings
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[500px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 40, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="year" 
                    className="text-muted-foreground"
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis 
                    className="text-muted-foreground"
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => formatCurrency(value, viewCurrency)}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend 
                    wrapperStyle={{ fontSize: '12px' }}
                    iconType="rect"
                  />
                  <Bar dataKey="Cash" stackId="a" fill={chartConfig.Cash.color} />
                  <Bar dataKey="Fixed Income" stackId="a" fill={chartConfig["Fixed Income"].color} />
                  <Bar dataKey="Public Equity" stackId="a" fill={chartConfig["Public Equity"].color} />
                  <Bar dataKey="Commodities & more" stackId="a" fill={chartConfig["Commodities & more"].color} />
                  <Bar dataKey="Real Estate" stackId="a" fill={chartConfig["Real Estate"].color} />
                  <Bar dataKey="Private Equity Factored" stackId="a" fill={chartConfig["Private Equity Factored"].color} />
                  <Bar dataKey="Private Equity Potential" stackId="a" fill={chartConfig["Private Equity Potential"].color}>
                    <LabelList 
                      content={(props: any) => {
                        const { payload, x, y, width } = props;
                        if (!payload) return null;
                        
                        const total = Object.keys(payload)
                          .filter(key => key !== 'year')
                          .reduce((sum, key) => {
                            const value = payload[key];
                            return sum + (typeof value === 'number' ? value : 0);
                          }, 0);
                        
                        if (total === 0) return null;
                        
                        return (
                          <text 
                            x={(x || 0) + (width || 0) / 2} 
                            y={(y || 0) - 10} 
                            textAnchor="middle" 
                            fontSize="12"
                            fill="currentColor"
                            className="fill-foreground font-medium"
                          >
                            {formatMillions(total)}M
                          </text>
                        );
                      }}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
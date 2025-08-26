import { useState, useMemo } from 'react';
import { Asset, ViewCurrency, FXRates, AssetClass, FixedIncomeSubClass } from '@/types/portfolio';
import { calculateAssetValue, formatCurrency, formatPercentage } from '@/lib/portfolio-utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';

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

interface PortfolioPredictionsProps {
  assets: Asset[];
  viewCurrency: ViewCurrency;
  fxRates: FXRates;
}

export function PortfolioPredictions({ assets, viewCurrency, fxRates }: PortfolioPredictionsProps) {
  const currentYear = new Date().getFullYear();
  const yearOptions = [
    currentYear.toString().slice(-2),
    (currentYear + 1).toString().slice(-2),
    (currentYear + 2).toString().slice(-2),
    (currentYear + 3).toString().slice(-2),
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
  const fixedIncomeYTW = useMemo(() => {
    const fixedIncomeAssets = assetsByClass['Fixed Income'];
    let totalValue = 0;
    let weightedYTW = 0;

    fixedIncomeAssets.forEach(asset => {
      if (asset.ytw) {
        const calc = assetCalculations.get(asset.id);
        if (calc) {
          totalValue += calc.display_value;
          weightedYTW += asset.ytw * calc.display_value;
        }
      }
    });

    return totalValue > 0 ? (weightedYTW / totalValue) * 100 : 0;
  }, [assetsByClass, assetCalculations]);

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
        const calc = assetCalculations.get(asset.id);
        if (calc) {
          if (includeFactored && asset.factor !== undefined) {
            return total + (calc.display_value * asset.factor);
          }
          return total + calc.display_value;
        }
      }
      return total;
    }, 0);
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-6">
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
                <span className="font-medium">{formatPercentage(fixedIncomeYTW / 100)}</span>
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
                        <span className="text-muted-foreground">{asset.name}</span>
                        <div className="flex items-center space-x-4">
                          <Select 
                            value={settings.realEstateLiquidationYears[asset.id] || currentYear.toString().slice(-2)}
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
                        <span className="text-muted-foreground">{asset.name}</span>
                        <div className="flex items-center space-x-4">
                          <Select 
                            value={settings.privateEquityLiquidationYears[asset.id] || currentYear.toString().slice(-2)}
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
    </div>
  );
}
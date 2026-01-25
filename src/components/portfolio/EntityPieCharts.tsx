import { Asset, ViewCurrency, FXRates, AssetClass } from "@/types/portfolio";
import { calculateAssetValue, formatCurrency } from "@/lib/portfolio-utils";
import { ACCOUNT_ENTITIES } from "@/constants/portfolio";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { useMemo, useState } from "react";

interface EntityPieChartsProps {
  assets: Asset[];
  viewCurrency: ViewCurrency;
  fxRates: FXRates;
}

type ChartCategory = 'Cash' | 'Bonds' | 'Public Equity' | 'Private Funds' | 'Real Estate' | 'Private Equity';
type Person = 'Shimon' | 'Hagit' | 'Roy' | 'Guy' | 'Roni' | 'Tom';

const PERSONS: Person[] = ['Shimon', 'Hagit', 'Roy', 'Guy', 'Roni', 'Tom'];

// Define which entities contribute to each person and with what weight
const PERSON_ENTITY_WEIGHTS: Record<Person, Record<string, number>> = {
  'Shimon': { 'Shimon': 1, 'B Joel': 1 },
  'Hagit': { 'Hagit': 1 },
  'Roy': { 'Roy': 1, 'SW2009': 1/3, 'Weintraub': 1/3 },
  'Guy': { 'Guy': 1, 'SW2009': 1/3, 'Weintraub': 1/3 },
  'Roni': { 'Roni': 1, 'SW2009': 1/3, 'Weintraub': 1/3 },
  'Tom': { 'Tom': 1 },
};

const COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "hsl(var(--chart-6))",
];

// Fixed category to color mapping for consistency across all charts
const CATEGORY_COLORS: Record<ChartCategory, string> = {
  'Cash': "hsl(var(--chart-1))",
  'Bonds': "hsl(var(--chart-2))",
  'Public Equity': "hsl(var(--chart-3))",
  'Private Funds': "hsl(var(--chart-4))",
  'Real Estate': "hsl(var(--chart-5))",
  'Private Equity': "hsl(var(--chart-6))",
};

function classifyAssetCategory(asset: Asset): ChartCategory | null {
  // Cash: Cash class OR Fixed Income (Bank Deposit / Money Market)
  if (asset.class === 'Cash') return 'Cash';
  if (asset.class === 'Fixed Income' && 
      (asset.sub_class === 'Bank Deposit' || asset.sub_class === 'Money Market')) {
    return 'Cash';
  }
  
  // Private Funds: Private Credit OR Crypto Fund (Ben)
  if (asset.class === 'Fixed Income' && asset.sub_class === 'Private Credit') {
    return 'Private Funds';
  }
  if (asset.name === 'Crypto Fund (Ben)') {
    return 'Private Funds';
  }
  
  // Bonds: Fixed Income (excluding already categorized sub-classes)
  if (asset.class === 'Fixed Income') return 'Bonds';
  
  // Public Equity: Public Equity + Commodities & more (except Crypto Fund already categorized)
  if (asset.class === 'Public Equity' || asset.class === 'Commodities & more') {
    return 'Public Equity';
  }
  
  // Optional categories
  if (asset.class === 'Real Estate') return 'Real Estate';
  if (asset.class === 'Private Equity') return 'Private Equity';
  
  return null;
}

interface PieLegendProps {
  items: Array<{ name: string; value: number; percentage: number }>;
  viewCurrency: ViewCurrency;
}

function CustomPieLegend({ items, viewCurrency }: PieLegendProps) {
  return (
    <ul className="space-y-1 text-xs">
      {items.map((item) => (
        <li key={item.name} className="flex items-center gap-2">
          <span
            className="h-2.5 w-2.5 rounded-[2px] flex-shrink-0"
            style={{ backgroundColor: CATEGORY_COLORS[item.name as ChartCategory] }}
          />
          <span className="text-muted-foreground truncate">
            {item.name}: {formatCurrency(item.value, viewCurrency)} ({item.percentage.toFixed(1)}%)
          </span>
        </li>
      ))}
    </ul>
  );
}

export function EntityPieCharts({ assets, viewCurrency, fxRates }: EntityPieChartsProps) {
  const [includeRealEstateAndPE, setIncludeRealEstateAndPE] = useState(false);
  const [aggregateByPerson, setAggregateByPerson] = useState(true);

  const entityData = useMemo(() => {
    // Calculate values for each asset
    const assetValues = new Map<string, number>();
    assets.forEach((asset) => {
      const calc = calculateAssetValue(asset, fxRates, viewCurrency);
      assetValues.set(asset.id, calc.display_value);
    });

    // Group by entity and category
    const result: Record<string, Record<ChartCategory, number>> = {};
    
    ACCOUNT_ENTITIES.forEach((entity) => {
      result[entity] = {
        'Cash': 0,
        'Bonds': 0,
        'Public Equity': 0,
        'Private Funds': 0,
        'Real Estate': 0,
        'Private Equity': 0,
      };
    });

    assets.forEach((asset) => {
      const category = classifyAssetCategory(asset);
      if (!category) return;

      const value = assetValues.get(asset.id) || 0;
      if (result[asset.account_entity]) {
        result[asset.account_entity][category] += value;
      }
    });

    return result;
  }, [assets, fxRates, viewCurrency]);

  // Aggregate by person when toggle is enabled
  const personData = useMemo(() => {
    if (!aggregateByPerson) return null;
    
    const result: Record<Person, Record<ChartCategory, number>> = {} as Record<Person, Record<ChartCategory, number>>;
    
    PERSONS.forEach((person) => {
      result[person] = {
        'Cash': 0,
        'Bonds': 0,
        'Public Equity': 0,
        'Private Funds': 0,
        'Real Estate': 0,
        'Private Equity': 0,
      };
      
      // Sum up contributions from each entity with their weights
      const weights = PERSON_ENTITY_WEIGHTS[person];
      Object.entries(weights).forEach(([entity, weight]) => {
        const entityValues = entityData[entity];
        if (entityValues) {
          (Object.keys(result[person]) as ChartCategory[]).forEach((cat) => {
            result[person][cat] += entityValues[cat] * weight;
          });
        }
      });
    });
    
    return result;
  }, [entityData, aggregateByPerson]);

  // Filter entities/persons that have assets and prepare pie chart data
  const chartItems = useMemo(() => {
    const baseCategories: ChartCategory[] = ['Cash', 'Bonds', 'Public Equity', 'Private Funds'];
    const allCategories: ChartCategory[] = includeRealEstateAndPE 
      ? [...baseCategories, 'Real Estate', 'Private Equity']
      : baseCategories;

    const dataSource = aggregateByPerson && personData ? personData : entityData;
    const labels = aggregateByPerson ? PERSONS : ACCOUNT_ENTITIES;

    return labels
      .map((label) => {
        const data = dataSource[label];
        if (!data) return null;
        
        const chartData = allCategories
          .filter((cat) => data[cat] > 0)
          .map((cat) => ({
            name: cat,
            value: data[cat],
            percentage: 0,
          }));

        const total = chartData.reduce((sum, item) => sum + item.value, 0);
        chartData.forEach((item) => {
          item.percentage = total > 0 ? (item.value / total) * 100 : 0;
        });

        return { label, total, chartData };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null && item.total > 0);
  }, [entityData, personData, aggregateByPerson, includeRealEstateAndPE]);

  if (chartItems.length === 0) {
    return null;
  }

  return (
    <Card className="bg-gradient-to-br from-card to-muted/20 shadow-card border-border/50">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="text-lg font-bold text-financial-primary">
              Asset Breakdown by {aggregateByPerson ? 'Person' : 'Entity'}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Categories: Cash, Bonds, Public Equity, Private Funds
              {includeRealEstateAndPE && ", Real Estate, Private Equity"}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex items-center space-x-2">
              <Switch 
                checked={aggregateByPerson} 
                onCheckedChange={setAggregateByPerson}
                id="aggregate-by-person"
              />
              <label htmlFor="aggregate-by-person" className="text-sm text-muted-foreground cursor-pointer">
                Aggregate by Person
              </label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch 
                checked={includeRealEstateAndPE} 
                onCheckedChange={setIncludeRealEstateAndPE}
                id="include-re-pe"
              />
              <label htmlFor="include-re-pe" className="text-sm text-muted-foreground cursor-pointer">
                Include Real Estate & Private Equity
              </label>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {chartItems.map(({ label, total, chartData }) => (
            <Card key={label} className="bg-muted/30 border-border/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">{label}</CardTitle>
                <p className="text-sm text-muted-foreground font-mono">
                  {formatCurrency(total, viewCurrency)}
                </p>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie 
                        data={chartData} 
                        cx="50%" 
                        cy="50%" 
                        outerRadius={55}
                        innerRadius={25}
                        dataKey="value"
                        paddingAngle={2}
                      >
                        {chartData.map((entry) => (
                          <Cell 
                            key={`cell-${entry.name}`} 
                            fill={CATEGORY_COLORS[entry.name as ChartCategory]} 
                          />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value: number) => [formatCurrency(value, viewCurrency), "Value"]} 
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-3">
                  <CustomPieLegend items={chartData} viewCurrency={viewCurrency} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

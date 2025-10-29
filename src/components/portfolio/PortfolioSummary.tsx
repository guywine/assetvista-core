import { Asset, ViewCurrency, FXRates, AssetCalculations } from "@/types/portfolio";
import {
  calculateAssetValue,
  formatCurrency,
  formatPercentage,
  calculateWeightedYTW,
  isMaturityWithinYear,
} from "@/lib/portfolio-utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { useState } from "react";
interface PortfolioSummaryProps {
  assets: Asset[];
  viewCurrency: ViewCurrency;
  fxRates: FXRates;
}
export function PortfolioSummary({ assets, viewCurrency, fxRates }: PortfolioSummaryProps) {
  // State for managing asset class visibility in pie chart
  const [visibleAssetClasses, setVisibleAssetClasses] = useState<Record<string, boolean>>({});

  // State for managing Real Estate inclusion in beneficiaries chart
  const [includeRealEstate, setIncludeRealEstate] = useState<boolean>(true);

  // State for managing Real Estate inclusion in currency chart
  const [includeRealEstateInCurrency, setIncludeRealEstateInCurrency] = useState<boolean>(true);

  // State for excluding Money Market and Bank Deposits from Fixed Income chart
  const [excludeMMAndDeposits, setExcludeMMAndDeposits] = useState<boolean>(true);

  // Helper function to format values in millions for Y-axis
  const formatMillions = (value: number): string => {
    const millions = value / 1000000;
    return `${millions.toFixed(1)}M`;
  };

  // Calculate all asset values
  const calculations = new Map<string, AssetCalculations>();
  assets.forEach((asset) => {
    calculations.set(asset.id, calculateAssetValue(asset, fxRates, viewCurrency));
  });
  const totalValue = assets.reduce((sum, asset) => {
    const calc = calculations.get(asset.id);
    return sum + (calc?.display_value || 0);
  }, 0);

  // Cash & Equivalents calculation - now using the is_cash_equivalent field
  const cashEquivalentsValue = assets.reduce((sum, asset) => {
    const calc = calculations.get(asset.id);
    const value = calc?.display_value || 0;

    // Use the pre-calculated is_cash_equivalent field
    if (asset.is_cash_equivalent) {
      return sum + value;
    }
    return sum;
  }, 0);

  // Cash & Equivalents breakdown by subcategory
  const cashEquivalentsBreakdown = {
    cash: 0,
    moneyMarket: 0,
    bankDeposits: 0,
    maturingNotes: 0,
  };

  assets.forEach((asset) => {
    if (!asset.is_cash_equivalent) return;

    const calc = calculations.get(asset.id);
    const value = calc?.display_value || 0;

    // 1) Cash
    if (asset.class === "Cash") {
      cashEquivalentsBreakdown.cash += value;
    }
    // 2) Money Market funds
    else if (asset.class === "Fixed Income" && asset.sub_class === "Money Market") {
      cashEquivalentsBreakdown.moneyMarket += value;
    }
    // 3) Bank Deposits
    else if (asset.class === "Fixed Income" && asset.sub_class === "Bank Deposit") {
      cashEquivalentsBreakdown.bankDeposits += value;
    }
    // 4) Notes maturing within 365 days (Fixed Income but not Money Market or Bank Deposit)
    else if (asset.class === "Fixed Income" && isMaturityWithinYear(asset.maturity_date)) {
      cashEquivalentsBreakdown.maturingNotes += value;
    }
  });

  // Holdings by Class
  const holdingsByClass = assets.reduce(
    (acc, asset) => {
      const calc = calculations.get(asset.id);
      const value = calc?.display_value || 0;
      if (!acc[asset.class]) {
        acc[asset.class] = {
          count: 0,
          value: 0,
        };
      }
      acc[asset.class].count++;
      acc[asset.class].value += value;
      return acc;
    },
    {} as Record<
      string,
      {
        count: number;
        value: number;
      }
    >,
  );

  // Holdings by Entity
  const holdingsByEntity = assets.reduce(
    (acc, asset) => {
      const calc = calculations.get(asset.id);
      const value = calc?.display_value || 0;
      if (!acc[asset.account_entity]) {
        acc[asset.account_entity] = 0;
      }
      acc[asset.account_entity] += value;
      return acc;
    },
    {} as Record<string, number>,
  );

  // Sub-class breakdown by asset class
  const subClassBreakdown = assets.reduce(
    (acc, asset) => {
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
    },
    {} as Record<string, Record<string, number>>,
  );

  // Initialize visibility state if empty
  if (Object.keys(visibleAssetClasses).length === 0) {
    const initialVisibility: Record<string, boolean> = {};
    Object.keys(holdingsByClass).forEach((className) => {
      initialVisibility[className] = true;
    });
    setVisibleAssetClasses(initialVisibility);
  }

  // Filter pie chart data based on visible asset classes
  const filteredHoldingsByClass = Object.entries(holdingsByClass)
    .filter(([className]) => visibleAssetClasses[className])
    .reduce(
      (acc, [className, data]) => {
        acc[className] = data;
        return acc;
      },
      {} as Record<
        string,
        {
          count: number;
          value: number;
        }
      >,
    );

  // Calculate filtered total value for enabled asset classes only
  const filteredTotalValue = Object.values(filteredHoldingsByClass).reduce((sum, data) => sum + data.value, 0);

  // Pie chart data for asset allocation (filtered)
  const pieData = Object.entries(filteredHoldingsByClass).map(([className, data]) => ({
    name: className,
    value: data.value,
    percentage: filteredTotalValue > 0 ? (data.value / filteredTotalValue) * 100 : 0,
  }));

  // Beneficiaries calculations (exclude Private Equity, exclude Tom, optionally exclude Real Estate)
  const beneficiariesAssets = assets.filter((asset) => {
    if (asset.class === "Private Equity") return false;
    if (asset.beneficiary === "Tom") return false;
    if (!includeRealEstate && asset.class === "Real Estate") return false;
    return true;
  });
  const holdingsByBeneficiary = beneficiariesAssets.reduce(
    (acc, asset) => {
      const calc = calculations.get(asset.id);
      const value = calc?.display_value || 0;
      if (!acc[asset.beneficiary]) {
        acc[asset.beneficiary] = 0;
      }
      acc[asset.beneficiary] += value;
      return acc;
    },
    {} as Record<string, number>,
  );

  // Filter to only include Shimon, Hagit, Kids
  const targetBeneficiaries = ["Shimon", "Hagit", "Kids"];
  const filteredBeneficiaries = Object.entries(holdingsByBeneficiary)
    .filter(([beneficiary]) => targetBeneficiaries.includes(beneficiary))
    .reduce(
      (acc, [beneficiary, value]) => {
        acc[beneficiary] = value;
        return acc;
      },
      {} as Record<string, number>,
    );
  const beneficiariesTotalValue = Object.values(filteredBeneficiaries).reduce((sum, value) => sum + value, 0);

  // Beneficiaries pie chart data
  const beneficiariesPieData = Object.entries(filteredBeneficiaries).map(([beneficiary, value]) => ({
    name: beneficiary,
    value: value,
    percentage: beneficiariesTotalValue > 0 ? (value / beneficiariesTotalValue) * 100 : 0,
  }));

  // Currency calculations (exclude Private Equity, optionally exclude Real Estate)
  const currencyAssets = assets.filter((asset) => {
    if (asset.class === "Private Equity") return false;
    if (!includeRealEstateInCurrency && asset.class === "Real Estate") return false;
    return true;
  });
  const holdingsByCurrency = currencyAssets.reduce(
    (acc, asset) => {
      const calc = calculations.get(asset.id);
      const value = calc?.display_value || 0;
      if (!acc[asset.origin_currency]) {
        acc[asset.origin_currency] = 0;
      }
      acc[asset.origin_currency] += value;
      return acc;
    },
    {} as Record<string, number>,
  );
  const currencyTotalValue = Object.values(holdingsByCurrency).reduce((sum, value) => sum + value, 0);

  // Currency pie chart data
  const currencyPieData = Object.entries(holdingsByCurrency).map(([currency, value]) => ({
    name: currency,
    value: value,
    percentage: currencyTotalValue > 0 ? (value / currencyTotalValue) * 100 : 0,
  }));

  // Fixed Income YTW calculations
  const fixedIncomeAssets = assets.filter((asset) => asset.class === "Fixed Income" && asset.ytw !== undefined);
  const fixedIncomeWeightedYTW = calculateWeightedYTW(assets, calculations);

  // Fixed Income YTW excluding Money Market and Bank Deposit
  const fixedIncomeExcludingCashEquivalents = assets.filter(
    (asset) =>
      asset.class === "Fixed Income" &&
      asset.ytw !== undefined &&
      asset.sub_class !== "Money Market" &&
      asset.sub_class !== "Bank Deposit",
  );
  const fixedIncomeWeightedYTWExcludingCash = calculateWeightedYTW(fixedIncomeExcludingCashEquivalents, calculations);

  // Fixed Income sub-class YTW calculations
  const fixedIncomeSubClassYTW = fixedIncomeAssets.reduce(
    (acc, asset) => {
      const calc = calculations.get(asset.id);
      const value = calc?.display_value || 0;
      if (!acc[asset.sub_class]) {
        acc[asset.sub_class] = {
          totalValue: 0,
          weightedYTW: 0,
        };
      }
      acc[asset.sub_class].totalValue += value;
      acc[asset.sub_class].weightedYTW += asset.ytw! * value;
      return acc;
    },
    {} as Record<
      string,
      {
        totalValue: number;
        weightedYTW: number;
      }
    >,
  );

  // Calculate final weighted YTW for each sub-class
  const fixedIncomeSubClassAverageYTW = Object.entries(fixedIncomeSubClassYTW).reduce(
    (acc, [subClass, data]) => {
      acc[subClass] = data.totalValue > 0 ? data.weightedYTW / data.totalValue : 0;
      return acc;
    },
    {} as Record<string, number>,
  );

  // Fixed Income pie chart data
  const fixedIncomeSubClasses = subClassBreakdown["Fixed Income"] || {};
  const fixedIncomePieDataAll = Object.entries(fixedIncomeSubClasses).map(([subClass, value]) => ({
    name: subClass,
    value: value,
    percentage: holdingsByClass["Fixed Income"]?.value > 0 ? (value / holdingsByClass["Fixed Income"].value) * 100 : 0,
  }));

  // Filter based on toggle state
  const fixedIncomePieData = excludeMMAndDeposits
    ? fixedIncomePieDataAll.filter((item) => item.name !== "Money Market" && item.name !== "Bank Deposit")
    : fixedIncomePieDataAll;

  const fixedIncomePieTotal = fixedIncomePieData.reduce((sum, item) => sum + item.value, 0);

  // Create pie chart data for each asset class that has assets
  const subClassPieData = Object.entries(subClassBreakdown).reduce(
    (acc, [assetClass, subClasses]) => {
      const classTotal = Object.values(subClasses).reduce((sum, value) => sum + value, 0);

      // Only create pie data if there are assets in this class
      if (classTotal > 0) {
        acc[assetClass] = Object.entries(subClasses).map(([subClass, value]) => ({
          name: subClass,
          value: value,
          percentage: classTotal > 0 ? (value / classTotal) * 100 : 0,
        }));
      }
      return acc;
    },
    {} as Record<
      string,
      Array<{
        name: string;
        value: number;
        percentage: number;
      }>
    >,
  );
  const COLORS = [
    "hsl(var(--chart-1))",
    "hsl(var(--chart-2))",
    "hsl(var(--chart-3))",
    "hsl(var(--chart-4))",
    "hsl(var(--chart-5))",
    "hsl(var(--chart-6))",
    "hsl(var(--chart-7))",
    "hsl(var(--chart-8))",
    "hsl(var(--chart-9))",
    "hsl(var(--chart-10))",
  ];
  const SUB_CLASS_COLORS = [
    "hsl(var(--chart-1))",
    "hsl(var(--chart-2))",
    "hsl(var(--chart-3))",
    "hsl(var(--chart-4))",
    "hsl(var(--chart-5))",
    "hsl(var(--chart-6))",
    "hsl(var(--chart-7))",
    "hsl(var(--chart-8))",
    "hsl(var(--chart-9))",
    "hsl(var(--chart-10))",
  ];

  // Custom Legend Component
  const CustomPieLegend = ({
    items,
    colors,
    showValue = false,
    valueFormatter = (n: number) => formatCurrency(n, viewCurrency),
  }: {
    items: Array<{ name: string; value: number; percentage: number }>;
    colors: string[];
    showValue?: boolean;
    valueFormatter?: (n: number) => string;
  }) => (
    <ul className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
      {items.map((item, index) => (
        <li key={item.name} className="inline-flex items-center gap-2">
          <span
            className="h-3 w-3 rounded-[3px] flex-shrink-0"
            style={{ backgroundColor: colors[index % colors.length] }}
          />
          <span className="text-muted-foreground">
            {showValue
              ? `${item.name}: ${valueFormatter(item.value)} (${item.percentage.toFixed(1)}%)`
              : `${item.name}: ${item.percentage.toFixed(1)}%`}
          </span>
        </li>
      ))}
    </ul>
  );

  return (
    <div className="space-y-8">
      {/* Increased spacing between major sections */}
      {/* Cash & Equivalents Summary */}
      <Card className="bg-gradient-to-br from-accent/10 to-accent/5 shadow-card border-accent/20">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-accent-foreground">Cash & Equivalents</CardTitle>
          <p className="text-sm text-muted-foreground">
            Includes: Cash, Money Market funds, Bank Deposits and Notes maturing within 365 days
          </p>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-accent-foreground">
            {formatCurrency(cashEquivalentsValue, viewCurrency)}
          </div>
          <div className="text-sm text-muted-foreground mt-1">
            {((cashEquivalentsValue / totalValue) * 100).toFixed(1)}% of total portfolio
          </div>

          {/* Breakdown by subcategory */}
          <div className="mt-6 pt-4 border-t border-accent/20">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-xs text-muted-foreground mb-1">Cash</div>
                <div className="font-mono font-semibold text-sm">
                  {formatCurrency(cashEquivalentsBreakdown.cash, viewCurrency)}
                </div>
              </div>
              <div className="text-center">
                <div className="text-xs text-muted-foreground mb-1">Money Market Funds</div>
                <div className="font-mono font-semibold text-sm">
                  {formatCurrency(cashEquivalentsBreakdown.moneyMarket, viewCurrency)}
                </div>
              </div>
              <div className="text-center">
                <div className="text-xs text-muted-foreground mb-1">Bank Deposits</div>
                <div className="font-mono font-semibold text-sm">
                  {formatCurrency(cashEquivalentsBreakdown.bankDeposits, viewCurrency)}
                </div>
              </div>
              <div className="text-center">
                <div className="text-xs text-muted-foreground mb-1">Maturing Notes (365 days)</div>
                <div className="font-mono font-semibold text-sm">
                  {formatCurrency(cashEquivalentsBreakdown.maturingNotes, viewCurrency)}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* First Row - Holdings Tables */}

      {/* Second Row - Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Overall Asset Allocation Chart */}
        <Card className="bg-gradient-to-br from-card to-muted/20 shadow-card border-border/50">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-financial-primary">Asset Allocation</CardTitle>
            <p className="text-sm text-muted-foreground">
              Total: {formatCurrency(filteredTotalValue, viewCurrency)} (
              {Object.values(visibleAssetClasses).filter(Boolean).length} classes selected)
            </p>
          </CardHeader>
          <CardContent>
            <div>
              <div className="h-56 md:h-64 lg:h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" outerRadius={80} fill="#8884d8" dataKey="value">
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => [formatCurrency(value, viewCurrency), "Value"]} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4">
                <CustomPieLegend items={pieData} colors={COLORS} showValue={false} />
              </div>
            </div>

            {/* Asset Class Values Summary with Toggles */}
            <div className="mt-6 space-y-2">
              {Object.entries(holdingsByClass).map(([className, data]) => (
                <div key={className} className="flex justify-between items-center py-2 text-sm">
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={visibleAssetClasses[className] || false}
                      onCheckedChange={(checked) =>
                        setVisibleAssetClasses((prev) => ({
                          ...prev,
                          [className]: checked,
                        }))
                      }
                    />
                    <span
                      className={`${visibleAssetClasses[className] ? "text-foreground" : "text-muted-foreground/50"}`}
                    >
                      {className}
                    </span>
                  </div>
                  <span
                    className={`font-mono font-semibold ${visibleAssetClasses[className] ? "text-foreground" : "text-muted-foreground/50"}`}
                  >
                    {formatCurrency(data.value, viewCurrency)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Value by Beneficiaries Chart */}
        <Card className="bg-gradient-to-br from-card to-muted/20 shadow-card border-border/50">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-financial-primary">Value by Beneficiaries</CardTitle>
            <p className="text-sm text-muted-foreground">
              Total asset value, excluding Private Equity{!includeRealEstate ? " and Real Estate" : ""}
            </p>
            <div className="flex items-center space-x-2 mt-2">
              <Switch checked={includeRealEstate} onCheckedChange={setIncludeRealEstate} />
              <span className="text-sm text-muted-foreground">Include Real Estate</span>
            </div>
          </CardHeader>
          <CardContent>
            <div>
              <div className="h-56 md:h-64 lg:h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={beneficiariesPieData} cx="50%" cy="50%" outerRadius={80} fill="#8884d8" dataKey="value">
                      {beneficiariesPieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => [formatCurrency(value, viewCurrency), "Value"]} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4">
                <CustomPieLegend items={beneficiariesPieData} colors={COLORS} showValue={true} />
              </div>
            </div>

            {/* Beneficiaries Summary */}
            <div className="mt-6 space-y-2">
              {Object.entries(filteredBeneficiaries).map(([beneficiary, value]) => (
                <div key={beneficiary} className="flex justify-between items-center py-1 text-sm">
                  <span className="text-foreground">{beneficiary}</span>
                  <span className="font-mono font-semibold text-foreground">{formatCurrency(value, viewCurrency)}</span>
                </div>
              ))}
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
              Total asset value, excluding Private Equity{!includeRealEstateInCurrency ? " and Real Estate" : ""}
            </p>
            <div className="flex items-center space-x-2 mt-2">
              <Switch checked={includeRealEstateInCurrency} onCheckedChange={setIncludeRealEstateInCurrency} />
              <span className="text-sm text-muted-foreground">Include Real Estate</span>
            </div>
          </CardHeader>
          <CardContent>
            <div>
              <div className="h-56 md:h-64 lg:h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={currencyPieData} cx="50%" cy="50%" outerRadius={80} fill="#8884d8" dataKey="value">
                      {currencyPieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => [formatCurrency(value, viewCurrency), "Value"]} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4">
                <CustomPieLegend items={currencyPieData} colors={COLORS} showValue={true} />
              </div>
            </div>

            {/* Currency Summary */}
            <div className="mt-6 space-y-2">
              {Object.entries(holdingsByCurrency).map(([currency, value]) => (
                <div key={currency} className="flex justify-between items-center py-1 text-sm">
                  <span className="text-foreground">{currency}</span>
                  <span className="font-mono font-semibold text-foreground">{formatCurrency(value, viewCurrency)}</span>
                </div>
              ))}
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
      {holdingsByClass["Public Equity"]?.value > 0 && (
        <div className="space-y-4 pt-8 border-t border-financial-primary/20">
          {/* Added elegant top border */}
          <div className="flex items-center gap-4 mb-6">
            <div className="h-0.5 flex-1 bg-muted-foreground/20 rounded-full"></div>
            <h2 className="text-3xl font-bold text-muted-foreground">Public Equity, Commodities &amp; more</h2>
            <div className="h-0.5 flex-1 bg-muted-foreground/20 rounded-full"></div>
          </div>

          {/* Top 10 Positions Bar Chart for Public Equity and Commodities & more */}
          {(() => {
            // Filter assets for Public Equity and Commodities & more
            const targetClasses = ["Public Equity", "Commodities & more"];
            const filteredAssets = assets.filter((asset) => targetClasses.includes(asset.class));

            // Helper function to detect Bitcoin-related assets
            const isBitcoinAsset = (assetName: string): boolean => {
              const name = assetName.toLowerCase();
              return name.includes("bitcoin") || name.includes("btc");
            };

            // Group by asset name and sum their values, with special handling for Bitcoin
            const positionsByName = filteredAssets.reduce(
              (acc, asset) => {
                const calc = calculations.get(asset.id);
                const value = calc?.display_value || 0;

                // Group all Bitcoin-related assets under one name
                const groupName = isBitcoinAsset(asset.name) ? "Bitcoin (All)" : asset.name;
                if (!acc[groupName]) {
                  acc[groupName] = {
                    name: groupName,
                    class: asset.class,
                    sub_class: isBitcoinAsset(asset.name) ? "Cryptocurrency" : asset.sub_class,
                    totalValue: 0,
                  };
                }
                acc[groupName].totalValue += value;
                return acc;
              },
              {} as Record<
                string,
                {
                  name: string;
                  class: string;
                  sub_class: string;
                  totalValue: number;
                }
              >,
            );

            // Calculate total value for percentage calculations
            const classesTotal =
              (holdingsByClass["Public Equity"]?.value || 0) + (holdingsByClass["Commodities & more"]?.value || 0);

            // Get top 10 positions
            const top10Positions = Object.values(positionsByName)
              .sort((a, b) => b.totalValue - a.totalValue)
              .slice(0, 10);

            // Format data for bar chart
            const chartData = top10Positions.map((position) => ({
              name: position.name.length > 15 ? position.name.substring(0, 15) + "..." : position.name,
              fullName: position.name,
              value: position.totalValue,
              percentage: classesTotal > 0 ? (position.totalValue / classesTotal) * 100 : 0,
              class: position.class,
            }));
            return chartData.length > 0 ? (
              <Card className="bg-gradient-to-br from-card to-muted/20 shadow-card border-border/50 mb-6">
                <CardHeader className="py-3 px-4 md:py-6">
                  <CardTitle className="text-lg font-bold text-financial-primary">
                    Top 10 Public Equity Positions
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">Public Equity & Commodities combined by asset name</p>
                </CardHeader>
                <CardContent className="py-3 px-4 md:py-6">
                  <div className="h-[380px] md:h-80 p-1">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={chartData}
                        margin={{
                          top: 10,
                          right: 5,
                          left: 0,
                          bottom: 90,
                        }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                        <XAxis
                          dataKey="name"
                          tick={{
                            fontSize: 12,
                            fill: "#6B7280",
                          }}
                          angle={-45}
                          textAnchor="end"
                          height={80}
                          interval={0}
                          tickMargin={6}
                        />
                        <YAxis
                          tick={{
                            fontSize: 12,
                            fill: "#6B7280",
                          }}
                          tickFormatter={(value) => formatMillions(value)}
                        />
                        <Tooltip
                          formatter={(value: number, name, props) => [formatCurrency(value, viewCurrency), "Value"]}
                          labelFormatter={(label, payload) => {
                            if (payload && payload[0]) {
                              const data = payload[0].payload;
                              return data.fullName;
                            }
                            return label;
                          }}
                          labelStyle={{
                            color: "hsl(var(--foreground))",
                          }}
                          contentStyle={{
                            backgroundColor: "hsl(var(--background))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px",
                            color: "hsl(var(--foreground))",
                          }}
                        />
                        <Bar dataKey="value" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                      </BarChart>
                     </ResponsiveContainer>
                   </div>
                 </CardContent>
              </Card>
            ) : null;
          })()}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Public Equity Sub-class Pie Chart */}
            <Card className="bg-gradient-to-br from-card to-muted/20 shadow-card border-border/50">
              <CardHeader>
                <CardTitle className="text-lg font-bold text-financial-primary">Public Equity Sub-classes</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Total: {formatCurrency(holdingsByClass["Public Equity"].value, viewCurrency)}
                </p>
              </CardHeader>
              <CardContent>
                <div className="md:flex md:items-center md:gap-6">
                  <div className="h-52 md:h-60 lg:h-64 md:flex-1">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={subClassPieData["Public Equity"] || []}
                          cx="50%"
                          cy="50%"
                          outerRadius={70}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {(subClassPieData["Public Equity"] || []).map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={SUB_CLASS_COLORS[index % SUB_CLASS_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => [formatCurrency(value, viewCurrency), "Value"]} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-4 md:mt-0 md:min-w-[220px] md:max-w-[280px]">
                    <CustomPieLegend items={subClassPieData["Public Equity"] || []} colors={SUB_CLASS_COLORS} showValue={false} />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Commodities & more Sub-class Pie Chart */}
            {holdingsByClass["Commodities & more"]?.value > 0 && (
              <Card className="bg-gradient-to-br from-card to-muted/20 shadow-card border-border/50">
                <CardHeader>
                  <CardTitle className="text-lg font-bold text-financial-primary">
                    Commodities & more Sub-classes
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Total: {formatCurrency(holdingsByClass["Commodities & more"].value, viewCurrency)}
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="md:flex md:items-center md:gap-6">
                    <div className="h-52 md:h-60 lg:h-64 md:flex-1">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={subClassPieData["Commodities & more"] || []}
                            cx="50%"
                            cy="50%"
                            outerRadius={70}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {(subClassPieData["Commodities & more"] || []).map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={SUB_CLASS_COLORS[index % SUB_CLASS_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value: number) => [formatCurrency(value, viewCurrency), "Value"]} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="mt-4 md:mt-0 md:min-w-[220px] md:max-w-[280px]">
                      <CustomPieLegend items={subClassPieData["Commodities & more"] || []} colors={SUB_CLASS_COLORS} showValue={false} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Big Tech Assets Pie Chart */}
            {(() => {
              const bigTechAssets = assets.filter(
                (asset) => asset.class === "Public Equity" && asset.sub_class === "Big Tech",
              );

              // Group Big Tech assets by name and sum their values
              const bigTechByName = bigTechAssets.reduce(
                (acc, asset) => {
                  const calc = calculations.get(asset.id);
                  const value = calc?.display_value || 0;
                  if (!acc[asset.name]) {
                    acc[asset.name] = 0;
                  }
                  acc[asset.name] += value;
                  return acc;
                },
                {} as Record<string, number>,
              );
              const bigTechTotal = Object.values(bigTechByName).reduce((sum, value) => sum + value, 0);
              const bigTechPieData = Object.entries(bigTechByName).map(([name, value]) => ({
                name: name,
                value: value,
                percentage: bigTechTotal > 0 ? (value / bigTechTotal) * 100 : 0,
              }));
              return bigTechAssets.length > 0 ? (
                <Card className="bg-gradient-to-br from-card to-muted/20 shadow-card border-border/50">
                  <CardHeader>
                    <CardTitle className="text-lg font-bold text-financial-primary">Big Tech Holdings</CardTitle>
                    <p className="text-sm text-muted-foreground">Total: {formatCurrency(bigTechTotal, viewCurrency)}</p>
                  </CardHeader>
                  <CardContent>
                    <div className="md:flex md:items-center md:gap-6">
                      <div className="h-52 md:h-60 lg:h-64 md:flex-1">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie data={bigTechPieData} cx="50%" cy="50%" outerRadius={70} fill="#8884d8" dataKey="value">
                              {bigTechPieData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={SUB_CLASS_COLORS[index % SUB_CLASS_COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip formatter={(value: number) => [formatCurrency(value, viewCurrency), "Value"]} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="mt-4 md:mt-0 md:min-w-[220px] md:max-w-[280px]">
                        <CustomPieLegend items={bigTechPieData} colors={SUB_CLASS_COLORS} showValue={false} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : null;
            })()}
          </div>
        </div>
      )}

      {/* Fixed Income Dedicated Section */}
      {fixedIncomeAssets.length > 0 && holdingsByClass["Fixed Income"]?.value > 0 && (
        <div className="space-y-4 pt-8 border-t border-financial-primary/20">
          {/* Added elegant top border */}
          <div className="flex items-center gap-4 mb-6">
            <div className="h-0.5 flex-1 bg-muted-foreground/20 rounded-full"></div>
            <h2 className="text-3xl font-bold text-muted-foreground">Fixed Income</h2>
            <div className="h-0.5 flex-1 bg-muted-foreground/20 rounded-full"></div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Fixed Income Sub-class Pie Chart */}
            <Card className="bg-gradient-to-br from-card to-muted/20 shadow-card border-border/50">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-bold text-financial-primary">Fixed Income Sub-classes</CardTitle>
                  <div className="flex items-center gap-2">
                    <label htmlFor="exclude-mm-deposits" className="text-xs text-muted-foreground cursor-pointer">
                      Exclude MM & Deposits
                    </label>
                    <Switch
                      id="exclude-mm-deposits"
                      checked={excludeMMAndDeposits}
                      onCheckedChange={setExcludeMMAndDeposits}
                    />
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  Total: {formatCurrency(fixedIncomePieTotal, viewCurrency)}
                </p>
              </CardHeader>
              <CardContent>
                <div className="md:flex md:items-center md:gap-6">
                  <div className="h-52 md:h-60 lg:h-64 md:flex-1">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={fixedIncomePieData} cx="50%" cy="50%" outerRadius={70} fill="#8884d8" dataKey="value">
                          {fixedIncomePieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={SUB_CLASS_COLORS[index % SUB_CLASS_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => [formatCurrency(value, viewCurrency), "Value"]} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-4 md:mt-0 md:min-w-[220px] md:max-w-[280px]">
                    <CustomPieLegend items={fixedIncomePieData} colors={SUB_CLASS_COLORS} showValue={false} />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Fixed Income YTW Summary */}
            <Card className="bg-gradient-to-br from-card to-muted/20 shadow-card border-border/50">
              <CardHeader className="py-3 px-4 md:py-4 md:px-6">
                <CardTitle className="text-lg font-bold text-financial-primary">Yield to Worst (YTW)</CardTitle>
              </CardHeader>
              <CardContent className="py-3 px-4 md:py-4 md:px-6">
                {/* Overall Fixed Income YTW - Side by Side */}
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1 min-h-[2.5rem]">All Fixed Income</p>
                    <p className="text-2xl font-bold text-financial-success">
                      {(fixedIncomeWeightedYTW * 100).toFixed(2)}%
                    </p>
                  </div>

                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1 min-h-[2.5rem]">Excl. MM and Deposits</p>
                    <p className="text-2xl font-bold text-financial-success">
                      {(fixedIncomeWeightedYTWExcludingCash * 100).toFixed(2)}%
                    </p>
                  </div>
                </div>

                {/* YTW by Sub-class */}
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-muted-foreground">YTW by Sub-class:</p>
                  {Object.entries(fixedIncomeSubClassAverageYTW).map(([subClass, ytw]) => (
                    <div key={subClass} className="flex justify-between items-center py-1.5 border-b border-border/30">
                      <Badge variant="outline" className="text-xs">
                        {subClass}
                      </Badge>
                      <span className="font-mono font-semibold text-financial-success">{(ytw * 100).toFixed(2)}%</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Real Estate Section */}
      {holdingsByClass["Real Estate"]?.value > 0 && (
        <div className="space-y-4 pt-8 border-t border-financial-primary/20">
          {/* Added elegant top border */}
          <div className="flex items-center gap-4 mb-6">
            <div className="h-0.5 flex-1 bg-muted-foreground/20 rounded-full"></div>
            <h2 className="text-3xl font-bold text-muted-foreground">Real Estate</h2>
            <div className="h-0.5 flex-1 bg-muted-foreground/20 rounded-full"></div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Real Estate Sub-class Pie Chart */}
            <Card className="bg-gradient-to-br from-card to-muted/20 shadow-card border-border/50">
              <CardHeader>
                <CardTitle className="text-lg font-bold text-financial-primary">Real Estate Sub-classes</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Total: {formatCurrency(holdingsByClass["Real Estate"].value, viewCurrency)}
                </p>
              </CardHeader>
              <CardContent>
                <div className="md:flex md:items-center md:gap-6">
                  <div className="h-52 md:h-60 lg:h-64 md:flex-1">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={subClassPieData["Real Estate"] || []}
                          cx="50%"
                          cy="50%"
                          outerRadius={70}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {(subClassPieData["Real Estate"] || []).map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={SUB_CLASS_COLORS[index % SUB_CLASS_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => [formatCurrency(value, viewCurrency), "Value"]} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-4 md:mt-0 md:min-w-[220px] md:max-w-[280px]">
                    <CustomPieLegend items={subClassPieData["Real Estate"] || []} colors={SUB_CLASS_COLORS} showValue={false} />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Real Estate Assets Bar Chart */}
            <Card className="bg-gradient-to-br from-card to-muted/20 shadow-card border-border/50">
              <CardHeader>
                <CardTitle className="text-lg font-bold text-financial-primary">All Real Estate Assets</CardTitle>
                <p className="text-sm text-muted-foreground">Grouped by asset name</p>
              </CardHeader>
              <CardContent className="py-3 px-4 md:py-6">
                <div className="h-64 p-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        data={(() => {
                          // Filter Real Estate assets
                          const realEstateAssets = assets.filter((asset) => asset.class === "Real Estate");

                          // Group by asset name and sum their values
                          const positionsByName = realEstateAssets.reduce(
                            (acc, asset) => {
                              const calc = calculations.get(asset.id);
                              const value = calc?.display_value || 0;
                              if (!acc[asset.name]) {
                                acc[asset.name] = {
                                  name: asset.name,
                                  value: 0,
                                };
                              }
                              acc[asset.name].value += value;
                              return acc;
                            },
                            {} as Record<
                              string,
                              {
                                name: string;
                                value: number;
                              }
                            >,
                          );

                          // Return sorted array by value
                          return Object.values(positionsByName).sort((a, b) => b.value - a.value);
                        })()}
                        margin={{
                          top: 10,
                          right: 5,
                          left: 0,
                          bottom: 60,
                        }}
                      >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="name"
                        angle={-45}
                        textAnchor="end"
                        height={60}
                        interval={0}
                        tick={{
                          fontSize: 12,
                        }}
                      />
                      <YAxis
                        tickFormatter={(value) => formatMillions(value)}
                        tick={{
                          fontSize: 12,
                        }}
                      />
                      <Tooltip
                        formatter={(value: number) => [formatCurrency(value, viewCurrency), "Value"]}
                        labelStyle={{
                          color: "hsl(var(--foreground))",
                        }}
                        contentStyle={{
                          backgroundColor: "hsl(var(--background))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                        }}
                      />
                      <Bar dataKey="value" fill="hsl(var(--chart-1))" />
                    </BarChart>
                   </ResponsiveContainer>
                 </div>
               </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Private Equity Section */}
      {holdingsByClass["Private Equity"]?.value > 0 && (
        <div className="space-y-4 pt-8 border-t border-financial-primary/20">
          {/* Added elegant top border */}
          <div className="flex items-center gap-4 mb-6">
            <div className="h-0.5 flex-1 bg-muted-foreground/20 rounded-full"></div>
            <h2 className="text-3xl font-bold text-muted-foreground">Private Equity</h2>
            <div className="h-0.5 flex-1 bg-muted-foreground/20 rounded-full"></div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Private Equity Sub-class Pie Chart */}
            <Card className="bg-gradient-to-br from-card to-muted/20 shadow-card border-border/50">
              <CardHeader>
                <CardTitle className="text-lg font-bold text-financial-primary">Private Equity Sub-classes</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Total: {formatCurrency(holdingsByClass["Private Equity"].value, viewCurrency)}
                </p>
              </CardHeader>
              <CardContent>
                <div className="md:flex md:items-center md:gap-6">
                  <div className="h-52 md:h-60 lg:h-64 md:flex-1">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={subClassPieData["Private Equity"] || []}
                          cx="50%"
                          cy="50%"
                          outerRadius={70}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {(subClassPieData["Private Equity"] || []).map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={SUB_CLASS_COLORS[index % SUB_CLASS_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => [formatCurrency(value, viewCurrency), "Value"]} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-4 md:mt-0 md:min-w-[220px] md:max-w-[280px]">
                    <CustomPieLegend items={subClassPieData["Private Equity"] || []} colors={SUB_CLASS_COLORS} showValue={false} />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Top 10 Private Equity Assets Bar Chart */}
            <Card className="bg-gradient-to-br from-card to-muted/20 shadow-card border-border/50">
              <CardHeader>
                <CardTitle className="text-lg font-bold text-financial-primary">
                  Top 10 Private Equity Positions
                </CardTitle>
                <p className="text-sm text-muted-foreground">Factored vs Full Price comparison</p>
              </CardHeader>
              <CardContent className="py-3 px-4 md:py-6">
                <div className="h-80 p-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        data={(() => {
                          // Get Private Equity assets
                          const privateEquityAssets = assets.filter((asset) => asset.class === "Private Equity");

                          // Group by asset name and sum their values
                          const positionsByName = privateEquityAssets.reduce(
                            (acc, asset) => {
                              const calc = calculations.get(asset.id);
                              const factored_value = calc?.display_value || 0;
                              const full_price =
                                asset.quantity *
                                (asset.price || 0) *
                                (fxRates[asset.origin_currency]?.[`to_${viewCurrency}`] || 1);
                              if (!acc[asset.name]) {
                                acc[asset.name] = {
                                  name: asset.name.length > 15 ? asset.name.substring(0, 15) + "..." : asset.name,
                                  fullName: asset.name,
                                  factored_value: 0,
                                  full_price: 0,
                                };
                              }
                              acc[asset.name].factored_value += factored_value;
                              acc[asset.name].full_price += full_price;
                              return acc;
                            },
                            {} as Record<
                              string,
                              {
                                name: string;
                                fullName: string;
                                factored_value: number;
                                full_price: number;
                              }
                            >,
                          );

                          // Get top 10 positions by factored value
                          return Object.values(positionsByName)
                            .sort((a, b) => b.factored_value - a.factored_value)
                            .slice(0, 10);
                        })()}
                        margin={{
                          top: 10,
                          right: 5,
                          left: 0,
                          bottom: 80,
                        }}
                      >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="name"
                        angle={-45}
                        textAnchor="end"
                        height={80}
                        interval={0}
                        tick={{
                          fontSize: 11,
                        }}
                      />
                      <YAxis
                        tickFormatter={(value) => formatMillions(value)}
                        tick={{
                          fontSize: 12,
                        }}
                      />
                      <Tooltip
                        formatter={(value: number, name: string) => [formatCurrency(value, viewCurrency), name]}
                        labelFormatter={(label) => {
                          const asset = (() => {
                            const privateEquityAssets = assets.filter((asset) => asset.class === "Private Equity");
                            const assetData = privateEquityAssets.map((asset) => ({
                              name: asset.name.length > 15 ? asset.name.substring(0, 15) + "..." : asset.name,
                              fullName: asset.name,
                            }));
                            return assetData.find((a) => a.name === label);
                          })();
                          return asset?.fullName || label;
                        }}
                        labelStyle={{
                          color: "hsl(var(--foreground))",
                        }}
                        contentStyle={{
                          backgroundColor: "hsl(var(--background))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                        }}
                      />
                      <Bar dataKey="full_price" fill="hsl(var(--chart-3))" name="Full Potential" />
                      <Bar dataKey="factored_value" fill="hsl(var(--chart-2))" name="Factored Value" />
                    </BarChart>
                  </ResponsiveContainer>
                  </div>
                </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* General Asset Class Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Object.entries(holdingsByClass).map(([assetClass, classData]) => {
          const subClasses = subClassBreakdown[assetClass] || {};
          const subClassEntries = Object.entries(subClasses);

          // Skip dedicated sections: Public Equity, Commodities & more, Fixed Income, Real Estate, Private Equity, and Cash
          if (
            ["Public Equity", "Commodities & more", "Fixed Income", "Real Estate", "Private Equity", "Cash"].includes(
              assetClass,
            )
          )
            return null;

          // Show chart for any asset class that has assets
          if (classData.value === 0) return null;
          const pieData = subClassEntries.map(([subClass, value]) => ({
            name: subClass,
            value: value,
            percentage: classData.value > 0 ? (value / classData.value) * 100 : 0,
          }));
          return (
            <Card key={assetClass} className="bg-gradient-to-br from-card to-muted/20 shadow-card border-border/50">
              <CardHeader>
                <CardTitle className="text-lg font-bold text-financial-primary">{assetClass}</CardTitle>
                <p className="text-sm text-muted-foreground">Total: {formatCurrency(classData.value, viewCurrency)}</p>
              </CardHeader>
              <CardContent>
                <div className="md:flex md:items-center md:gap-6">
                  <div className="h-52 md:h-60 lg:h-64 md:flex-1">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={pieData} cx="50%" cy="50%" outerRadius={70} fill="#8884d8" dataKey="value">
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={SUB_CLASS_COLORS[index % SUB_CLASS_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => [formatCurrency(value, viewCurrency), "Value"]} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-4 md:mt-0 md:min-w-[220px] md:max-w-[280px]">
                    <CustomPieLegend items={pieData} colors={SUB_CLASS_COLORS} showValue={false} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

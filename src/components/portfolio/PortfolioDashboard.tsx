import { useState, useMemo } from 'react';
import { Asset, ViewCurrency, FXRates, FilterCriteria, AssetClass } from '@/types/portfolio';
import { DEFAULT_FX_RATES, calculateAssetValue } from '@/lib/portfolio-utils';
import { PortfolioHeader } from './PortfolioHeader';
import { AssetTable } from './AssetTable';
import { AssetForm } from './AssetForm';
import { PortfolioSummary } from './PortfolioSummary';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';

interface PortfolioDashboardProps {
  initialAssets?: Asset[];
}

export function PortfolioDashboard({ initialAssets = [] }: PortfolioDashboardProps) {
  const [assets, setAssets] = useState<Asset[]>(initialAssets);
  const [viewCurrency, setViewCurrency] = useState<ViewCurrency>('USD');
  const [fxRates, setFxRates] = useState<FXRates>(DEFAULT_FX_RATES);
  const [filters, setFilters] = useState<FilterCriteria>({});
  const [isAssetFormOpen, setIsAssetFormOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | undefined>();
  
  const { toast } = useToast();

  // Calculate aggregated data
  const { totalValue, assetCount, classTotals } = useMemo(() => {
    const calculations = assets.map(asset => ({
      asset,
      calculation: calculateAssetValue(asset, fxRates, viewCurrency),
    }));

    const total = calculations.reduce((sum, { calculation }) => sum + calculation.display_value, 0);
    const count = assets.length;

    const classData = calculations.reduce((acc, { asset, calculation }) => {
      if (!acc[asset.class]) {
        acc[asset.class] = { value: 0, count: 0 };
      }
      acc[asset.class].value += calculation.display_value;
      acc[asset.class].count++;
      return acc;
    }, {} as Record<AssetClass, { value: number; count: number }>);

    const classArray = Object.entries(classData).map(([className, data]) => ({
      class: className as AssetClass,
      value: data.value,
      count: data.count,
    }));

    return {
      totalValue: total,
      assetCount: count,
      classTotals: classArray,
    };
  }, [assets, fxRates, viewCurrency]);

  const handleSaveAsset = (asset: Asset) => {
    if (editingAsset) {
      setAssets(prev => prev.map(a => a.id === asset.id ? asset : a));
      toast({
        title: "Asset Updated",
        description: `${asset.name} has been successfully updated.`,
      });
    } else {
      setAssets(prev => [...prev, asset]);
      toast({
        title: "Asset Added",
        description: `${asset.name} has been successfully added to your portfolio.`,
      });
    }
    setEditingAsset(undefined);
  };

  const handleEditAsset = (asset: Asset) => {
    setEditingAsset(asset);
    setIsAssetFormOpen(true);
  };

  const handleAddAsset = () => {
    setEditingAsset(undefined);
    setIsAssetFormOpen(true);
  };

  const handleManageFX = () => {
    toast({
      title: "FX Management",
      description: "FX rate management feature coming soon!",
    });
  };

  const handleAddFilter = () => {
    toast({
      title: "Advanced Filters",
      description: "Advanced filtering feature coming soon!",
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30">
      <div className="container mx-auto p-6 space-y-8">
        <PortfolioHeader
          viewCurrency={viewCurrency}
          onViewCurrencyChange={setViewCurrency}
          totalValue={totalValue}
          assetCount={assetCount}
          classTotals={classTotals}
          onAddAsset={handleAddAsset}
          onManageFX={handleManageFX}
          onAddFilter={handleAddFilter}
        />

        <Tabs defaultValue="assets" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-3 max-w-md bg-muted/50 p-1">
            <TabsTrigger 
              value="assets" 
              className="data-[state=active]:bg-financial-primary data-[state=active]:text-white font-semibold"
            >
              Assets
            </TabsTrigger>
            <TabsTrigger 
              value="summary" 
              className="data-[state=active]:bg-financial-primary data-[state=active]:text-white font-semibold"
            >
              Summary
            </TabsTrigger>
            <TabsTrigger 
              value="charts" 
              className="data-[state=active]:bg-financial-primary data-[state=active]:text-white font-semibold hidden lg:block"
            >
              Analytics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="assets" className="space-y-6">
            <AssetTable
              assets={assets}
              viewCurrency={viewCurrency}
              fxRates={fxRates}
              filters={filters}
              onEditAsset={handleEditAsset}
              onAddAsset={handleAddAsset}
            />
          </TabsContent>

          <TabsContent value="summary" className="space-y-6">
            <PortfolioSummary
              assets={assets}
              viewCurrency={viewCurrency}
              fxRates={fxRates}
            />
          </TabsContent>

          <TabsContent value="charts" className="space-y-6">
            <div className="grid gap-6">
              <div className="text-center py-12">
                <h3 className="text-2xl font-bold text-financial-primary mb-4">Advanced Analytics</h3>
                <p className="text-muted-foreground">
                  Advanced charting and analytics features coming soon.
                </p>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <AssetForm
          asset={editingAsset}
          isOpen={isAssetFormOpen}
          onClose={() => setIsAssetFormOpen(false)}
          onSave={handleSaveAsset}
        />
      </div>
    </div>
  );
}
import { useState, useMemo } from 'react';
import { Asset, ViewCurrency, FXRates, FilterCriteria, AssetClass } from '@/types/portfolio';
import { DEFAULT_FX_RATES, calculateAssetValue } from '@/lib/portfolio-utils';
import { useAssets } from '@/hooks/useAssets';
import { PortfolioHeader } from './PortfolioHeader';
import { AssetTable } from './AssetTable';
import { AssetForm } from './AssetForm';
import { PortfolioSummary } from './PortfolioSummary';
import { SavePortfolioDialog } from './SavePortfolioDialog';
import { PortfolioHistory } from './PortfolioHistory';
import { usePortfolioSnapshots } from '@/hooks/usePortfolioSnapshots';
import { PortfolioFilters } from './PortfolioFilters';
import { PortfolioGrouping, GroupByField } from './PortfolioGrouping';
import { FXRatesBar } from './FXRatesBar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';

interface PortfolioDashboardProps {
  initialAssets?: Asset[];
}

export function PortfolioDashboard({ initialAssets = [] }: PortfolioDashboardProps) {
  const { assets, isLoading, addAsset, updateAsset, deleteAsset } = useAssets();
  const [viewCurrency, setViewCurrency] = useState<ViewCurrency>('USD');
  const [fxRates, setFxRates] = useState<FXRates>(DEFAULT_FX_RATES);
  const [filters, setFilters] = useState<FilterCriteria>({});
  const [groupByFields, setGroupByFields] = useState<GroupByField[]>([]);
  const [isAssetFormOpen, setIsAssetFormOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | undefined>();
  
  const { toast } = useToast();
  const { saveSnapshot, isLoading: isSaving } = usePortfolioSnapshots();

  // Filter assets based on current filters
  const filteredAssets = useMemo(() => {
    return assets.filter(asset => {
      if (filters.class && !filters.class.includes(asset.class)) return false;
      if (filters.sub_class && !filters.sub_class.includes(asset.sub_class)) return false;
      if (filters.account_entity && !filters.account_entity.includes(asset.account_entity)) return false;
      if (filters.account_bank && !filters.account_bank.includes(asset.account_bank)) return false;
      if (filters.origin_currency && !filters.origin_currency.includes(asset.origin_currency)) return false;
      
      if (filters.maturity_date_from && asset.maturity_date) {
        if (asset.maturity_date < filters.maturity_date_from) return false;
      }
      if (filters.maturity_date_to && asset.maturity_date) {
        if (asset.maturity_date > filters.maturity_date_to) return false;
      }
      
      return true;
    });
  }, [assets, filters]);

  // Calculate aggregated data based on filtered assets
  const { totalValue, assetCount, classTotals } = useMemo(() => {
    const calculations = filteredAssets.map(asset => ({
      asset,
      calculation: calculateAssetValue(asset, fxRates, viewCurrency),
    }));

    const total = calculations.reduce((sum, { calculation }) => sum + calculation.display_value, 0);
    const count = filteredAssets.length;

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
  }, [filteredAssets, fxRates, viewCurrency]);

  const handleSaveAsset = async (asset: Asset) => {
    try {
      if (editingAsset) {
        await updateAsset(asset);
      } else {
        await addAsset(asset);
      }
      setEditingAsset(undefined);
      setIsAssetFormOpen(false);
    } catch (error) {
      // Error handling is done in the hook
    }
  };

  const handleEditAsset = (asset: Asset) => {
    setEditingAsset(asset);
    setIsAssetFormOpen(true);
  };

  const handleAddAsset = () => {
    setEditingAsset(undefined);
    setIsAssetFormOpen(true);
  };

  const handleDeleteAsset = async (asset: Asset) => {
    try {
      await deleteAsset(asset);
    } catch (error) {
      // Error handling is done in the hook
    }
  };

  const handleManageFX = () => {
    toast({
      title: "FX Management",
      description: "FX rate management feature coming soon!",
    });
  };

  const handleFiltersChange = (newFilters: FilterCriteria) => {
    setFilters(newFilters);
  };

  const handleSavePortfolio = async (name: string, description: string) => {
    await saveSnapshot(name, description, assets, fxRates);
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
          onManageFX={handleManageFX}
        />

        <FXRatesBar 
          fxRates={fxRates}
          onRatesChange={setFxRates}
        />

        <Tabs defaultValue="assets" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 max-w-md bg-muted/50 p-1">
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
              value="history" 
              className="data-[state=active]:bg-financial-primary data-[state=active]:text-white font-semibold"
            >
              History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="assets" className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <PortfolioFilters
                  filters={filters}
                  onFiltersChange={handleFiltersChange}
                />
                <PortfolioGrouping
                  groupByFields={groupByFields}
                  onGroupByChange={setGroupByFields}
                />
              </div>
              <div className="flex items-center gap-2">
                <SavePortfolioDialog
                  assets={assets}
                  fxRates={fxRates}
                  viewCurrency={viewCurrency}
                  onSave={handleSavePortfolio}
                />
              </div>
            </div>
            <AssetTable
              assets={assets}
              viewCurrency={viewCurrency}
              fxRates={fxRates}
              filters={filters}
              groupByFields={groupByFields}
              onEditAsset={handleEditAsset}
              onDeleteAsset={handleDeleteAsset}
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

          <TabsContent value="history" className="space-y-6">
            <PortfolioHistory />
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
import { useState, useMemo } from 'react';
import { Asset, ViewCurrency, FXRates, FilterCriteria, AssetClass } from '@/types/portfolio';
import { calculateAssetValue, filterAssetsByFilters } from '@/lib/portfolio-utils';
import { useAuth } from '@/contexts/AuthContext';
import { verifySession } from '@/lib/session-utils';

import { useAssets } from '@/hooks/useAssets';
import { useFXRates } from '@/hooks/useFXRates';
import { PortfolioHeader } from './PortfolioHeader';
import { AssetTable } from './AssetTable';
import { AssetForm } from './AssetForm';
import { PortfolioSummary } from './PortfolioSummary';
import { SavePortfolioDialog } from './SavePortfolioDialog';
import { PortfolioHistory } from './PortfolioHistory';
import { usePortfolioSnapshots } from '@/hooks/usePortfolioSnapshots';
import { PortfolioFilters } from './PortfolioFilters';
import { PortfolioGrouping, GroupByField } from './PortfolioGrouping';
import { PortfolioPredictions } from './PortfolioPredictions';
import { FXRatesBar } from './FXRatesBar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';

export function PortfolioDashboard() {
  const { assets, isLoading, addAsset, updateAsset, deleteAsset, getAssetNameCount } = useAssets();
  const [viewCurrency, setViewCurrency] = useState<ViewCurrency>('USD');
  const [activeTab, setActiveTab] = useState<string>('assets');
  const { logout } = useAuth();
  
  const {
    fxRates,
    lastUpdated,
    isLoading: fxLoading,
    updateManualRate,
  } = useFXRates();
  const [filters, setFilters] = useState<FilterCriteria>({});
  const [groupByFields, setGroupByFields] = useState<GroupByField[]>([]);
  const [groupSortBy, setGroupSortBy] = useState<'value' | 'alphabetical'>('value');
  const [isAssetFormOpen, setIsAssetFormOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | undefined>();
  const [assetFormMode, setAssetFormMode] = useState<'NEW' | 'EXISTING_HOLDING' | 'DUPLICATE' | 'EDIT'>('NEW');
  
  const { toast } = useToast();
  const { saveSnapshot, isLoading: isSaving } = usePortfolioSnapshots();
  
  console.log('saveSnapshot function:', saveSnapshot); // Debug log

  // Filter assets based on current filters
  const filteredAssets = useMemo(() => {
    return filterAssetsByFilters(assets, filters);
  }, [assets, filters]);

  // Calculate aggregated data for unfiltered portfolio (for header)
  const { totalPortfolioValue, totalAssetCount, totalClassTotals } = useMemo(() => {
    // Skip calculations if FX rates haven't loaded yet
    if (Object.keys(fxRates).length === 0) {
      return {
        totalPortfolioValue: 0,
        totalAssetCount: assets.length,
        totalClassTotals: [],
      };
    }
    
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
      totalPortfolioValue: total,
      totalAssetCount: count,
      totalClassTotals: classArray,
    };
  }, [assets, fxRates, viewCurrency]);

  // Calculate aggregated data based on filtered assets (for table and other components)
  const { totalValue, assetCount, classTotals } = useMemo(() => {
    // Skip calculations if FX rates haven't loaded yet
    if (Object.keys(fxRates).length === 0) {
      return {
        totalValue: 0,
        assetCount: filteredAssets.length,
        classTotals: [],
      };
    }
    
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
      // Check if this is an existing asset by seeing if the ID exists in our current assets
      const existingAsset = assets.find(a => a.id === asset.id);
      
      if (existingAsset) {
        // Update existing asset
        await updateAsset(asset);
      } else {
        // Add new asset (this handles duplicates and truly new assets)
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
    setAssetFormMode('EDIT');
    setIsAssetFormOpen(true);
  };

  const handleAddAsset = () => {
    setEditingAsset(undefined);
    setAssetFormMode('NEW');
    setIsAssetFormOpen(true);
  };

  const handleDuplicateAsset = (asset: Asset) => {
    setEditingAsset(asset);
    setAssetFormMode('DUPLICATE');
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
    console.log('handleSavePortfolio called with:', { name, description, saveSnapshot }); // Debug log
    await saveSnapshot(name, description, assets, fxRates);
  };

  const handleTabChange = async (value: string) => {
    // Check session validity before switching to predictions or history tabs
    if (value === 'predictions' || value === 'history') {
      const sessionValid = await verifySession();
      if (!sessionValid) {
        logout();
        return;
      }
    }
    setActiveTab(value);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30">
      <div className="container mx-auto p-6 space-y-8">
        <PortfolioHeader
          viewCurrency={viewCurrency}
          onViewCurrencyChange={setViewCurrency}
          totalValue={totalPortfolioValue}
          assetCount={totalAssetCount}
          classTotals={totalClassTotals}
          onManageFX={handleManageFX}
        />

          <FXRatesBar 
            fxRates={fxRates}
            lastUpdated={lastUpdated}
            onRatesChange={() => {}} // Legacy prop, not used anymore
            onManualRateChange={updateManualRate}
          />

        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 max-w-lg bg-muted/50 p-1">
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
              value="predictions" 
              className="data-[state=active]:bg-financial-primary data-[state=active]:text-white font-semibold"
            >
              Predictions
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
                  groupSortBy={groupSortBy}
                  onGroupSortChange={setGroupSortBy}
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
              groupSortBy={groupSortBy}
              onEditAsset={handleEditAsset}
              onDeleteAsset={handleDeleteAsset}
              onDuplicateAsset={handleDuplicateAsset}
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

          <TabsContent value="predictions" className="space-y-6">
            <PortfolioPredictions
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
        getAssetNameCount={getAssetNameCount}
        mode={assetFormMode}
        existingAssets={assets}
      />
      </div>
    </div>
  );
}
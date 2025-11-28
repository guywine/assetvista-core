import { useState, useEffect, useMemo } from 'react';
import { Asset, AssetClass, AccountEntity, Currency } from '@/types/portfolio';
import { validateAsset, generateId, getSubClassOptions, getBankOptions, calculatePEPrice } from '@/lib/portfolio-utils';
import { ASSET_CLASSES, ACCOUNT_ENTITIES, CURRENCIES } from '@/constants/portfolio';
import { getBeneficiaryFromEntity } from '@/lib/beneficiary-utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';
import { useAssetLookup } from '@/hooks/useAssetLookup';
import { validateNumericInput } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

type FormMode = 'NEW' | 'EXISTING_HOLDING' | 'DUPLICATE' | 'EDIT';

interface AssetFormProps {
  asset?: Asset;
  isOpen: boolean;
  onClose: () => void;
  onSave: (asset: Asset) => void;
  getAssetNameCount?: (name: string) => number;
  mode?: FormMode;
  existingAssets?: Asset[];
}

export function AssetForm({ 
  asset, 
  isOpen, 
  onClose, 
  onSave, 
  getAssetNameCount, 
  mode = 'NEW',
  existingAssets = []
}: AssetFormProps) {
  const [formData, setFormData] = useState<Partial<Asset>>({
    name: '',
    class: 'Public Equity',
    sub_class: 'Big Tech',
    ISIN: '',
    account_entity: 'Roy',
    account_bank: 'Poalim',
    beneficiary: 'Kids',
    origin_currency: 'USD',
    quantity: 0,
    price: 1,
    factor: 1.0,
    maturity_date: '',
    ytw: 0,
    pe_company_value: undefined,
    pe_holding_percentage: undefined,
  });
  
  // String states for numeric inputs to preserve decimal point during typing
  const [quantityStr, setQuantityStr] = useState<string>('0');
  const [priceStr, setPriceStr] = useState<string>('1');
  const [factorStr, setFactorStr] = useState<string>('1.0');
  const [peCompanyValueStr, setPeCompanyValueStr] = useState<string>('');
  const [peHoldingPercentageStr, setPeHoldingPercentageStr] = useState<string>('');
  const [ytwStr, setYtwStr] = useState<string>('0');
  
  const [usePECalculation, setUsePECalculation] = useState(false);
  
  const [errors, setErrors] = useState<string[]>([]);
  const [currentMode, setCurrentMode] = useState<FormMode>(mode);
  const [selectedExistingAsset, setSelectedExistingAsset] = useState<Asset | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  const { findAssetsByName, getUniqueAssetNames, findSimilarAssetNames, findPotentialDuplicates } = useAssetLookup(existingAssets);
  const { toast } = useToast();

  // Cash assets have auto-generated immutable names - define early since used in useMemo
  const isCashAsset = formData.class === 'Cash';

  const suggestedAssets = useMemo(() => {
    if (!formData.name?.trim() || currentMode !== 'NEW' || isCashAsset) return [];
    return findSimilarAssetNames(formData.name.trim()).slice(0, 5);
  }, [formData.name, currentMode, isCashAsset, findSimilarAssetNames]);

  useEffect(() => {
    setCurrentMode(mode);
    if (asset) {
      setFormData(asset);
      // Sync string states with asset values
      setQuantityStr(asset.quantity?.toString() || '0');
      setPriceStr(asset.price?.toString() || '1');
      setFactorStr(asset.factor?.toString() || '1.0');
      setPeCompanyValueStr(asset.pe_company_value?.toString() || '');
      setPeHoldingPercentageStr(asset.pe_holding_percentage?.toString() || '');
      setYtwStr(asset.ytw !== undefined ? (asset.ytw * 100).toFixed(2) : '0');
      
      // Set PE calculation mode based on existing data
      setUsePECalculation(asset.class === 'Private Equity' && asset.pe_company_value !== undefined && asset.pe_holding_percentage !== undefined);
      if (mode === 'DUPLICATE') {
        // For duplicate mode, clear account-specific fields
        setFormData(prev => ({
          ...asset,
          id: undefined,
          account_entity: 'Roy' as any,
          account_bank: 'Poalim' as any,
          beneficiary: 'Kids' as any,
          quantity: 0
        }));
        setQuantityStr('0');
      }
    } else {
      setFormData({
        name: '',
        class: 'Public Equity',
        sub_class: 'Big Tech',
        ISIN: '',
        account_entity: 'Roy',
        account_bank: 'Poalim',
        beneficiary: 'Kids',
        origin_currency: 'USD',
        quantity: 0,
        price: 1,
        factor: 1.0,
        maturity_date: '',
        ytw: 0,
        pe_company_value: undefined,
        pe_holding_percentage: undefined,
      });
      setQuantityStr('0');
      setPriceStr('1');
      setFactorStr('1.0');
      setPeCompanyValueStr('');
      setPeHoldingPercentageStr('');
      setYtwStr('0');
      setUsePECalculation(false);
    }
    setErrors([]);
    setSelectedExistingAsset(null);
  }, [asset, isOpen, mode]);

  const handleNameChange = (name: string) => {
    setFormData(prev => ({ ...prev, name }));
    setShowSuggestions(true);
  };

  const handleSelectExistingAsset = (assetName: string) => {
    const existingAssets = findAssetsByName(assetName);
    if (existingAssets.length > 0) {
      setCurrentMode('EXISTING_HOLDING');
      setSelectedExistingAsset(existingAssets[0]);
      populateFromExistingAsset(existingAssets[0]);
    }
    setShowSuggestions(false);
  };

  const populateFromExistingAsset = (existingAsset: Asset) => {
    setFormData(prev => ({
      ...prev,
      // Shared properties
      name: existingAsset.name,
      class: existingAsset.class,
      sub_class: existingAsset.sub_class,
      ISIN: existingAsset.ISIN,
      origin_currency: existingAsset.origin_currency,
      price: existingAsset.price,
      factor: existingAsset.factor,
      maturity_date: existingAsset.maturity_date,
      ytw: existingAsset.ytw,
      pe_company_value: existingAsset.pe_company_value,
      pe_holding_percentage: existingAsset.pe_holding_percentage,
      // Keep existing account-specific fields or clear them
      account_entity: currentMode === 'DUPLICATE' ? prev.account_entity || 'Roy' : 'Roy',
      account_bank: currentMode === 'DUPLICATE' ? prev.account_bank || 'Poalim' : 'Poalim',
      beneficiary: currentMode === 'DUPLICATE' ? getBeneficiaryFromEntity(prev.account_entity || 'Roy') : 'Kids',
      quantity: currentMode === 'DUPLICATE' ? prev.quantity || 0 : 0
    }));
    
    // Sync string states with the existing asset values
    setPriceStr(existingAsset.price?.toString() || '1');
    setFactorStr(existingAsset.factor?.toString() || '1.0');
    setPeCompanyValueStr(existingAsset.pe_company_value?.toString() || '');
    setPeHoldingPercentageStr(existingAsset.pe_holding_percentage?.toString() || '');
    setYtwStr(existingAsset.ytw !== undefined ? (existingAsset.ytw * 100).toFixed(2) : '0');
    // Note: quantityStr remains at '0' for new holdings
    
    // Set PE calculation mode based on existing data
    setUsePECalculation(existingAsset.class === 'Private Equity' && 
                       existingAsset.pe_company_value !== undefined && 
                       existingAsset.pe_holding_percentage !== undefined);
  };

  // Calculate price for PE assets if using calculation mode
  const getPECalculatedPrice = () => {
    if (formData.class === 'Private Equity' && usePECalculation && 
        formData.pe_company_value && formData.pe_holding_percentage && formData.quantity) {
      return calculatePEPrice(formData.pe_company_value, formData.pe_holding_percentage, formData.quantity);
    }
    return formData.price || 0;
  };

  // Auto-update price when PE calculation values change
  useEffect(() => {
    if (formData.class === 'Private Equity' && usePECalculation && 
        formData.pe_company_value && formData.pe_holding_percentage && formData.quantity) {
      const calculatedPrice = calculatePEPrice(formData.pe_company_value, formData.pe_holding_percentage, formData.quantity);
      setFormData(prev => ({ ...prev, price: calculatedPrice }));
      setPriceStr(calculatedPrice.toString());
    }
  }, [formData.pe_company_value, formData.pe_holding_percentage, formData.quantity, usePECalculation, formData.class]);

  const handleSave = () => {
    // Parse string values to numbers
    const quantity = parseFloat(quantityStr) || 0;
    const price = parseFloat(priceStr) || 0;
    const factor = parseFloat(factorStr) || 1.0;
    const peCompanyValue = peCompanyValueStr ? parseFloat(peCompanyValueStr) : undefined;
    const peHoldingPercentage = peHoldingPercentageStr ? parseFloat(peHoldingPercentageStr) : undefined;
    
    // For cash assets, name is optional - if not provided, use currency as name
    const assetName = formData.name?.trim() || (formData.class === 'Cash' ? `${formData.sub_class} Cash` : '');
    
    // Check for near-duplicate names when creating NEW asset
    if (currentMode === 'NEW' && !isCashAsset && assetName) {
      const exactMatch = findAssetsByName(assetName);
      if (exactMatch.length > 0) {
        toast({
          title: "Asset already exists",
          description: `An asset named "${assetName}" already exists. Use the suggestions to add to existing holding, or choose a different name.`,
          variant: "destructive"
        });
        return;
      }
      
      const nearDuplicates = findPotentialDuplicates(assetName);
      if (nearDuplicates.length > 0) {
        toast({
          title: "Similar asset name exists",
          description: `A similar asset "${nearDuplicates[0]}" already exists. Please use consistent naming.`,
          variant: "destructive"
        });
        return;
      }
    }
    
    const calculatedPrice = formData.class === 'Private Equity' && usePECalculation && 
        peCompanyValue && peHoldingPercentage && quantity 
        ? calculatePEPrice(peCompanyValue, peHoldingPercentage, quantity) 
        : price;
    
    const assetData: Asset = {
      id: formData.id || crypto.randomUUID(),
      name: assetName,
      class: formData.class || "Public Equity",
      sub_class: formData.sub_class || "other",
      quantity,
      price: calculatedPrice,
      factor,
      account_entity: formData.account_entity || "Roy",
      account_bank: formData.account_bank || "Poalim",
      beneficiary: getBeneficiaryFromEntity(formData.account_entity || "Roy"),
      origin_currency: formData.origin_currency || "USD",
      ISIN: formData.ISIN,
      maturity_date: formData.maturity_date,
      ytw: parseFloat(ytwStr) / 100 || 0,
      pe_company_value: usePECalculation ? peCompanyValue : undefined,
      pe_holding_percentage: usePECalculation ? peHoldingPercentage : undefined,
      created_at: asset?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const validationErrors = validateAsset(assetData);
    
    // Additional validation for duplicate holdings
    if ((currentMode === 'EXISTING_HOLDING' || currentMode === 'DUPLICATE') && existingAssets) {
      const duplicateInSameAccount = existingAssets.find(a => 
        a.name === assetData.name && 
        a.account_entity === assetData.account_entity && 
        a.account_bank === assetData.account_bank &&
        a.id !== assetData.id
      );
      
      if (duplicateInSameAccount) {
        validationErrors.push('Asset already exists in this account. Consider updating the existing holding instead.');
      }
    }

    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    setErrors([]);
    onSave(assetData);
    onClose();
  };

  const handleClassChange = (newClass: AssetClass) => {
    const subClassOptions = getSubClassOptions(newClass);
    const defaultSubClass = subClassOptions[subClassOptions.length - 1];
    const defaultQuantity = (newClass === 'Private Equity' || newClass === 'Real Estate') ? 1 : (formData.quantity || 0);
    const defaultPrice = newClass === 'Cash' ? 1 : (formData.price || 0);
    
    setFormData(prev => {
      // Auto-generate name for Cash assets, clear when switching FROM Cash to non-Cash
      const autoName = newClass === 'Cash' 
        ? `${defaultSubClass} Cash` 
        : (prev.class === 'Cash' ? '' : prev.name);
      
      return {
        ...prev,
        name: autoName,
        class: newClass,
        sub_class: defaultSubClass as any,
        quantity: defaultQuantity,
        price: defaultPrice,
        origin_currency: newClass === 'Cash' ? defaultSubClass as Currency : prev.origin_currency,
      };
    });
  };

  const handleEntityChange = (newEntity: AccountEntity) => {
    const bankOptions = getBankOptions(newEntity);
    setFormData(prev => ({
      ...prev,
      account_entity: newEntity,
      account_bank: bankOptions[0] as any,
      beneficiary: getBeneficiaryFromEntity(newEntity),
    }));
  };

  const isEditingSharedAsset = asset && getAssetNameCount && getAssetNameCount(asset.name) > 1;
  const isSharedFieldsLocked = currentMode === 'EXISTING_HOLDING' || currentMode === 'DUPLICATE';
  
  // For Private Equity and Real Estate assets, price is account-specific
  const isPriceFieldLocked = isSharedFieldsLocked && formData.class !== 'Private Equity' && formData.class !== 'Real Estate';
  const isPEHoldingPercentageLocked = isSharedFieldsLocked && formData.class !== 'Private Equity';
  const existingAssetNames = getUniqueAssetNames();
  const isNameFieldLocked = isSharedFieldsLocked || isCashAsset || currentMode === 'EDIT';
  
  const getFormTitle = () => {
    switch (currentMode) {
      case 'DUPLICATE': return 'Duplicate Asset Holding';
      case 'EXISTING_HOLDING': return 'Add Holding of Existing Asset';
      case 'EDIT': return 'Edit Asset';
      default: return 'Add New Asset';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-financial-primary text-xl font-bold">
            {getFormTitle()}
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-6 py-4">

          {/* Mode selector for new assets */}
          {!asset && (currentMode === 'NEW' || currentMode === 'EXISTING_HOLDING') && (
            <div className="flex gap-2 mb-4">
              <Button
                type="button"
                variant={currentMode === 'NEW' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCurrentMode('NEW')}
              >
                New Asset
              </Button>
              <Button
                type="button"
                variant={currentMode === 'EXISTING_HOLDING' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCurrentMode('EXISTING_HOLDING')}
              >
                Add Holding
              </Button>
            </div>
          )}

          {/* Existing asset selector */}
          {currentMode === 'EXISTING_HOLDING' && !selectedExistingAsset && (
            <div className="mb-4">
              <Label htmlFor="existing-asset">Select Existing Asset</Label>
              <Select onValueChange={(value) => {
                const existing = existingAssets.find(a => a.name === value);
                if (existing) {
                  setSelectedExistingAsset(existing);
                  populateFromExistingAsset(existing);
                }
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose an existing asset..." />
                </SelectTrigger>
                <SelectContent>
                  {existingAssetNames.map((name) => (
                    <SelectItem key={name} value={name}>{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Warnings and info */}
          {isEditingSharedAsset && (
            <Alert className="mb-4">
              <AlertDescription>
                ⚠️ Warning: This asset exists in {getAssetNameCount!(asset!.name)} accounts. 
                Changes to shared properties (price, class, etc.) will affect all holdings.
              </AlertDescription>
            </Alert>
          )}

          {(currentMode === 'EXISTING_HOLDING' || currentMode === 'DUPLICATE') && (
            <Alert className="mb-4">
              <AlertDescription>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">Shared Properties Locked</Badge>
                  {currentMode === 'DUPLICATE' ? 
                    'Creating duplicate holding with same asset details.' : 
                    'Adding new holding of existing asset.'}
                </div>
              </AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2 relative">
              <Label htmlFor="name" className="font-semibold">
                Asset Name {formData.class !== 'Cash' && '*'}
                {isCashAsset && <Badge variant="outline" className="ml-1">Auto</Badge>}
              </Label>
              <Input
                id="name"
                value={formData.name || (isCashAsset ? `${formData.sub_class} Cash` : "")}
                onChange={(e) => handleNameChange(e.target.value)}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                placeholder={formData.class === 'Cash' ? 'Auto-generated from currency' : 'Enter asset name'}
                className="border-border/50 focus:border-financial-primary"
                disabled={isNameFieldLocked}
                autoComplete="off"
              />
              
              {/* Custom suggestions dropdown */}
              {showSuggestions && suggestedAssets.length > 0 && currentMode === 'NEW' && !isCashAsset && (
                <div className="absolute z-50 w-full mt-1 bg-background border border-border rounded-md shadow-lg max-h-48 overflow-auto">
                  <div className="p-2 text-xs text-muted-foreground border-b border-border">
                    Click to use existing asset:
                  </div>
                  {suggestedAssets.map(name => (
                    <button
                      key={name}
                      type="button"
                      className="w-full px-3 py-2 text-left hover:bg-muted text-sm transition-colors"
                      onMouseDown={() => handleSelectExistingAsset(name)}
                    >
                      {name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="isin" className="font-semibold">ISIN {isSharedFieldsLocked && <Badge variant="outline" className="ml-1">Shared</Badge>}</Label>
              <Input
                id="isin"
                value={formData.ISIN || ""}
                onChange={(e) => setFormData(prev => ({ ...prev, ISIN: e.target.value }))}
                placeholder="Optional ISIN code"
                className="border-border/50 focus:border-financial-primary"
                disabled={isSharedFieldsLocked}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="class" className="font-semibold">Asset Class *</Label>
              <Select value={formData.class} onValueChange={handleClassChange} disabled={isSharedFieldsLocked || currentMode === 'EDIT'}>
                <SelectTrigger className="border-border/50 focus:border-financial-primary">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ASSET_CLASSES.map(assetClass => (
                    <SelectItem key={assetClass} value={assetClass}>{assetClass}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sub_class" className="font-semibold">Sub Class</Label>
              <Select 
                value={formData.sub_class} 
                onValueChange={(value) => {
                  setFormData(prev => ({ 
                    ...prev, 
                    sub_class: value as any,
                    // For Cash assets, always sync currency with sub-class
                    origin_currency: prev.class === 'Cash' ? value as Currency : prev.origin_currency,
                    // Auto-update name for Cash assets when currency changes
                    name: prev.class === 'Cash' ? `${value} Cash` : prev.name
                  }));
                }}
                disabled={isSharedFieldsLocked}
              >
                <SelectTrigger className="border-border/50 focus:border-financial-primary">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {getSubClassOptions(formData.class!).map(option => (
                    <SelectItem key={option} value={option}>{option}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="entity" className="font-semibold">Account Entity *</Label>
              <Select value={formData.account_entity} onValueChange={handleEntityChange}>
                <SelectTrigger className="border-border/50 focus:border-financial-primary">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ACCOUNT_ENTITIES.map(entity => (
                    <SelectItem key={entity} value={entity}>{entity}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bank" className="font-semibold">Account Bank *</Label>
              <Select 
                value={formData.account_bank} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, account_bank: value as any }))}
              >
                <SelectTrigger className="border-border/50 focus:border-financial-primary">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {getBankOptions(formData.account_entity!).map(bank => (
                    <SelectItem key={bank} value={bank}>{bank}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Beneficiary Display */}
          <div className="space-y-2">
            <Label className="font-semibold">Beneficiary</Label>
            <div className="flex items-center space-x-2">
              <Badge variant="secondary" className="text-sm">
                {formData.beneficiary || getBeneficiaryFromEntity(formData.account_entity || 'Roy')}
              </Badge>
              <span className="text-sm text-muted-foreground">
                (Auto-assigned based on account entity)
              </span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="currency" className="font-semibold">
                Currency {isSharedFieldsLocked && <Badge variant="outline" className="ml-1">Shared</Badge>} *
                {formData.class === 'Cash' && <Badge variant="secondary" className="ml-1">Auto</Badge>}
              </Label>
              {formData.class === 'Cash' ? (
                <div className="flex items-center space-x-2">
                  <Input
                    value={formData.origin_currency}
                    readOnly
                    className="border-border/50 bg-muted text-muted-foreground"
                  />
                  <span className="text-xs text-muted-foreground">
                    (Matches sub-class)
                  </span>
                </div>
              ) : (
                <Select 
                  value={formData.origin_currency} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, origin_currency: value as Currency }))}
                  disabled={isSharedFieldsLocked}
                >
                  <SelectTrigger className="border-border/50 focus:border-financial-primary">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map(currency => (
                      <SelectItem key={currency} value={currency}>{currency}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="quantity" className="font-semibold">Quantity *</Label>
              <Input
                id="quantity"
                type="text"
                inputMode="decimal"
                value={quantityStr}
                onChange={(e) => {
                  const validated = validateNumericInput(e.target.value);
                  setQuantityStr(validated);
                  setFormData(prev => ({ ...prev, quantity: parseFloat(validated) || 0 }));
                }}
                placeholder="0"
                className="border-border/50 focus:border-financial-primary"
              />
            </div>

            {formData.class !== 'Cash' && (
              <div className="space-y-2">
                <Label htmlFor="price" className="font-semibold">
                  Price {isSharedFieldsLocked && <Badge variant="outline" className="ml-1">Shared</Badge>} *
                  {formData.class === 'Private Equity' && usePECalculation && (
                    <Badge variant="outline" className="ml-1">Calculated</Badge>
                  )}
                </Label>
                {formData.class === 'Private Equity' && usePECalculation ? (
                  <Input
                    id="price"
                    type="number"
                    value={getPECalculatedPrice()}
                    readOnly
                    className="border-border/50 bg-muted text-muted-foreground"
                  />
                ) : (
                  <Input
                    id="price"
                    type="text"
                    inputMode="decimal"
                    value={priceStr}
                    onChange={(e) => {
                      const validated = validateNumericInput(e.target.value);
                      setPriceStr(validated);
                      setFormData(prev => ({ ...prev, price: parseFloat(validated) || 0 }));
                    }}
                    placeholder="0.00"
                    className="border-border/50 focus:border-financial-primary"
                     disabled={isPriceFieldLocked}
                  />
                )}
              </div>
            )}
          </div>

          {formData.class === 'Private Equity' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="factor" className="font-semibold">Factor (0-1) {isSharedFieldsLocked && <Badge variant="outline" className="ml-1">Shared</Badge>}</Label>
                <Input
                  id="factor"
                  type="text"
                  inputMode="decimal"
                  value={factorStr}
                  onChange={(e) => {
                    const validated = validateNumericInput(e.target.value);
                    setFactorStr(validated);
                    setFormData(prev => ({ ...prev, factor: parseFloat(validated) || 1.0 }));
                  }}
                  placeholder="1.0"
                  className="border-border/50 focus:border-financial-primary"
                  disabled={isSharedFieldsLocked}
                />
              </div>

              {/* PE Price Calculation Toggle */}
              <div className="space-y-4 p-4 border border-border/30 rounded-lg bg-muted/20">
                <div className="flex items-center justify-between">
                  <Label className="font-semibold">Price Calculation Method</Label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={!usePECalculation ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setUsePECalculation(false)}
                      disabled={isPriceFieldLocked}
                    >
                      Manual Price
                    </Button>
                    <Button
                      type="button"
                      variant={usePECalculation ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setUsePECalculation(true)}
                      disabled={isPriceFieldLocked}
                    >
                      Calculate from Ownership
                    </Button>
                  </div>
                </div>

                {usePECalculation && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="company_value" className="font-semibold">Company Market Value {isSharedFieldsLocked && <Badge variant="outline" className="ml-1">Shared</Badge>} *</Label>
                      <Input
                        id="company_value"
                        type="text"
                        inputMode="decimal"
                        value={peCompanyValueStr}
                        onChange={(e) => {
                          const validated = validateNumericInput(e.target.value);
                          setPeCompanyValueStr(validated);
                          setFormData(prev => ({ ...prev, pe_company_value: parseFloat(validated) || undefined }));
                        }}
                        placeholder="10000000"
                        className="border-border/50 focus:border-financial-primary"
                        disabled={isSharedFieldsLocked}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="holding_percentage" className="font-semibold">Percentage of Holding {isPEHoldingPercentageLocked && <Badge variant="outline" className="ml-1">Shared</Badge>} *</Label>
                      <Input
                        id="holding_percentage"
                        type="text"
                        inputMode="decimal"
                        value={peHoldingPercentageStr}
                        onChange={(e) => {
                          const validated = validateNumericInput(e.target.value);
                          setPeHoldingPercentageStr(validated);
                          setFormData(prev => ({ ...prev, pe_holding_percentage: parseFloat(validated) || undefined }));
                        }}
                        placeholder="5.00"
                        className="border-border/50 focus:border-financial-primary"
                        disabled={isPEHoldingPercentageLocked}
                      />
                      <p className="text-xs text-muted-foreground">Enter as percentage (e.g., 5.0 for 5%)</p>
                    </div>
                  </div>
                )}

                {usePECalculation && formData.pe_company_value && formData.pe_holding_percentage && formData.quantity && (
                  <div className="mt-4 p-3 bg-primary/5 rounded-md">
                    <div className="text-sm text-muted-foreground">
                      <strong>Calculation:</strong> ({formData.pe_company_value.toLocaleString()} × {formData.pe_holding_percentage}%) ÷ {formData.quantity} = <strong>{getPECalculatedPrice().toLocaleString()} per unit</strong>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {formData.class === 'Fixed Income' && (
            <div className="grid grid-cols-2 gap-4">
              {!['REIT stock', 'Private Credit', 'Money Market'].includes(formData.sub_class!) && (
                <div className="space-y-2">
                  <Label htmlFor="maturity" className="font-semibold">Maturity Date {isSharedFieldsLocked && <Badge variant="outline" className="ml-1">Shared</Badge>}</Label>
                  <Input
                    id="maturity"
                    type="date"
                    value={formData.maturity_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, maturity_date: e.target.value }))}
                    className="border-border/50 focus:border-financial-primary"
                    disabled={isSharedFieldsLocked}
                  />
                </div>
              )}

              {['REIT stock', 'Private Credit', 'Money Market'].includes(formData.sub_class!) && (
                <div className="space-y-2">
                  <Label className="font-semibold">Maturity Date</Label>
                  <div className="px-3 py-2 text-sm text-muted-foreground bg-muted rounded-md">
                    None ({formData.sub_class === 'REIT stock' ? 'REIT stock has no maturity' : 
                           formData.sub_class === 'Money Market' ? 'Money Market has no maturity' : 
                           'Private Credit has no fixed maturity'})
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="ytw" className="font-semibold">YTW (%) {isSharedFieldsLocked && <Badge variant="outline" className="ml-1">Shared</Badge>}</Label>
                <Input
                  id="ytw"
                  type="text"
                  inputMode="decimal"
                  value={ytwStr}
                  onChange={(e) => {
                    const validated = validateNumericInput(e.target.value);
                    setYtwStr(validated);
                  }}
                  placeholder="0.00"
                  className="border-border/50 focus:border-financial-primary"
                  disabled={isSharedFieldsLocked}
                />
              </div>
            </div>
          )}
        </div>

        {errors.length > 0 && (
          <Card className="border-financial-danger bg-financial-danger/5 mb-4">
            <CardContent className="pt-4">
              <div className="text-financial-danger text-sm">
                <p className="font-semibold mb-2">Please fix the following errors:</p>
                <ul className="list-disc list-inside space-y-1">
                  {errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex justify-end space-x-3 pt-4 border-t border-border/30">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleSave}
            className="bg-gradient-to-r from-financial-primary to-financial-primary/80 hover:from-financial-primary/90 hover:to-financial-primary/70 text-white"
          >
            {asset ? 'Update Asset' : 'Add Asset'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

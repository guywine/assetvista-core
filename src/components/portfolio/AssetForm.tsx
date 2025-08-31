import { useState, useEffect } from 'react';
import { Asset, AssetClass, AccountEntity, Currency } from '@/types/portfolio';
import { validateAsset, generateId, getSubClassOptions, getBankOptions } from '@/lib/portfolio-utils';
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
    sub_class: 'other',
    ISIN: '',
    account_entity: 'Roy',
    account_bank: 'Poalim',
    beneficiary: 'Kids',
    origin_currency: 'USD',
    quantity: 0,
    price: 0,
    factor: 1.0,
    maturity_date: '',
    ytw: 0,
  });
  
  const [errors, setErrors] = useState<string[]>([]);
  const [currentMode, setCurrentMode] = useState<FormMode>(mode);
  const [selectedExistingAsset, setSelectedExistingAsset] = useState<Asset | null>(null);
  
  const { findAssetsByName, getUniqueAssetNames } = useAssetLookup(existingAssets);

  useEffect(() => {
    setCurrentMode(mode);
    if (asset) {
      setFormData(asset);
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
      }
    } else {
      setFormData({
        name: '',
        class: 'Public Equity',
        sub_class: 'other',
        ISIN: '',
        account_entity: 'Roy',
        account_bank: 'Poalim',
        beneficiary: 'Kids',
        origin_currency: 'USD',
        quantity: 0,
        price: 0,
        factor: 1.0,
        maturity_date: '',
        ytw: 0,
      });
    }
    setErrors([]);
    setSelectedExistingAsset(null);
  }, [asset, isOpen, mode]);

  const handleNameChange = (name: string) => {
    setFormData(prev => ({ ...prev, name }));
    
    if (currentMode === 'NEW' && name.trim()) {
      const existingAssets = findAssetsByName(name.trim());
      if (existingAssets.length > 0) {
        // Auto-switch to existing holding mode
        setCurrentMode('EXISTING_HOLDING');
        setSelectedExistingAsset(existingAssets[0]);
        populateFromExistingAsset(existingAssets[0]);
      }
    }
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
      // Keep existing account-specific fields or clear them
      account_entity: currentMode === 'DUPLICATE' ? prev.account_entity || 'Roy' : 'Roy',
      account_bank: currentMode === 'DUPLICATE' ? prev.account_bank || 'Poalim' : 'Poalim',
      beneficiary: currentMode === 'DUPLICATE' ? getBeneficiaryFromEntity(prev.account_entity || 'Roy') : 'Kids',
      quantity: currentMode === 'DUPLICATE' ? prev.quantity || 0 : 0
    }));
  };

  const handleSave = () => {
    if (!formData.name) return;
    
    const assetData: Asset = {
      id: formData.id || crypto.randomUUID(),
      name: formData.name || "",
      class: formData.class || "Public Equity",
      sub_class: formData.sub_class || "other",
      quantity: formData.quantity || 0,
      price: formData.price || 0,
      factor: formData.factor,
      account_entity: formData.account_entity || "Roy",
      account_bank: formData.account_bank || "Poalim",
      beneficiary: getBeneficiaryFromEntity(formData.account_entity || "Roy"),
      origin_currency: formData.origin_currency || "USD",
      ISIN: formData.ISIN,
      maturity_date: formData.maturity_date,
      ytw: formData.ytw,
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
    const defaultQuantity = (newClass === 'Private Equity' || newClass === 'Real Estate') ? 1 : (formData.quantity || 0);
    
    setFormData(prev => ({
      ...prev,
      class: newClass,
      sub_class: subClassOptions[subClassOptions.length - 1] as any,
      quantity: defaultQuantity,
    }));
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
  const existingAssetNames = getUniqueAssetNames();
  
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
          {errors.length > 0 && (
            <Card className="border-financial-danger bg-financial-danger/5">
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
            <div className="space-y-2">
              <Label htmlFor="name" className="font-semibold">
                Asset Name {formData.class !== 'Cash' && '*'}
              </Label>
              <Input
                id="name"
                value={formData.name || ""}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder={formData.class === 'Cash' ? 'Optional for cash' : 'Enter asset name'}
                className="border-border/50 focus:border-financial-primary"
                disabled={isSharedFieldsLocked}
                list="asset-names"
              />
              {currentMode === 'NEW' && (
                <datalist id="asset-names">
                  {existingAssetNames.map(name => (
                    <option key={name} value={name} />
                  ))}
                </datalist>
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
              <Select value={formData.class} onValueChange={handleClassChange} disabled={isSharedFieldsLocked}>
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
                    origin_currency: formData.class === 'Cash' ? value as Currency : prev.origin_currency
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
              <Label htmlFor="currency" className="font-semibold">Currency {isSharedFieldsLocked && <Badge variant="outline" className="ml-1">Shared</Badge>} *</Label>
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
            </div>

            <div className="space-y-2">
              <Label htmlFor="quantity" className="font-semibold">Quantity *</Label>
              <Input
                id="quantity"
                type="number"
                min="0"
                step="0.0001"
                value={formData.quantity}
                onChange={(e) => setFormData(prev => ({ ...prev, quantity: parseFloat(e.target.value) || 0 }))}
                placeholder="0"
                className="border-border/50 focus:border-financial-primary"
              />
            </div>

            {formData.class !== 'Cash' && (
              <div className="space-y-2">
                <Label htmlFor="price" className="font-semibold">Price {isSharedFieldsLocked && <Badge variant="outline" className="ml-1">Shared</Badge>} *</Label>
                <Input
                  id="price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                  placeholder="0.00"
                  className="border-border/50 focus:border-financial-primary"
                  disabled={isSharedFieldsLocked}
                />
              </div>
            )}
          </div>

          {formData.class === 'Private Equity' && (
            <div className="space-y-2">
              <Label htmlFor="factor" className="font-semibold">Factor (0-1) {isSharedFieldsLocked && <Badge variant="outline" className="ml-1">Shared</Badge>}</Label>
              <Input
                id="factor"
                type="number"
                min="0"
                max="1"
                step="0.01"
                value={formData.factor}
                onChange={(e) => setFormData(prev => ({ ...prev, factor: parseFloat(e.target.value) || 1.0 }))}
                placeholder="1.0"
                className="border-border/50 focus:border-financial-primary"
                disabled={isSharedFieldsLocked}
              />
            </div>
          )}

          {formData.class === 'Fixed Income' && (
            <div className="grid grid-cols-2 gap-4">
              {!['REIT stock', 'Private Credit'].includes(formData.sub_class!) && (
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

              {['REIT stock', 'Private Credit'].includes(formData.sub_class!) && (
                <div className="space-y-2">
                  <Label className="font-semibold">Maturity Date</Label>
                  <div className="px-3 py-2 text-sm text-muted-foreground bg-muted rounded-md">
                    None ({formData.sub_class === 'REIT stock' ? 'REIT stock has no maturity' : 'Private Credit has no fixed maturity'})
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="ytw" className="font-semibold">YTW (%) {isSharedFieldsLocked && <Badge variant="outline" className="ml-1">Shared</Badge>}</Label>
                <Input
                  id="ytw"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.ytw ? (formData.ytw * 100).toFixed(2) : ''}
                  onChange={(e) => {
                    const percentValue = parseFloat(e.target.value) || 0;
                    const decimalValue = percentValue / 100;
                    setFormData(prev => ({ ...prev, ytw: decimalValue }));
                  }}
                  placeholder="4.51"
                  className="border-border/50 focus:border-financial-primary"
                  disabled={isSharedFieldsLocked}
                />
              </div>
            </div>
          )}
        </div>

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

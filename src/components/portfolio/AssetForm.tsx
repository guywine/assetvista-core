import { useState, useEffect } from 'react';
import { Asset, AssetClass, AccountEntity, Currency } from '@/types/portfolio';
import { validateAsset, generateId, getSubClassOptions, getBankOptions } from '@/lib/portfolio-utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';

interface AssetFormProps {
  asset?: Asset;
  isOpen: boolean;
  onClose: () => void;
  onSave: (asset: Asset) => void;
}

export function AssetForm({ asset, isOpen, onClose, onSave }: AssetFormProps) {
  const [formData, setFormData] = useState<Partial<Asset>>({
    name: '',
    class: 'Public Equity',
    sub_class: 'other',
    ISIN: '',
    account_entity: 'Roy',
    account_bank: 'Poalim',
    origin_currency: 'USD',
    quantity: 0,
    price: 0,
    factor: 1.0,
    maturity_date: '',
    ytw: 0,
  });
  
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    if (asset) {
      setFormData(asset);
    } else {
      setFormData({
        name: '',
        class: 'Public Equity',
        sub_class: 'other',
        ISIN: '',
        account_entity: 'Roy',
        account_bank: 'Poalim',
        origin_currency: 'USD',
        quantity: 0,
        price: 0,
        factor: 1.0,
        maturity_date: '',
        ytw: 0,
      });
    }
    setErrors([]);
  }, [asset, isOpen]);

  const handleSave = () => {
    const validationErrors = validateAsset(formData);
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    const assetToSave: Asset = {
      id: asset?.id || generateId(),
      name: formData.name || (formData.class === 'Cash' ? `${formData.origin_currency} Cash` : formData.name!),
      class: formData.class!,
      sub_class: formData.sub_class!,
      ISIN: formData.ISIN,
      account_entity: formData.account_entity!,
      account_bank: formData.account_bank!,
      origin_currency: formData.origin_currency!,
      quantity: formData.quantity!,
      price: formData.class === 'Cash' ? 1 : formData.price!,
      factor: formData.class === 'Private Equity' ? formData.factor : undefined,
      maturity_date: formData.class === 'Fixed Income' ? formData.maturity_date : undefined,
      ytw: formData.class === 'Fixed Income' ? formData.ytw : undefined,
      created_at: asset?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    onSave(assetToSave);
    onClose();
  };

  const handleClassChange = (newClass: AssetClass) => {
    const subClassOptions = getSubClassOptions(newClass);
    // Set default quantity based on asset class
    const defaultQuantity = (newClass === 'Private Equity' || newClass === 'Real Estate') ? 1 : (formData.quantity || 0);
    
    setFormData(prev => ({
      ...prev,
      class: newClass,
      sub_class: subClassOptions[subClassOptions.length - 1] as any, // Use default (last option)
      quantity: defaultQuantity,
    }));
  };

  const handleEntityChange = (newEntity: AccountEntity) => {
    const bankOptions = getBankOptions(newEntity);
    setFormData(prev => ({
      ...prev,
      account_entity: newEntity,
      account_bank: bankOptions[0] as any, // Use first available bank
    }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-financial-primary text-xl font-bold">
            {asset ? 'Edit Asset' : 'Add New Asset'}
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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="font-semibold">
                Asset Name {formData.class !== 'Cash' && '*'}
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder={formData.class === 'Cash' ? 'Optional for cash' : 'Enter asset name'}
                className="border-border/50 focus:border-financial-primary"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="isin" className="font-semibold">ISIN</Label>
              <Input
                id="isin"
                value={formData.ISIN}
                onChange={(e) => setFormData(prev => ({ ...prev, ISIN: e.target.value }))}
                placeholder="Optional ISIN code"
                className="border-border/50 focus:border-financial-primary"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="class" className="font-semibold">Asset Class *</Label>
              <Select value={formData.class} onValueChange={handleClassChange}>
                <SelectTrigger className="border-border/50 focus:border-financial-primary">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Public Equity">Public Equity</SelectItem>
                  <SelectItem value="Private Equity">Private Equity</SelectItem>
                  <SelectItem value="Fixed Income">Fixed Income</SelectItem>
                  <SelectItem value="Cash">Cash</SelectItem>
                  <SelectItem value="Commodities & more">Commodities & more</SelectItem>
                  <SelectItem value="Real Estate">Real Estate</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sub_class" className="font-semibold">Sub Class</Label>
              <Select 
                value={formData.sub_class} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, sub_class: value as any }))}
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
                  {['Roy', 'Roni', 'Guy', 'Shimon', 'Hagit', 'SW2009', 'Weintraub', 'B Joel', 'Tom'].map(entity => (
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

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="currency" className="font-semibold">Currency *</Label>
              <Select 
                value={formData.origin_currency} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, origin_currency: value as Currency }))}
              >
                <SelectTrigger className="border-border/50 focus:border-financial-primary">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {['USD', 'ILS', 'EUR', 'CHF', 'CAD', 'HKD'].map(currency => (
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
                <Label htmlFor="price" className="font-semibold">Price *</Label>
                <Input
                  id="price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                  placeholder="0.00"
                  className="border-border/50 focus:border-financial-primary"
                />
              </div>
            )}
          </div>

          {formData.class === 'Private Equity' && (
            <div className="space-y-2">
              <Label htmlFor="factor" className="font-semibold">Factor (0-1)</Label>
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
              />
            </div>
          )}

          {formData.class === 'Fixed Income' && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="maturity" className="font-semibold">Maturity Date</Label>
                <Input
                  id="maturity"
                  type="date"
                  value={formData.maturity_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, maturity_date: e.target.value }))}
                  className="border-border/50 focus:border-financial-primary"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ytw" className="font-semibold">YTW (%)</Label>
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
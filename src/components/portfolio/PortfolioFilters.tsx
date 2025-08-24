import { useState } from 'react';
import { FilterCriteria, AssetClass, AccountEntity, AccountBank, Currency, SubClass } from '@/types/portfolio';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Filter, X, Plus } from 'lucide-react';
import { CLASS_SUBCLASS_MAP, ACCOUNT_BANK_MAP } from '@/lib/portfolio-utils';

interface PortfolioFiltersProps {
  filters: FilterCriteria;
  onFiltersChange: (filters: FilterCriteria) => void;
}

const ASSET_CLASSES: AssetClass[] = ['Public Equity', 'Private Equity', 'Fixed Income'];
const ACCOUNT_ENTITIES: AccountEntity[] = ['Roy', 'Roni', 'Guy', 'Shimon', 'Hagit', 'SW2009', 'Weintraub', 'B Joel', 'Tom'];
const ACCOUNT_BANKS: AccountBank[] = ['U bank', 'Leumi 1', 'Leumi 2', 'Julius Bär', 'Poalim', 'Poalim Phoenix', 'Leumi', 'etoro', 'Tom Trust'];
const CURRENCIES: Currency[] = ['ILS', 'USD', 'CHF', 'EUR', 'CAD', 'HKD'];

export function PortfolioFilters({ filters, onFiltersChange }: PortfolioFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [newFilterType, setNewFilterType] = useState<string>('');

  const addFilter = (type: keyof FilterCriteria, value: any) => {
    const newFilters = { ...filters };
    
    if (type === 'maturity_date_from' || type === 'maturity_date_to') {
      newFilters[type] = value;
    } else {
      // Handle array filters
      const currentValues = newFilters[type] as any[] || [];
      if (!currentValues.includes(value)) {
        newFilters[type] = [...currentValues, value] as any;
      }
    }
    
    onFiltersChange(newFilters);
  };

  const removeFilter = (type: keyof FilterCriteria, value?: any) => {
    const newFilters = { ...filters };
    
    if (type === 'maturity_date_from' || type === 'maturity_date_to') {
      delete newFilters[type];
    } else {
      // Handle array filters
      const currentValues = newFilters[type] as any[] || [];
      if (value !== undefined) {
        newFilters[type] = currentValues.filter(v => v !== value) as any;
        if ((newFilters[type] as any[]).length === 0) {
          delete newFilters[type];
        }
      } else {
        delete newFilters[type];
      }
    }
    
    onFiltersChange(newFilters);
  };

  const clearAllFilters = () => {
    onFiltersChange({});
  };

  const hasActiveFilters = Object.keys(filters).length > 0;

  const getFilterChips = () => {
    const chips: JSX.Element[] = [];

    // Asset Class filters
    filters.class?.forEach(value => {
      chips.push(
        <Badge key={`class-${value}`} variant="secondary" className="gap-1">
          Class: {value}
          <X 
            className="h-3 w-3 cursor-pointer hover:text-destructive" 
            onClick={() => removeFilter('class', value)}
          />
        </Badge>
      );
    });

    // Sub Class filters
    filters.sub_class?.forEach(value => {
      chips.push(
        <Badge key={`sub_class-${value}`} variant="secondary" className="gap-1">
          Sub Class: {value}
          <X 
            className="h-3 w-3 cursor-pointer hover:text-destructive" 
            onClick={() => removeFilter('sub_class', value)}
          />
        </Badge>
      );
    });

    // Account Entity filters
    filters.account_entity?.forEach(value => {
      chips.push(
        <Badge key={`entity-${value}`} variant="secondary" className="gap-1">
          Entity: {value}
          <X 
            className="h-3 w-3 cursor-pointer hover:text-destructive" 
            onClick={() => removeFilter('account_entity', value)}
          />
        </Badge>
      );
    });

    // Account Bank filters
    filters.account_bank?.forEach(value => {
      chips.push(
        <Badge key={`bank-${value}`} variant="secondary" className="gap-1">
          Bank: {value}
          <X 
            className="h-3 w-3 cursor-pointer hover:text-destructive" 
            onClick={() => removeFilter('account_bank', value)}
          />
        </Badge>
      );
    });

    // Currency filters
    filters.origin_currency?.forEach(value => {
      chips.push(
        <Badge key={`currency-${value}`} variant="secondary" className="gap-1">
          Currency: {value}
          <X 
            className="h-3 w-3 cursor-pointer hover:text-destructive" 
            onClick={() => removeFilter('origin_currency', value)}
          />
        </Badge>
      );
    });

    // Date range filters
    if (filters.maturity_date_from) {
      chips.push(
        <Badge key="date-from" variant="secondary" className="gap-1">
          From: {filters.maturity_date_from}
          <X 
            className="h-3 w-3 cursor-pointer hover:text-destructive" 
            onClick={() => removeFilter('maturity_date_from')}
          />
        </Badge>
      );
    }

    if (filters.maturity_date_to) {
      chips.push(
        <Badge key="date-to" variant="secondary" className="gap-1">
          To: {filters.maturity_date_to}
          <X 
            className="h-3 w-3 cursor-pointer hover:text-destructive" 
            onClick={() => removeFilter('maturity_date_to')}
          />
        </Badge>
      );
    }

    return chips;
  };

  const getAllSubClasses = () => {
    return Object.values(CLASS_SUBCLASS_MAP).flat();
  };

  return (
    <div className="space-y-4">
      {/* Filter chips display */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-sm font-medium text-muted-foreground">Active filters:</span>
          {getFilterChips()}
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAllFilters}
            className="text-muted-foreground hover:text-destructive"
          >
            Clear all
          </Button>
        </div>
      )}

      {/* Add filter button */}
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Filter className="h-4 w-4" />
            Add Filter
            <Plus className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80" align="start">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Filter Type</Label>
              <Select value={newFilterType} onValueChange={setNewFilterType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select filter type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="class">Asset Class</SelectItem>
                  <SelectItem value="sub_class">Sub Class</SelectItem>
                  <SelectItem value="account_entity">Account Entity</SelectItem>
                  <SelectItem value="account_bank">Bank Account</SelectItem>
                  <SelectItem value="origin_currency">Currency</SelectItem>
                  <SelectItem value="maturity_date_from">Maturity Date From</SelectItem>
                  <SelectItem value="maturity_date_to">Maturity Date To</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {newFilterType === 'class' && (
              <div className="space-y-2">
                <Label>Asset Class</Label>
                <div className="grid grid-cols-1 gap-2">
                  {ASSET_CLASSES.map(assetClass => (
                    <Button
                      key={assetClass}
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        addFilter('class', assetClass);
                        setIsOpen(false);
                        setNewFilterType('');
                      }}
                      disabled={filters.class?.includes(assetClass)}
                    >
                      {assetClass}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {newFilterType === 'sub_class' && (
              <div className="space-y-2">
                <Label>Sub Class</Label>
                <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto">
                  {getAllSubClasses().map(subClass => (
                    <Button
                      key={subClass}
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        addFilter('sub_class', subClass);
                        setIsOpen(false);
                        setNewFilterType('');
                      }}
                      disabled={filters.sub_class?.includes(subClass as SubClass)}
                    >
                      {subClass}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {newFilterType === 'account_entity' && (
              <div className="space-y-2">
                <Label>Account Entity</Label>
                <div className="grid grid-cols-2 gap-2">
                  {ACCOUNT_ENTITIES.map(entity => (
                    <Button
                      key={entity}
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        addFilter('account_entity', entity);
                        setIsOpen(false);
                        setNewFilterType('');
                      }}
                      disabled={filters.account_entity?.includes(entity)}
                    >
                      {entity}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {newFilterType === 'account_bank' && (
              <div className="space-y-2">
                <Label>Bank Account</Label>
                <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto">
                  {ACCOUNT_BANKS.map(bank => (
                    <Button
                      key={bank}
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        addFilter('account_bank', bank);
                        setIsOpen(false);
                        setNewFilterType('');
                      }}
                      disabled={filters.account_bank?.includes(bank)}
                    >
                      {bank}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {newFilterType === 'origin_currency' && (
              <div className="space-y-2">
                <Label>Currency</Label>
                <div className="grid grid-cols-3 gap-2">
                  {CURRENCIES.map(currency => (
                    <Button
                      key={currency}
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        addFilter('origin_currency', currency);
                        setIsOpen(false);
                        setNewFilterType('');
                      }}
                      disabled={filters.origin_currency?.includes(currency)}
                    >
                      {currency}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {newFilterType === 'maturity_date_from' && (
              <div className="space-y-2">
                <Label>Maturity Date From</Label>
                <Input
                  type="date"
                  onChange={(e) => {
                    if (e.target.value) {
                      addFilter('maturity_date_from', e.target.value);
                      setIsOpen(false);
                      setNewFilterType('');
                    }
                  }}
                />
              </div>
            )}

            {newFilterType === 'maturity_date_to' && (
              <div className="space-y-2">
                <Label>Maturity Date To</Label>
                <Input
                  type="date"
                  onChange={(e) => {
                    if (e.target.value) {
                      addFilter('maturity_date_to', e.target.value);
                      setIsOpen(false);
                      setNewFilterType('');
                    }
                  }}
                />
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
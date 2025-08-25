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

const ASSET_CLASSES: AssetClass[] = ['Public Equity', 'Private Equity', 'Fixed Income', 'Cash', 'Commodities & more', 'Real Estate'];
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

    // Include filters (green)
    filters.class?.forEach(value => {
      chips.push(
        <Badge key={`class-${value}`} className="gap-1 bg-green-100 text-green-800 border-green-200 hover:bg-green-200">
          Include Class: {value}
          <X 
            className="h-3 w-3 cursor-pointer hover:text-destructive" 
            onClick={() => removeFilter('class', value)}
          />
        </Badge>
      );
    });

    filters.sub_class?.forEach(value => {
      chips.push(
        <Badge key={`sub_class-${value}`} className="gap-1 bg-green-100 text-green-800 border-green-200 hover:bg-green-200">
          Include Sub Class: {value}
          <X 
            className="h-3 w-3 cursor-pointer hover:text-destructive" 
            onClick={() => removeFilter('sub_class', value)}
          />
        </Badge>
      );
    });

    filters.account_entity?.forEach(value => {
      chips.push(
        <Badge key={`entity-${value}`} className="gap-1 bg-green-100 text-green-800 border-green-200 hover:bg-green-200">
          Include Entity: {value}
          <X 
            className="h-3 w-3 cursor-pointer hover:text-destructive" 
            onClick={() => removeFilter('account_entity', value)}
          />
        </Badge>
      );
    });

    filters.account_bank?.forEach(value => {
      chips.push(
        <Badge key={`bank-${value}`} className="gap-1 bg-green-100 text-green-800 border-green-200 hover:bg-green-200">
          Include Bank: {value}
          <X 
            className="h-3 w-3 cursor-pointer hover:text-destructive" 
            onClick={() => removeFilter('account_bank', value)}
          />
        </Badge>
      );
    });

    filters.origin_currency?.forEach(value => {
      chips.push(
        <Badge key={`currency-${value}`} className="gap-1 bg-green-100 text-green-800 border-green-200 hover:bg-green-200">
          Include Currency: {value}
          <X 
            className="h-3 w-3 cursor-pointer hover:text-destructive" 
            onClick={() => removeFilter('origin_currency', value)}
          />
        </Badge>
      );
    });

    // Exclude filters (red)
    filters.exclude_class?.forEach(value => {
      chips.push(
        <Badge key={`exclude_class-${value}`} className="gap-1 bg-red-100 text-red-800 border-red-200 hover:bg-red-200">
          Exclude Class: {value}
          <X 
            className="h-3 w-3 cursor-pointer hover:text-destructive" 
            onClick={() => removeFilter('exclude_class', value)}
          />
        </Badge>
      );
    });

    filters.exclude_sub_class?.forEach(value => {
      chips.push(
        <Badge key={`exclude_sub_class-${value}`} className="gap-1 bg-red-100 text-red-800 border-red-200 hover:bg-red-200">
          Exclude Sub Class: {value}
          <X 
            className="h-3 w-3 cursor-pointer hover:text-destructive" 
            onClick={() => removeFilter('exclude_sub_class', value)}
          />
        </Badge>
      );
    });

    filters.exclude_account_entity?.forEach(value => {
      chips.push(
        <Badge key={`exclude_entity-${value}`} className="gap-1 bg-red-100 text-red-800 border-red-200 hover:bg-red-200">
          Exclude Entity: {value}
          <X 
            className="h-3 w-3 cursor-pointer hover:text-destructive" 
            onClick={() => removeFilter('exclude_account_entity', value)}
          />
        </Badge>
      );
    });

    filters.exclude_account_bank?.forEach(value => {
      chips.push(
        <Badge key={`exclude_bank-${value}`} className="gap-1 bg-red-100 text-red-800 border-red-200 hover:bg-red-200">
          Exclude Bank: {value}
          <X 
            className="h-3 w-3 cursor-pointer hover:text-destructive" 
            onClick={() => removeFilter('exclude_account_bank', value)}
          />
        </Badge>
      );
    });

    filters.exclude_origin_currency?.forEach(value => {
      chips.push(
        <Badge key={`exclude_currency-${value}`} className="gap-1 bg-red-100 text-red-800 border-red-200 hover:bg-red-200">
          Exclude Currency: {value}
          <X 
            className="h-3 w-3 cursor-pointer hover:text-destructive" 
            onClick={() => removeFilter('exclude_origin_currency', value)}
          />
        </Badge>
      );
    });

    // Date range filters (blue)
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
                  <SelectItem value="class">Include Asset Class</SelectItem>
                  <SelectItem value="exclude_class">Exclude Asset Class</SelectItem>
                  <SelectItem value="sub_class">Include Sub Class</SelectItem>
                  <SelectItem value="exclude_sub_class">Exclude Sub Class</SelectItem>
                  <SelectItem value="account_entity">Include Account Entity</SelectItem>
                  <SelectItem value="exclude_account_entity">Exclude Account Entity</SelectItem>
                  <SelectItem value="account_bank">Include Bank Account</SelectItem>
                  <SelectItem value="exclude_account_bank">Exclude Bank Account</SelectItem>
                  <SelectItem value="origin_currency">Include Currency</SelectItem>
                  <SelectItem value="exclude_origin_currency">Exclude Currency</SelectItem>
                  <SelectItem value="maturity_date_from">Maturity Date From</SelectItem>
                  <SelectItem value="maturity_date_to">Maturity Date To</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {(newFilterType === 'class' || newFilterType === 'exclude_class') && (
              <div className="space-y-2">
                <Label>{newFilterType === 'class' ? 'Include' : 'Exclude'} Asset Class</Label>
                <div className="grid grid-cols-1 gap-2">
                  {ASSET_CLASSES.map(assetClass => (
                    <Button
                      key={assetClass}
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        addFilter(newFilterType as keyof FilterCriteria, assetClass);
                        setIsOpen(false);
                        setNewFilterType('');
                      }}
                      disabled={
                        newFilterType === 'class' 
                          ? filters.class?.includes(assetClass)
                          : filters.exclude_class?.includes(assetClass)
                      }
                    >
                      {assetClass}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {(newFilterType === 'sub_class' || newFilterType === 'exclude_sub_class') && (
              <div className="space-y-2">
                <Label>{newFilterType === 'sub_class' ? 'Include' : 'Exclude'} Sub Class</Label>
                <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto">
                  {getAllSubClasses().map(subClass => (
                    <Button
                      key={subClass}
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        addFilter(newFilterType as keyof FilterCriteria, subClass);
                        setIsOpen(false);
                        setNewFilterType('');
                      }}
                      disabled={
                        newFilterType === 'sub_class'
                          ? filters.sub_class?.includes(subClass as SubClass)
                          : filters.exclude_sub_class?.includes(subClass as SubClass)
                      }
                    >
                      {subClass}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {(newFilterType === 'account_entity' || newFilterType === 'exclude_account_entity') && (
              <div className="space-y-2">
                <Label>{newFilterType === 'account_entity' ? 'Include' : 'Exclude'} Account Entity</Label>
                <div className="grid grid-cols-2 gap-2">
                  {ACCOUNT_ENTITIES.map(entity => (
                    <Button
                      key={entity}
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        addFilter(newFilterType as keyof FilterCriteria, entity);
                        setIsOpen(false);
                        setNewFilterType('');
                      }}
                      disabled={
                        newFilterType === 'account_entity'
                          ? filters.account_entity?.includes(entity)
                          : filters.exclude_account_entity?.includes(entity)
                      }
                    >
                      {entity}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {(newFilterType === 'account_bank' || newFilterType === 'exclude_account_bank') && (
              <div className="space-y-2">
                <Label>{newFilterType === 'account_bank' ? 'Include' : 'Exclude'} Bank Account</Label>
                <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto">
                  {ACCOUNT_BANKS.map(bank => (
                    <Button
                      key={bank}
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        addFilter(newFilterType as keyof FilterCriteria, bank);
                        setIsOpen(false);
                        setNewFilterType('');
                      }}
                      disabled={
                        newFilterType === 'account_bank'
                          ? filters.account_bank?.includes(bank)
                          : filters.exclude_account_bank?.includes(bank)
                      }
                    >
                      {bank}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {(newFilterType === 'origin_currency' || newFilterType === 'exclude_origin_currency') && (
              <div className="space-y-2">
                <Label>{newFilterType === 'origin_currency' ? 'Include' : 'Exclude'} Currency</Label>
                <div className="grid grid-cols-3 gap-2">
                  {CURRENCIES.map(currency => (
                    <Button
                      key={currency}
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        addFilter(newFilterType as keyof FilterCriteria, currency);
                        setIsOpen(false);
                        setNewFilterType('');
                      }}
                      disabled={
                        newFilterType === 'origin_currency'
                          ? filters.origin_currency?.includes(currency)
                          : filters.exclude_origin_currency?.includes(currency)
                      }
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
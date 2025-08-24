import { useState } from 'react';
import { FXRates, Currency } from '@/types/portfolio';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Edit2, Check, X, Clock } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface FXRatesBarProps {
  fxRates: FXRates;
  lastUpdated: Date | null;
  onRatesChange: (rates: FXRates) => void;
  onManualRateChange: (currency: string, rate: number) => void;
}

export function FXRatesBar({ 
  fxRates, 
  lastUpdated, 
  onRatesChange, 
  onManualRateChange 
}: FXRatesBarProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editingRates, setEditingRates] = useState<FXRates>(fxRates);

  const currencies: Currency[] = ['ILS', 'USD', 'EUR', 'CHF', 'CAD', 'HKD'];

  const handleStartEdit = () => {
    setEditingRates(fxRates);
    setIsEditing(true);
  };

  const handleSave = () => {
    // Update manual rates for changed values
    currencies.forEach(currency => {
      if (currency !== 'ILS') {
        const originalRate = fxRates[currency]?.to_ILS || 0;
        const newRate = editingRates[currency]?.to_ILS || 0;
        if (Math.abs(originalRate - newRate) > 0.001) {
          onManualRateChange(currency, newRate);
        }
      }
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditingRates(fxRates);
    setIsEditing(false);
  };

  const handleRateChange = (currency: Currency, field: 'to_USD' | 'to_ILS', value: string) => {
    const numValue = parseFloat(value) || 0;
    setEditingRates(prev => ({
      ...prev,
      [currency]: {
        ...prev[currency],
        [field]: numValue,
        last_updated: new Date().toISOString(),
      }
    }));
  };

  const displayRates = isEditing ? editingRates : fxRates;

  const formatLastUpdated = (date: Date | null) => {
    if (!date) return 'Never';
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <Card className="bg-muted/30 border-border/50 shadow-sm">
      <div className="p-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-6 flex-1 overflow-x-auto">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground whitespace-nowrap">
              <span>FX Rates:</span>
              {lastUpdated && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground/70">
                      <Clock className="h-3 w-3" />
                      <span>{formatLastUpdated(lastUpdated)}</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Last updated: {lastUpdated.toLocaleString()}</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
            
            {currencies.map((currency, index) => (
              <div key={currency} className="flex items-center gap-2 whitespace-nowrap">
                {index > 0 && <span className="text-muted-foreground">•</span>}
                
                <div className="flex items-center gap-1">
                  <span className="text-sm font-medium">{currency}</span>
                  <span className="text-muted-foreground">=</span>
                  
                  {currency === 'ILS' ? (
                    <span className="text-sm font-semibold">1.00</span>
                  ) : (
                    <div className="flex items-center gap-1">
                      {isEditing ? (
                        <Input
                          type="number"
                          step="0.001"
                          value={displayRates[currency]?.to_ILS || 0}
                          onChange={(e) => handleRateChange(currency, 'to_ILS', e.target.value)}
                          className="w-16 h-6 text-xs p-1 text-center"
                        />
                      ) : (
                        <span className="text-sm font-semibold">
                          {displayRates[currency]?.to_ILS?.toFixed(3) || '0.000'}
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground">ILS</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-1">
            {isEditing ? (
              <>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  onClick={handleSave}
                  className="h-6 w-6 p-0 text-financial-success hover:text-financial-success hover:bg-financial-success/10"
                >
                  <Check className="h-3 w-3" />
                </Button>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  onClick={handleCancel}
                  className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                >
                  <X className="h-3 w-3" />
                </Button>
              </>
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    onClick={handleStartEdit}
                    className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground hover:bg-muted"
                  >
                    <Edit2 className="h-3 w-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Edit manually</p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
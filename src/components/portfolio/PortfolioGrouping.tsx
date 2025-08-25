import { useState } from 'react';
import { Asset } from '@/types/portfolio';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Group, X, Plus, ArrowUp, ArrowDown } from 'lucide-react';

export type GroupByField = keyof Pick<Asset, 'name' | 'class' | 'sub_class' | 'account_entity' | 'account_bank' | 'origin_currency'>;

interface PortfolioGroupingProps {
  groupByFields: GroupByField[];
  onGroupByChange: (fields: GroupByField[]) => void;
}

const GROUP_BY_OPTIONS: { value: GroupByField; label: string }[] = [
  { value: 'name', label: 'Asset Name' },
  { value: 'class', label: 'Asset Class' },
  { value: 'sub_class', label: 'Sub Class' },
  { value: 'account_entity', label: 'Account Entity' },
  { value: 'account_bank', label: 'Bank Account' },
  { value: 'origin_currency', label: 'Currency' },
];

export function PortfolioGrouping({ groupByFields, onGroupByChange }: PortfolioGroupingProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [newGroupField, setNewGroupField] = useState<GroupByField | ''>('');

  const addGroupField = (field: GroupByField) => {
    if (!groupByFields.includes(field)) {
      onGroupByChange([...groupByFields, field]);
    }
    setIsOpen(false);
    setNewGroupField('');
  };

  const removeGroupField = (field: GroupByField) => {
    onGroupByChange(groupByFields.filter(f => f !== field));
  };

  const moveGroupField = (field: GroupByField, direction: 'up' | 'down') => {
    const index = groupByFields.indexOf(field);
    if (
      (direction === 'up' && index > 0) ||
      (direction === 'down' && index < groupByFields.length - 1)
    ) {
      const newFields = [...groupByFields];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      [newFields[index], newFields[targetIndex]] = [newFields[targetIndex], newFields[index]];
      onGroupByChange(newFields);
    }
  };

  const clearAllGroups = () => {
    onGroupByChange([]);
  };

  const getFieldLabel = (field: GroupByField) => {
    return GROUP_BY_OPTIONS.find(option => option.value === field)?.label || field;
  };

  const availableFields = GROUP_BY_OPTIONS.filter(
    option => !groupByFields.includes(option.value)
  );

  return (
    <div className="space-y-4">
      {/* Group-by fields display */}
      {groupByFields.length > 0 && (
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-sm font-medium text-muted-foreground">Group by:</span>
          {groupByFields.map((field, index) => (
            <Badge key={field} variant="outline" className="gap-1 pl-2 pr-1">
              {getFieldLabel(field)}
              <div className="flex items-center gap-1 ml-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-4 w-4 p-0 hover:bg-muted"
                  onClick={() => moveGroupField(field, 'up')}
                  disabled={index === 0}
                >
                  <ArrowUp className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-4 w-4 p-0 hover:bg-muted"
                  onClick={() => moveGroupField(field, 'down')}
                  disabled={index === groupByFields.length - 1}
                >
                  <ArrowDown className="h-3 w-3" />
                </Button>
                <X 
                  className="h-3 w-3 cursor-pointer hover:text-destructive" 
                  onClick={() => removeGroupField(field)}
                />
              </div>
            </Badge>
          ))}
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAllGroups}
            className="text-muted-foreground hover:text-destructive"
          >
            Clear all
          </Button>
        </div>
      )}

      {/* Add group-by button */}
      {availableFields.length > 0 && (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Group className="h-4 w-4" />
              Add Grouping
              <Plus className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-60" align="start">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Group By Field</label>
                <Select value={newGroupField} onValueChange={(value) => setNewGroupField(value as GroupByField)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select field" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableFields.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {newGroupField && (
                <Button
                  onClick={() => addGroupField(newGroupField)}
                  className="w-full"
                >
                  Add Group
                </Button>
              )}
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
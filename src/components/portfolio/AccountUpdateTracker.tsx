import { useMemo } from 'react';
import { format, differenceInDays } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { CheckCircle2, AlertTriangle, XCircle, ChevronDown, ChevronRight } from 'lucide-react';
import { useAccountUpdateTracker } from '@/hooks/useAccountUpdateTracker';
import { Asset, AccountEntity, AccountBank } from '@/types/portfolio';
import { useState } from 'react';

interface AccountUpdateTrackerProps {
  assets: Asset[];
}

export const AccountUpdateTracker = ({ assets }: AccountUpdateTrackerProps) => {
  // Extract unique accounts from assets
  const uniqueAccounts = useMemo(() => {
    const accountMap = new Map<string, { account_entity: AccountEntity; account_bank: AccountBank }>();
    assets.forEach(asset => {
      const key = `${asset.account_entity}|${asset.account_bank}`;
      if (!accountMap.has(key)) {
        accountMap.set(key, {
          account_entity: asset.account_entity,
          account_bank: asset.account_bank,
        });
      }
    });
    return Array.from(accountMap.values());
  }, [assets]);

  // Group accounts by entity
  const accountsByEntity = useMemo(() => {
    const grouped = new Map<AccountEntity, typeof uniqueAccounts>();
    uniqueAccounts.forEach(account => {
      const existing = grouped.get(account.account_entity) || [];
      grouped.set(account.account_entity, [...existing, account]);
    });
    // Sort entities alphabetically
    return new Map([...grouped.entries()].sort());
  }, [uniqueAccounts]);

  const { statuses, isLoading, markAsUpdated, clearUpdate, markAllEntityAsUpdated, getAccountStatus } = 
    useAccountUpdateTracker(uniqueAccounts);

  const [expandedEntities, setExpandedEntities] = useState<Set<AccountEntity>>(
    new Set(Array.from(accountsByEntity.keys()))
  );

  const toggleEntity = (entity: AccountEntity) => {
    setExpandedEntities(prev => {
      const newSet = new Set(prev);
      if (newSet.has(entity)) {
        newSet.delete(entity);
      } else {
        newSet.add(entity);
      }
      return newSet;
    });
  };

  const getStatusIndicator = (lastUpdated: string | null) => {
    if (!lastUpdated) {
      return { icon: XCircle, color: 'text-destructive', label: 'Never updated', badgeVariant: 'destructive' as const };
    }

    const daysSinceUpdate = differenceInDays(new Date(), new Date(lastUpdated));
    
    if (daysSinceUpdate <= 30) {
      return { icon: CheckCircle2, color: 'text-green-600', label: 'Up to date', badgeVariant: 'default' as const };
    } else if (daysSinceUpdate <= 60) {
      return { icon: AlertTriangle, color: 'text-yellow-600', label: 'Stale', badgeVariant: 'secondary' as const };
    } else {
      return { icon: AlertTriangle, color: 'text-orange-600', label: 'Very stale', badgeVariant: 'destructive' as const };
    }
  };

  const handleToggleUpdate = async (entity: AccountEntity, bank: AccountBank, isCurrentlyUpdated: boolean) => {
    if (isCurrentlyUpdated) {
      await clearUpdate(entity, bank);
    } else {
      await markAsUpdated(entity, bank);
    }
  };

  const handleMarkAllEntity = async (entity: AccountEntity) => {
    const entityAccounts = accountsByEntity.get(entity) || [];
    await markAllEntityAsUpdated(entity, entityAccounts);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>📋 Account Update Tracker</CardTitle>
          <CardDescription>Loading account statuses...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>📋 Account Update Tracker</span>
          <Badge variant="outline">{uniqueAccounts.length} accounts</Badge>
        </CardTitle>
        <CardDescription>
          Track when you last updated each account to ensure your portfolio data stays current
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {Array.from(accountsByEntity.entries()).map(([entity, accounts]) => {
          const isExpanded = expandedEntities.has(entity);
          const allUpdated = accounts.every(acc => {
            const status = getAccountStatus(acc.account_entity, acc.account_bank);
            return status?.last_updated !== null;
          });

          return (
            <Collapsible
              key={entity}
              open={isExpanded}
              onOpenChange={() => toggleEntity(entity)}
            >
              <div className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="p-0 h-auto hover:bg-transparent">
                      <div className="flex items-center gap-2">
                        {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        <span className="font-semibold text-base">{entity}</span>
                        <Badge variant="secondary" className="ml-2">
                          {accounts.length} {accounts.length === 1 ? 'account' : 'accounts'}
                        </Badge>
                      </div>
                    </Button>
                  </CollapsibleTrigger>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleMarkAllEntity(entity)}
                    disabled={allUpdated}
                  >
                    Mark All Updated
                  </Button>
                </div>

                <CollapsibleContent className="space-y-2 pt-2">
                  {accounts.map(account => {
                    const status = getAccountStatus(account.account_entity, account.account_bank);
                    const lastUpdated = status?.last_updated;
                    const isUpdated = lastUpdated !== null;
                    const { icon: Icon, color, label, badgeVariant } = getStatusIndicator(lastUpdated);

                    return (
                      <div
                        key={`${account.account_entity}|${account.account_bank}`}
                        className="flex items-center justify-between p-3 rounded-md bg-muted/30 hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <Checkbox
                            checked={isUpdated}
                            onCheckedChange={() => handleToggleUpdate(
                              account.account_entity,
                              account.account_bank,
                              isUpdated
                            )}
                          />
                          <Icon className={`h-4 w-4 ${color}`} />
                          <span className="font-medium">{account.account_bank}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {lastUpdated ? (
                            <div className="text-sm text-muted-foreground">
                              {format(new Date(lastUpdated), 'MMM dd, yyyy')}
                            </div>
                          ) : (
                            <Badge variant={badgeVariant}>{label}</Badge>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </CollapsibleContent>
              </div>
            </Collapsible>
          );
        })}
      </CardContent>
    </Card>
  );
};
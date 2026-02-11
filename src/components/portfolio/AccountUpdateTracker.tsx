import { useMemo, useState } from 'react';
import { format, differenceInDays } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useAccountUpdateTracker } from '@/hooks/useAccountUpdateTracker';
import { Asset, AccountEntity, AccountBank } from '@/types/portfolio';
import { ACCOUNT_UPDATE_THRESHOLDS, ACCOUNT_UPDATE_COLORS } from '@/constants/portfolio';

interface AccountUpdateTrackerProps {
  assets: Asset[];
  onAccountClick?: (entity: AccountEntity, bank: AccountBank) => void;
}

export const AccountUpdateTracker = ({ assets, onAccountClick }: AccountUpdateTrackerProps) => {
  const [expandedEntities, setExpandedEntities] = useState<Set<AccountEntity>>(new Set());

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

  const accountsByEntity = useMemo(() => {
    const grouped = new Map<AccountEntity, typeof uniqueAccounts>();
    uniqueAccounts.forEach(account => {
      const existing = grouped.get(account.account_entity) || [];
      grouped.set(account.account_entity, [...existing, account]);
    });
    return new Map([...grouped.entries()].sort());
  }, [uniqueAccounts]);

  const { statuses, isLoading, markAsUpdated, markAllEntityAsUpdated, getAccountStatus } = 
    useAccountUpdateTracker(uniqueAccounts);

  const getStatusColor = (lastUpdated: string | null) => {
    if (!lastUpdated) return ACCOUNT_UPDATE_COLORS.NEVER;
    const daysSinceUpdate = differenceInDays(new Date(), new Date(lastUpdated));
    if (daysSinceUpdate <= ACCOUNT_UPDATE_THRESHOLDS.RECENT) return ACCOUNT_UPDATE_COLORS.RECENT;
    if (daysSinceUpdate <= ACCOUNT_UPDATE_THRESHOLDS.WARNING) return ACCOUNT_UPDATE_COLORS.WARNING;
    return ACCOUNT_UPDATE_COLORS.STALE;
  };

  const formatDate = (lastUpdated: string | null) => {
    if (!lastUpdated) return 'Never';
    return format(new Date(lastUpdated), 'MMM dd');
  };

  const getEntityStatus = (entity: AccountEntity, accounts: typeof uniqueAccounts) => {
    let worstLevel = 0;
    accounts.forEach(account => {
      const status = getAccountStatus(entity, account.account_bank);
      const lastUpdated = status?.last_updated;
      if (!lastUpdated) {
        worstLevel = 3;
      } else {
        const daysSinceUpdate = differenceInDays(new Date(), new Date(lastUpdated));
        if (daysSinceUpdate > ACCOUNT_UPDATE_THRESHOLDS.WARNING) {
          worstLevel = Math.max(worstLevel, 2);
        } else if (daysSinceUpdate > ACCOUNT_UPDATE_THRESHOLDS.RECENT) {
          worstLevel = Math.max(worstLevel, 1);
        }
      }
    });
    return [ACCOUNT_UPDATE_COLORS.RECENT, ACCOUNT_UPDATE_COLORS.WARNING, 
            ACCOUNT_UPDATE_COLORS.STALE, ACCOUNT_UPDATE_COLORS.NEVER][worstLevel];
  };

  const toggleEntity = (entity: AccountEntity) => {
    setExpandedEntities(prev => {
      const next = new Set(prev);
      if (next.has(entity)) {
        next.delete(entity);
      } else {
        next.add(entity);
      }
      return next;
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm">Account Update Tracker</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="py-2 px-4">
        <CardTitle className="text-sm flex items-center justify-between">
          <span>Account Update Tracker</span>
          <Badge variant="outline" className="text-xs">{uniqueAccounts.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-3 pt-0">
        {/* Entity chips row */}
        <div className="flex flex-wrap gap-2">
          {Array.from(accountsByEntity.entries()).map(([entity, accounts]) => {
            const isExpanded = expandedEntities.has(entity);
            const entityStatusColor = getEntityStatus(entity, accounts);
            return (
              <Badge
                key={entity}
                variant={isExpanded ? "default" : "outline"}
                className={`cursor-pointer select-none gap-1.5 px-3 py-1 text-sm transition-colors ${
                  isExpanded ? 'bg-financial-primary text-white' : 'hover:bg-muted/50'
                }`}
                onClick={() => toggleEntity(entity)}
              >
                <span className={`text-xs ${isExpanded ? 'text-white' : entityStatusColor}`}>●</span>
                {entity}
              </Badge>
            );
          })}
        </div>

        {/* Expanded entity sections */}
        {Array.from(accountsByEntity.entries()).map(([entity, accounts]) => {
          if (!expandedEntities.has(entity)) return null;
          return (
            <div key={entity} className="mt-3 border-t pt-3">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-sm font-semibold">{entity}</span>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="sm" variant="ghost" className="h-6 px-2 text-xs border border-dashed text-muted-foreground hover:text-foreground">
                      Mark All
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Update All Accounts</AlertDialogTitle>
                      <AlertDialogDescription>
                        Mark all {accounts.length} accounts for "{entity}" as updated now?
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => markAllEntityAsUpdated(entity, accounts)}>
                        Yes, Update All
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
              <div className="flex flex-wrap gap-3">
                {accounts.map((account) => {
                  const status = getAccountStatus(entity, account.account_bank);
                  const lastUpdated = status?.last_updated;
                  const statusColor = getStatusColor(lastUpdated);
                  return (
                    <div key={`${entity}|${account.account_bank}`} className="flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm bg-background">
                      <button
                        className="hover:underline text-left"
                        onClick={() => onAccountClick?.(entity, account.account_bank)}
                      >
                        {account.account_bank}
                      </button>
                      <span className={`${statusColor} text-xs`}>{formatDate(lastUpdated)}</span>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="outline" className="h-5 px-2 text-[10px]">
                            Mark
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Update Account</AlertDialogTitle>
                            <AlertDialogDescription>
                              Mark "{entity} - {account.account_bank}" as updated now?
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => markAsUpdated(entity, account.account_bank)}>
                              Yes, Update
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};

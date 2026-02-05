import { useMemo, useState } from 'react';
import { format, differenceInDays } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useAccountUpdateTracker } from '@/hooks/useAccountUpdateTracker';
import { Asset, AccountEntity, AccountBank } from '@/types/portfolio';
import { ACCOUNT_UPDATE_THRESHOLDS, ACCOUNT_UPDATE_COLORS } from '@/constants/portfolio';

interface AccountUpdateTrackerProps {
  assets: Asset[];
  onAccountClick?: (entity: AccountEntity, bank: AccountBank) => void;
}

export const AccountUpdateTracker = ({ assets, onAccountClick }: AccountUpdateTrackerProps) => {
  const [expandedEntities, setExpandedEntities] = useState<Set<AccountEntity>>(new Set());

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
    // Priority: NEVER (worst) > STALE > WARNING > RECENT (best)
    let worstLevel = 0; // 0=RECENT, 1=WARNING, 2=STALE, 3=NEVER
    
    accounts.forEach(account => {
      const status = getAccountStatus(entity, account.account_bank);
      const lastUpdated = status?.last_updated;
      
      if (!lastUpdated) {
        worstLevel = 3; // NEVER - worst possible
      } else {
        const daysSinceUpdate = differenceInDays(new Date(), new Date(lastUpdated));
        if (daysSinceUpdate > ACCOUNT_UPDATE_THRESHOLDS.WARNING) {
          worstLevel = Math.max(worstLevel, 2); // STALE
        } else if (daysSinceUpdate > ACCOUNT_UPDATE_THRESHOLDS.RECENT) {
          worstLevel = Math.max(worstLevel, 1); // WARNING
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
      <CardContent className="p-4 space-y-1">
        {Array.from(accountsByEntity.entries()).map(([entity, accounts]) => {
          const isExpanded = expandedEntities.has(entity);
          const entityStatusColor = getEntityStatus(entity, accounts);
          
          return (
            <Collapsible key={entity} open={isExpanded} onOpenChange={() => toggleEntity(entity)}>
              <div className="border-b py-1.5">
                <div className="flex items-center justify-between">
                  <CollapsibleTrigger asChild>
                    <button className="flex items-center gap-2 hover:opacity-70 transition-opacity">
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                      <span className="font-semibold text-sm">{entity}</span>
                      <span className={`text-lg ${entityStatusColor}`}>●</span>
                    </button>
                  </CollapsibleTrigger>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="sm" variant="ghost" className="h-6 px-2 text-xs border border-dashed hover:text-foreground text-muted-foreground">
                        Mark All for {entity}
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
                
                <CollapsibleContent className="mt-1">
                  {accounts.map((account) => {
                    const status = getAccountStatus(entity, account.account_bank);
                    const lastUpdated = status?.last_updated;
                    const statusColor = getStatusColor(lastUpdated);

                    return (
                      <div key={`${entity}|${account.account_bank}`} className="flex items-center justify-between py-1 pl-6 hover:bg-muted/50 rounded-sm">
                        <button
                          className="flex items-center gap-4 flex-1 hover:bg-muted/30 rounded px-1 -ml-1 text-left"
                          onClick={() => onAccountClick?.(entity, account.account_bank)}
                        >
                          <span className="text-sm min-w-[120px] hover:underline">{account.account_bank}</span>
                          <span className={`text-sm ${statusColor}`}>
                            {formatDate(lastUpdated)}
                          </span>
                        </button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="outline" className="h-7 px-3 text-xs">
                              Mark Updated
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
                </CollapsibleContent>
              </div>
            </Collapsible>
          );
        })}
      </CardContent>
    </Card>
  );
};
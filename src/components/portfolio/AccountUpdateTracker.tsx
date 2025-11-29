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

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm">Account Update Tracker</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  // Flatten accounts into rows with entity showing only on first occurrence
  // Add entity header rows with "Mark All" button
  const rows: Array<{ 
    type: 'entity-header' | 'account';
    entity: AccountEntity | null; 
    bank: AccountBank; 
    actualEntity: AccountEntity;
    accounts?: typeof uniqueAccounts;
  }> = [];
  
  Array.from(accountsByEntity.entries()).forEach(([entity, accounts]) => {
    // Add entity header row with Mark All button
    rows.push({
      type: 'entity-header',
      entity: entity,
      bank: '' as AccountBank,
      actualEntity: entity,
      accounts: accounts,
    });
    
    // Add individual account rows
    accounts.forEach((account) => {
      rows.push({
        type: 'account',
        entity: null,
        bank: account.account_bank,
        actualEntity: entity,
      });
    });
  });

  return (
    <Card>
      <CardHeader className="py-3 px-4">
        <CardTitle className="text-sm flex items-center justify-between">
          <span>Account Update Tracker</span>
          <Badge variant="outline" className="text-xs">{uniqueAccounts.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-2">
        {rows.map((row, idx) => {
          if (row.type === 'entity-header') {
            // Entity header row with Mark All button
            return (
              <div key={`${row.actualEntity}-header`} className="flex items-center justify-between py-2 border-b">
                <span className="font-semibold text-sm">{row.entity}</span>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="sm" variant="outline" className="h-7 px-3 text-xs">
                      Mark All for {row.entity}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Update All Accounts</AlertDialogTitle>
                      <AlertDialogDescription>
                        Mark all {row.accounts?.length} accounts for "{row.entity}" as updated now?
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => row.accounts && markAllEntityAsUpdated(row.actualEntity, row.accounts)}>
                        Yes, Update All
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            );
          }
          
          // Individual account row (indented)
          const status = getAccountStatus(row.actualEntity, row.bank);
          const lastUpdated = status?.last_updated;
          const statusColor = getStatusColor(lastUpdated);

          return (
            <div key={`${row.actualEntity}|${row.bank}`} className="flex items-center justify-between py-2 pl-4 hover:bg-muted/50 rounded-sm">
              <div className="flex items-center gap-4 flex-1">
                <span className="text-sm min-w-[120px]">{row.bank}</span>
                <span className={`text-sm ${statusColor}`}>
                  {formatDate(lastUpdated)}
                </span>
              </div>
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
                      Mark "{row.actualEntity} - {row.bank}" as updated now?
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => markAsUpdated(row.actualEntity, row.bank)}>
                      Yes, Update
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};
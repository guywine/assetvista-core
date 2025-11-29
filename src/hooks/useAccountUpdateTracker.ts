import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { AccountUpdateStatus, AccountEntity, AccountBank } from '@/types/portfolio';

interface AccountInfo {
  account_entity: AccountEntity;
  account_bank: AccountBank;
}

export const useAccountUpdateTracker = (allAccounts: AccountInfo[]) => {
  const [statuses, setStatuses] = useState<Map<string, AccountUpdateStatus>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchStatuses = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('account_update_tracker')
        .select('*')
        .order('account_entity', { ascending: true })
        .order('account_bank', { ascending: true });

      if (error) throw error;

      // Create a map from the fetched data
      const statusMap = new Map<string, AccountUpdateStatus>();
      data?.forEach(status => {
        const key = `${status.account_entity}|${status.account_bank}`;
        statusMap.set(key, status as AccountUpdateStatus);
      });

      setStatuses(statusMap);
    } catch (error) {
      console.error('Error fetching account update statuses:', error);
      toast({
        title: "Error",
        description: "Failed to load account update statuses",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStatuses();
  }, []);

  const markAsUpdated = async (entity: AccountEntity, bank: AccountBank) => {
    try {
      const { data, error } = await supabase
        .from('account_update_tracker')
        .upsert({
          account_entity: entity,
          account_bank: bank,
          last_updated: new Date().toISOString(),
        }, {
          onConflict: 'account_entity,account_bank',
        })
        .select()
        .single();

      if (error) throw error;

      // Update local state
      const key = `${entity}|${bank}`;
      setStatuses(prev => {
        const newMap = new Map(prev);
        newMap.set(key, data as AccountUpdateStatus);
        return newMap;
      });

      toast({
        title: "Account Updated",
        description: `Marked ${entity} - ${bank} as updated`,
      });
    } catch (error) {
      console.error('Error marking account as updated:', error);
      toast({
        title: "Error",
        description: "Failed to mark account as updated",
        variant: "destructive",
      });
    }
  };

  const clearUpdate = async (entity: AccountEntity, bank: AccountBank) => {
    try {
      const { error } = await supabase
        .from('account_update_tracker')
        .update({ last_updated: null })
        .eq('account_entity', entity)
        .eq('account_bank', bank);

      if (error) throw error;

      // Update local state
      const key = `${entity}|${bank}`;
      setStatuses(prev => {
        const newMap = new Map(prev);
        const status = newMap.get(key);
        if (status) {
          newMap.set(key, { ...status, last_updated: null });
        }
        return newMap;
      });

      toast({
        title: "Update Cleared",
        description: `Cleared update status for ${entity} - ${bank}`,
      });
    } catch (error) {
      console.error('Error clearing account update:', error);
      toast({
        title: "Error",
        description: "Failed to clear update status",
        variant: "destructive",
      });
    }
  };

  const markAllEntityAsUpdated = async (entity: AccountEntity, entityAccounts: AccountInfo[]) => {
    try {
      const updates = entityAccounts
        .filter(acc => acc.account_entity === entity)
        .map(acc => ({
          account_entity: acc.account_entity,
          account_bank: acc.account_bank,
          last_updated: new Date().toISOString(),
        }));

      const { data, error } = await supabase
        .from('account_update_tracker')
        .upsert(updates, {
          onConflict: 'account_entity,account_bank',
        })
        .select();

      if (error) throw error;

      // Update local state
      setStatuses(prev => {
        const newMap = new Map(prev);
        data?.forEach(status => {
          const key = `${status.account_entity}|${status.account_bank}`;
          newMap.set(key, status as AccountUpdateStatus);
        });
        return newMap;
      });

      toast({
        title: "All Accounts Updated",
        description: `Marked all ${entity} accounts as updated`,
      });
    } catch (error) {
      console.error('Error marking all accounts as updated:', error);
      toast({
        title: "Error",
        description: "Failed to mark all accounts as updated",
        variant: "destructive",
      });
    }
  };

  const getAccountStatus = (entity: AccountEntity, bank: AccountBank): AccountUpdateStatus | null => {
    const key = `${entity}|${bank}`;
    return statuses.get(key) || null;
  };

  return {
    statuses,
    isLoading,
    markAsUpdated,
    clearUpdate,
    markAllEntityAsUpdated,
    getAccountStatus,
    refetch: fetchStatuses,
  };
};
import { AccountEntity, Beneficiary } from '@/types/portfolio';
import { ENTITY_BENEFICIARY_MAP } from '@/constants/portfolio';

/**
 * Get the beneficiary for a given account entity
 */
export function getBeneficiaryFromEntity(accountEntity: AccountEntity): Beneficiary {
  return ENTITY_BENEFICIARY_MAP[accountEntity];
}
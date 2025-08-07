import { functions } from '@/lib/firebase';
import { httpsCallable } from 'firebase/functions';
import type { Tenant } from '@/types';

const generateMonthlyInvoicesNow = httpsCallable(functions, 'generateMonthlyInvoicesNow');
export const addTenantFunction = httpsCallable<Omit<Tenant, 'id' | 'joinDate'>, { id: string }>(functions, 'addTenant');
export const deleteTenantFunction = httpsCallable<{ tenantId: string }, void>(functions, 'deleteTenant');
export const updateTenantFunction = httpsCallable<{ tenantId: string; tenantData: Partial<Tenant> }, void>(functions, 'updateTenant');


export async function runManualInvoiceGeneration() {
    return await generateMonthlyInvoicesNow();
}

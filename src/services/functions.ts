
import { functions } from '@/lib/firebase';
import { httpsCallable } from 'firebase/functions';
import type { Tenant, Payment } from '@/types';

const generateMonthlyInvoicesNow = httpsCallable(functions, 'generateMonthlyInvoicesNow');
export const addTenantFunction = httpsCallable<Omit<Tenant, 'id' | 'joinDate'>, { id: string }>(functions, 'addTenant');
export const deleteTenantFunction = httpsCallable<{ tenantId: string }, void>(functions, 'deleteTenant');
export const updateTenantFunction = httpsCallable<{ tenantId: string; tenantData: Partial<Tenant> }, void>(functions, 'updateTenant');
export const getTenantsFunction = httpsCallable<void, any[]>(functions, 'getTenants');

export const recordPaymentFunction = httpsCallable<Omit<Payment, 'id' | 'paymentDate'>, { success: boolean, message: string }>(functions, 'recordPayment');
export const deletePaymentFunction = httpsCallable<{ paymentId: string }, { success: boolean, message: string }>(functions, 'deletePayment');

// Admin functions
export const setAdminClaim = httpsCallable<{ email: string }, { message: string }>(functions, 'setAdminClaim');


export async function runManualInvoiceGeneration() {
    return await generateMonthlyInvoicesNow();
}

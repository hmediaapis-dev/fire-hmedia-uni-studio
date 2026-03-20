
import { functions } from '@/lib/firebase';
import { httpsCallable } from 'firebase/functions';
import type { Invoice, Tenant, Payment } from '@/types';

//invoice CRUD service functions
export const generateMonthlyInvoicesNow = httpsCallable(functions, 'generateMonthlyInvoicesNow');
export const deleteInvoiceFunction = httpsCallable<{ invoiceId: string }, void>(functions, 'deleteInvoice');
export const getTenantInvoices = httpsCallable <
  { tenantId: string; startDate?: string; endDate?: string; limit?: number; lastDocId?: string | null },
  { invoices: Invoice[]; lastDocId: string | null; hasMore: boolean; count: number }
>(functions, 'getTenantInvoices');

//tenant CRUD service functions
export const addTenantFunction = httpsCallable<Omit<Tenant, 'id' | 'joinDate'>, { id: string }>(functions, 'addTenant');
export const deleteTenantFunction = httpsCallable<{ tenantId: string }, void>(functions, 'deleteTenant');
export const updateTenantFunction = httpsCallable<{ tenantId: string; tenantData: Partial<Tenant> }, void>(functions, 'updateTenant');
export const getTenantsFunction = httpsCallable<void, any[]>(functions, 'getTenants');

export const recordPaymentFunction = httpsCallable<Omit<Payment, 'id' | 'paymentDate'>, { success: boolean, message: string }>(functions, 'createPayment');
export const voidPaymentFunction = httpsCallable<{ paymentId: string }, { success: boolean, message: string }>(functions, 'voidPayment');

// Admin functions
export const setAdminClaim = httpsCallable<{ email: string }, { message: string }>(functions, 'setAdminClaim');

//this could be rmeoved, its a helper on the settings page
export async function runManualInvoiceGeneration() {
    return await generateMonthlyInvoicesNow();
}

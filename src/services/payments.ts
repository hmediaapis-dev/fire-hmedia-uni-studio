import { recordPaymentFunction } from './functions';
import type { Payment } from '@/types';

type RecordPaymentData = Omit<Payment, 'id' | 'paymentDate'>;

export async function recordPayment(paymentData: RecordPaymentData): Promise<{ success: boolean; message: string }> {
    const result = await recordPaymentFunction(paymentData);
    return result.data;
}

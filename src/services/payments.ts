import { recordPaymentFunction, voidPaymentFunction } from './functions';
import type { Payment } from '@/types';
import { db } from '@/lib/firebase';
import {
  collection,
  query,
  where,
  getDocs,
  FirestoreDataConverter,
  QueryDocumentSnapshot,
  DocumentData,
  WithFieldValue,
  Timestamp,
} from 'firebase/firestore';

const paymentConverter: FirestoreDataConverter<Payment> = {
  toFirestore: (data: WithFieldValue<Payment>): DocumentData => {
    const { id, ...rest } = data as Payment;
    return {
      ...rest,
      paymentDate:
        rest.paymentDate instanceof Date
          ? Timestamp.fromDate(rest.paymentDate)
          : rest.paymentDate,
    };
  },
  fromFirestore: (snapshot: QueryDocumentSnapshot<DocumentData>): Payment => {
    const data = snapshot.data();
    return {
      id: snapshot.id,
      ...data,
      paymentDate: data.paymentDate?.toDate ? data.paymentDate.toDate() : new Date(),
    } as unknown as Payment;
  },
};

/**
 * Fetch only the payments for a specific tenant.
 * Replaces the old getPayments() full-collection read.
 */
export async function getPaymentsByTenant(tenantId: string): Promise<Payment[]> {
  const paymentsCol = collection(db, 'payments').withConverter(paymentConverter);
  const q = query(paymentsCol, where('tenantId', '==', tenantId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => doc.data());
}

/**
 * invoiceIds is now optional.
 * An empty array (or omitted) means a general balance payment — no invoice applied.
 */
type RecordPaymentData = Omit<Payment, 'id' | 'paymentDate'> & {
  invoiceIds?: string[];
};

export async function recordPayment(
  paymentData: RecordPaymentData
): Promise<{ success: boolean; message: string }> {
  const result = await recordPaymentFunction(paymentData);
  return result.data;
}

export async function deletePayment(
  paymentId: string
): Promise<{ success: boolean; message: string }> {
  const result = await voidPaymentFunction({ paymentId });
  return result.data;
}
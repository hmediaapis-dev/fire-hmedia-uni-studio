
import { recordPaymentFunction, deletePaymentFunction } from './functions';
import type { Payment } from '@/types';
import { db } from '@/lib/firebase';
import { 
  collection,
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
      paymentDate: rest.paymentDate instanceof Date 
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

export async function getPayments(): Promise<Payment[]> {
    const paymentsCol = collection(db, 'payments').withConverter(paymentConverter);
    const snapshot = await getDocs(paymentsCol);
    return snapshot.docs.map((doc) => doc.data());
}


type RecordPaymentData = Omit<Payment, 'id' | 'paymentDate'>;

export async function recordPayment(paymentData: RecordPaymentData): Promise<{ success: boolean; message: string }> {
    const result = await recordPaymentFunction(paymentData);
    return result.data;
}

export async function deletePayment(paymentId: string): Promise<{ success: boolean; message: string }> {
    const result = await deletePaymentFunction({ paymentId });
    return result.data;
}

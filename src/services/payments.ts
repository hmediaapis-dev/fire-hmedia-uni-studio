
import { recordPaymentFunction, deletePaymentFunction } from './functions';
import type { Payment } from '@/types';
import { db } from '@/lib/firebase';
import {
  collection,
  getDocs,
  Timestamp,
} from 'firebase/firestore';


const paymentConverter = {
  toFirestore: (data: Partial<Payment>) => {
    const firestoreData: any = {...data};
    if (data.paymentDate) {
        firestoreData.paymentDate = Timestamp.fromDate(data.paymentDate);
    }
    return firestoreData;
  },
  fromFirestore: (snapshot: any, options: any): Payment => {
    const data = snapshot.data(options);
    return {
      id: snapshot.id,
      ...data,
      paymentDate: data.paymentDate.toDate(),
    };
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


import { db } from '@/lib/firebase';
import type { Invoice } from '@/types';
import {
  collection,
  getDocs,
  Timestamp,
} from 'firebase/firestore';

const invoiceConverter = {
  toFirestore: (data: Omit<Invoice, 'id'>) => {
    return {
      ...data,
      dueDate: Timestamp.fromDate(data.dueDate),
      paidDate: data.paidDate ? Timestamp.fromDate(data.paidDate) : undefined,
      createdAt: data.createdAt ? Timestamp.fromDate(data.createdAt) : Timestamp.now(),
    };
  },
  fromFirestore: (snapshot: any, options: any): Invoice => {
    const data = snapshot.data(options);
    return {
      id: snapshot.id,
      ...data,
      dueDate: data.dueDate.toDate(),
      paidDate: data.paidDate ? data.paidDate.toDate() : undefined,
      createdAt: data.createdAt ? data.createdAt.toDate() : undefined,
    };
  },
};

export async function getInvoices(): Promise<Invoice[]> {
  const invoicesCol = collection(db, 'invoices').withConverter(invoiceConverter);
  const snapshot = await getDocs(invoicesCol);
  return snapshot.docs.map((doc) => doc.data());
}

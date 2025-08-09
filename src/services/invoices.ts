
import { db } from '@/lib/firebase';
import type { Invoice } from '@/types';
import {
  collection,
  getDocs,
  Timestamp,
  doc,
  updateDoc,
} from 'firebase/firestore';
import { deleteInvoiceFunction } from './functions';


const invoiceConverter = {
  toFirestore: (data: Partial<Invoice>) => {
    const firestoreData: any = {...data};
    if (data.dueDate) {
        firestoreData.dueDate = Timestamp.fromDate(data.dueDate);
    }
    if (data.paidDate) {
        firestoreData.paidDate = Timestamp.fromDate(data.paidDate);
    }
    if (data.createdAt) {
        firestoreData.createdAt = Timestamp.fromDate(data.createdAt);
    }
    return firestoreData;
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

export async function updateInvoice(invoiceId: string, data: Partial<Omit<Invoice, 'id'>>): Promise<void> {
    const invoiceRef = doc(db, 'invoices', invoiceId).withConverter(invoiceConverter);
    await updateDoc(invoiceRef, data);
}

export async function deleteInvoice(invoiceId: string): Promise<void> {
    await deleteInvoiceFunction({ invoiceId });
}

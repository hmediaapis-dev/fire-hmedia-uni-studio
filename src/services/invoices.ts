
import { db } from '@/lib/firebase';
import type { Invoice } from '@/types';
import {
  collection,
  getDocs,
  Timestamp,
  doc,
  updateDoc,
  FirestoreDataConverter,
  QueryDocumentSnapshot,
  DocumentData,
  WithFieldValue,
} from 'firebase/firestore';
import { deleteInvoiceFunction } from './functions';


const invoiceConverter: FirestoreDataConverter<Invoice> = {
  toFirestore: (data: WithFieldValue<Invoice>): DocumentData => {
    const { id, ...rest } = data as Invoice;
    const firestoreData: any = {...rest};
    
    if (rest.dueDate instanceof Date) {
      firestoreData.dueDate = Timestamp.fromDate(rest.dueDate);
    }
    if (rest.paidDate instanceof Date) {
      firestoreData.paidDate = Timestamp.fromDate(rest.paidDate);
    }
    if (rest.createdAt instanceof Date) {
      firestoreData.createdAt = Timestamp.fromDate(rest.createdAt);
    }
    
    return firestoreData;
  },
  fromFirestore: (snapshot: QueryDocumentSnapshot<DocumentData>): Invoice => {
    const data = snapshot.data();
    return {
      id: snapshot.id,
      ...data,
      dueDate: data.dueDate?.toDate ? data.dueDate.toDate() : new Date(),
      paidDate: data.paidDate?.toDate ? data.paidDate.toDate() : undefined,
      createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : undefined,
    } as unknown as Invoice;
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

import { db } from '@/lib/firebase';
import type { Document } from '@/types';
import {
  collection,
  getDocs,
  addDoc,
  Timestamp,
} from 'firebase/firestore';

const documentConverter = {
  toFirestore: (data: Omit<Document, 'id'>) => {
    return {
      ...data,
      uploadDate: Timestamp.fromDate(data.uploadDate),
    };
  },
  fromFirestore: (snapshot: any, options: any): Document => {
    const data = snapshot.data(options);
    return {
      id: snapshot.id,
      ...data,
      uploadDate: data.uploadDate.toDate(),
    };
  },
};

export async function getDocuments(): Promise<Document[]> {
  const documentsCol = collection(db, 'documents').withConverter(documentConverter);
  const snapshot = await getDocs(documentsCol);
  return snapshot.docs.map((doc) => doc.data());
}

export async function addDocument(docData: Omit<Document, 'id'>): Promise<string> {
    const documentsCol = collection(db, 'documents').withConverter(documentConverter);
    const docRef = await addDoc(documentsCol, docData);
    return docRef.id;
}

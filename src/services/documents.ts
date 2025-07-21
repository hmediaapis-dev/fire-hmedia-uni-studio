import { db } from '@/lib/firebase';
import type { Document } from '@/types';
import {
  collection,
  getDocs,
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

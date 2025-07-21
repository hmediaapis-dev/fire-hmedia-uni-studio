import { db, storage } from '@/lib/firebase';
import type { Document } from '@/types';
import {
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
  Timestamp,
} from 'firebase/firestore';
import { ref, deleteObject } from 'firebase/storage';

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

export async function deleteDocument(docId: string, storagePath: string): Promise<void> {
    // 1. Delete the file from Cloud Storage using its path
    const fileRef = ref(storage, storagePath);
    await deleteObject(fileRef);

    // 2. Delete the document from Firestore
    const docRef = doc(db, 'documents', docId);
    await deleteDoc(docRef);
}

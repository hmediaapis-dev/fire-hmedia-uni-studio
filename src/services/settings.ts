import { db } from '@/lib/firebase';
import type { Settings } from '@/types';
import {
  doc,
  getDoc,
  setDoc,
} from 'firebase/firestore';

const settingsDocRef = doc(db, 'settings', 'main');

const settingsConverter = {
    toFirestore: (data: Settings) => data,
    fromFirestore: (snapshot: any, options: any): Settings => {
        const data = snapshot.data(options);
        return {
            id: snapshot.id,
            ...data,
        };
    },
};

export async function getSettings(): Promise<Settings | null> {
  const docSnap = await getDoc(settingsDocRef.withConverter(settingsConverter));
  if (docSnap.exists()) {
    return docSnap.data();
  }
  return null;
}

export async function updateSettings(settings: Settings): Promise<void> {
    // Use setDoc with merge: true to create the document if it doesn't exist,
    // or update it if it does.
    await setDoc(settingsDocRef, settings, { merge: true });
}

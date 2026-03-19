import { db } from '@/lib/firebase';
import type { Settings, MainSettings, DashboardSettings } from '@/types';
import {
  doc,
  getDoc,
  setDoc,
} from 'firebase/firestore';

const mainDocRef = doc(db, 'settings', 'main');
const dashboardDocRef = doc(db, 'settings', 'dashboard');

const mainConverter = {
  toFirestore: (data: MainSettings) => data,
  fromFirestore: (snapshot: any, options: any): MainSettings => {
    const data = snapshot.data(options);
    return {
      id: 'main' as const,
      ...data,
    };
  },
};

const dashboardConverter = {
  toFirestore: (data: DashboardSettings) => data,
  fromFirestore: (snapshot: any, options: any): DashboardSettings => {
    const data = snapshot.data(options);
    return {
      id: 'dashboard' as const,
      ...data,
    };
  },
};

export async function getSettings<T extends Settings>(id: T['id']): Promise<T | null> {
  if (id === 'main') {
    const docSnap = await getDoc(mainDocRef.withConverter(mainConverter));
    return docSnap.exists() ? (docSnap.data() as T) : null;
  } else {
    const docSnap = await getDoc(dashboardDocRef.withConverter(dashboardConverter));
    return docSnap.exists() ? (docSnap.data() as T) : null;
  }
}

export async function updateSettings(settings: Settings): Promise<void> {
  if (settings.id === 'main') {
    await setDoc(mainDocRef, settings, { merge: true });
  } else {
    await setDoc(dashboardDocRef, settings, { merge: true });
  }
}
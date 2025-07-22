import { db } from '@/lib/firebase';
import type { Unit, Tenant } from '@/types';
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  writeBatch,
  arrayUnion,
  arrayRemove,
  runTransaction,
  addDoc
} from 'firebase/firestore';

const unitConverter = {
    toFirestore: (data: Omit<Unit, 'id'>) => data,
    fromFirestore: (snapshot: any, options: any): Unit => {
        const data = snapshot.data(options);
        return {
            id: snapshot.id,
            ...data,
        };
    },
};


export async function getUnits(): Promise<Unit[]> {
  const unitsCol = collection(db, 'units').withConverter(unitConverter);
  const snapshot = await getDocs(unitsCol);
  return snapshot.docs.map((doc) => doc.data());
}

export async function addUnit(unitData: Omit<Unit, 'id'>): Promise<string> {
    const unitsCol = collection(db, 'units').withConverter(unitConverter);
    const docRef = await addDoc(unitsCol, unitData);
    return docRef.id;
}


export async function assignTenantToUnit(unitId: string, tenantId: string, oldTenantId?: string): Promise<void> {
    const batch = writeBatch(db);
    const unitRef = doc(db, 'units', unitId);
    const newTenantRef = doc(db, 'tenants', tenantId);

    // Update unit
    batch.update(unitRef, { status: 'rented', tenantId: tenantId });

    // Add unit to new tenant
    batch.update(newTenantRef, { units: arrayUnion(unitId) });

    // If there was an old tenant, remove the unit from their list
    if (oldTenantId) {
        const oldTenantRef = doc(db, 'tenants', oldTenantId);
        batch.update(oldTenantRef, { units: arrayRemove(unitId) });
    }

    await batch.commit();
}

export async function unassignTenantFromUnit(unitId: string, tenantId: string): Promise<void> {
    const batch = writeBatch(db);
    const unitRef = doc(db, 'units', unitId);
    const tenantRef = doc(db, 'tenants', tenantId);

    // Update unit
    batch.update(unitRef, { status: 'available', tenantId: '' }); // Or delete tenantId field

    // Remove unit from tenant
    batch.update(tenantRef, { units: arrayRemove(unitId) });

    await batch.commit();
}

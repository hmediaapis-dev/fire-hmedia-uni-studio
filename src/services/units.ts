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
  addDoc,
  deleteDoc,
  deleteField,
  Timestamp,
} from 'firebase/firestore';

const unitConverter = {
    toFirestore: (data: Omit<Unit, 'id'>) => {
        const firestoreData: any = {...data};
        if (data.startDate) {
            firestoreData.startDate = Timestamp.fromDate(data.startDate);
        }
        return firestoreData;
    },
    fromFirestore: (snapshot: any, options: any): Unit => {
        const data = snapshot.data(options);
        return {
            id: snapshot.id,
            ...data,
            startDate: data.startDate ? data.startDate.toDate() : undefined,
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

export async function updateUnit(unitId: string, unitData: Partial<Omit<Unit, 'id'>>): Promise<void> {
    const unitRef = doc(db, 'units', unitId);
    const dataToUpdate: any = {...unitData};
    if (unitData.startDate) {
        dataToUpdate.startDate = Timestamp.fromDate(unitData.startDate);
    }
    await updateDoc(unitRef, dataToUpdate);
}

export async function deleteUnit(unitId: string, tenantId?: string): Promise<void> {
    const batch = writeBatch(db);
    const unitRef = doc(db, 'units', unitId);

    // 1. Delete the unit document
    batch.delete(unitRef);

    // 2. If the unit was assigned to a tenant, remove it from the tenant's list
    if (tenantId) {
        const tenantRef = doc(db, 'tenants', tenantId);
        batch.update(tenantRef, { units: arrayRemove(unitId) });
    }

    await batch.commit();
}


export async function assignTenantToUnit(unitId: string, tenantId: string, oldTenantId?: string): Promise<void> {
    const batch = writeBatch(db);
    const unitRef = doc(db, 'units', unitId);
    const newTenantRef = doc(db, 'tenants', tenantId);

    // Update unit with tenant and start date
    batch.update(unitRef, { 
        status: 'rented', 
        tenantId: tenantId,
        startDate: new Date(),
    });

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

    // Update unit status and remove tenantId and startDate
    batch.update(unitRef, { 
        status: 'available', 
        tenantId: deleteField(),
        startDate: deleteField(),
    });

    // Remove unit from tenant
    batch.update(tenantRef, { units: arrayRemove(unitId) });

    await batch.commit();
}

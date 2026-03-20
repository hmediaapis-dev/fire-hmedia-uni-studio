import { db } from '@/lib/firebase';
import type { Unit, Tenant } from '@/types';
import type { Settings, DashboardSettings } from '@/types';
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
import { FirestoreDataConverter, 
    QueryDocumentSnapshot,
} from 'firebase/firestore';

const unitConverter: FirestoreDataConverter<Unit> = {
    toFirestore: (unit: Unit) => {
        const { id, ...data } = unit;
        return {
            name: data.name,
            size: data.size,
            rent: data.rent,
            status: data.status,
            gateCode: data.gateCode,
            tenantId: data.tenantId ?? null,
            tenantName: data.tenantName ?? null,
            startDate: data.startDate ? Timestamp.fromDate(data.startDate) : null,
        };
    },
    fromFirestore: (snapshot: QueryDocumentSnapshot): Unit => {
        const data = snapshot.data();
        return {
            id: snapshot.id,
            name: data.name,
            size: data.size,
            rent: data.rent,
            status: data.status,
            gateCode: data.gateCode,
            tenantId: data.tenantId ?? undefined,
            tenantName: data.tenantName ?? undefined,
            startDate: data.startDate ? data.startDate.toDate() : undefined,
        } as Unit;
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
    const dashboardUpdate = {
        totalUnits: (await getUnits()).length,
        availableUnits: (await getUnits()).filter(unit => unit.status === 'available').length,
    }
    await updateDoc(doc(db, 'settings', 'dashboard'), dashboardUpdate);  //update dashboard settings when needed
    return docRef.id;
}

export async function updateUnit(unitId: string, unitData: Partial<Omit<Unit, 'id'>>): Promise<void> {
    const unitRef = doc(db, 'units', unitId);
    const dataToUpdate: any = { ...unitData };

    if ('tenantId' in unitData) dataToUpdate.tenantId = unitData.tenantId ?? null;
    if ('tenantName' in unitData) dataToUpdate.tenantName = unitData.tenantName ?? null;
    if ('startDate' in unitData) dataToUpdate.startDate = unitData.startDate ? Timestamp.fromDate(unitData.startDate) : null;

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

    const dashboardUpdate = {
        totalUnits: (await getUnits()).length,
        availableUnits: (await getUnits()).filter(unit => unit.status === 'available').length,
    }
    await updateDoc(doc(db, 'settings', 'dashboard'), dashboardUpdate);  //my first try and updating when needed
}


export async function assignTenantToUnit(unitId: string, tenantId: string, tenantName: string, oldTenantId?: string): Promise<void> {
    const batch = writeBatch(db);
    const unitRef = doc(db, 'units', unitId);
    const newTenantRef = doc(db, 'tenants', tenantId);

    // Update unit with tenant and start date
    batch.update(unitRef, { 
        status: 'rented', 
        tenantId: tenantId,
        tenantName: tenantName,
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

    const dashboardUpdate = {
        availableUnits: (await getUnits()).filter(unit => unit.status === 'available').length,
    }
    await updateDoc(doc(db, 'settings', 'dashboard'), dashboardUpdate);  //my second try and updating when needed
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
        tenantName: deleteField(),
    });

    // Remove unit from tenant
    batch.update(tenantRef, { units: arrayRemove(unitId) });

    await batch.commit();

    const dashboardUpdate = {
        availableUnits: (await getUnits()).filter(unit => unit.status === 'available').length,
    }
    await updateDoc(doc(db, 'settings', 'dashboard'), dashboardUpdate);
}

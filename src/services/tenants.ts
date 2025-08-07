import { db } from '@/lib/firebase';
import type { Tenant } from '@/types';
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  Timestamp,
} from 'firebase/firestore';
import { addTenantFunction, deleteTenantFunction } from './functions';


// A helper function to convert Firestore Timestamps to JS Dates
const tenantConverter = {
  toFirestore: (data: Omit<Tenant, 'id'>) => {
    return {
      ...data,
      joinDate: Timestamp.fromDate(data.joinDate),
    };
  },
  fromFirestore: (snapshot: any, options: any): Tenant => {
    const data = snapshot.data(options);
    return {
      id: snapshot.id,
      ...data,
      joinDate: data.joinDate.toDate(),
    };
  },
};

export async function getTenants(): Promise<Tenant[]> {
  const tenantsCol = collection(db, 'tenants').withConverter(tenantConverter);
  const snapshot = await getDocs(tenantsCol);
  return snapshot.docs.map((doc) => doc.data());
}

export async function addTenant(tenantData: Omit<Tenant, 'id'>): Promise<string> {
    const result: any = await addTenantFunction(tenantData);
    return result.data.id;
}

export async function updateTenant(tenantId: string, tenantData: Partial<Tenant>): Promise<void> {
    const tenantRef = doc(db, 'tenants', tenantId);
    // Don't convert dates if they are not being updated
    const dataToUpdate = { ...tenantData };
    if (dataToUpdate.joinDate && !(dataToUpdate.joinDate instanceof Timestamp)) {
        dataToUpdate.joinDate = Timestamp.fromDate(dataToUpdate.joinDate);
    }
    await updateDoc(tenantRef, dataToUpdate);
}

export async function deleteTenant(tenantId: string): Promise<void> {
    await deleteTenantFunction({ tenantId });
}

import { db } from '@/lib/firebase';
import type { Tenant } from '@/types';
import { 
  collection, 
  getDocs, 
  Timestamp,
  FirestoreDataConverter,
  QueryDocumentSnapshot,
  DocumentData,
  WithFieldValue,
  PartialWithFieldValue,
} from 'firebase/firestore';
import { addTenantFunction, deleteTenantFunction, updateTenantFunction } from './functions';


// A helper function to convert Firestore Timestamps to JS Dates
const tenantConverter: FirestoreDataConverter<Tenant> = {
  toFirestore: (data: WithFieldValue<Tenant>): DocumentData => {
    const { id, ...rest } = data as Tenant;
    return {
      ...rest,
      joinDate: rest.joinDate instanceof Date 
        ? Timestamp.fromDate(rest.joinDate) 
        : rest.joinDate,
    };
  },
  fromFirestore: (snapshot: QueryDocumentSnapshot<DocumentData>): Tenant => {
    const data = snapshot.data();
    return {
      id: snapshot.id,
      ...data,
      joinDate: data.joinDate?.toDate ? data.joinDate.toDate() : new Date(),
    } as Tenant;
  },
};

export async function getTenants(): Promise<Tenant[]> {
  const tenantsCol = collection(db, 'tenants').withConverter(tenantConverter);
  const snapshot = await getDocs(tenantsCol);
  const tenants = snapshot.docs.map((doc) => doc.data());
  
  // Sort alphabetically by name
  tenants.sort((a, b) => a.name.localeCompare(b.name));
  
  return tenants;
}

export async function addTenant(tenantData: Omit<Tenant, 'id' | 'joinDate' | 'units' | 'rent' | 'balance'>): Promise<string> {
  const completeData = {
      ...tenantData,
      units: [],      // No units assigned yet
      rent: 0,        // No rent yet
      balance: 0,     // No balance yet
  };
  const result: any = await addTenantFunction(completeData);
  return result.data.id;
}

export async function updateTenant(tenantId: string, tenantData: Partial<Tenant>): Promise<void> {
    await updateTenantFunction({ tenantId, tenantData });
}

export async function deleteTenant(tenantId: string): Promise<void> {
    await deleteTenantFunction({ tenantId });
}
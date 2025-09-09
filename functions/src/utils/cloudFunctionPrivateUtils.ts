//import { db } from '../config/firebase'; // Your Firebase config
//import { HttpsError } from 'firebase-functions/v2/https';

// Internal utility - not exported as a Cloud Function
// This version doesn't perform any reads - just uses the data you already have
export function adjustTenantBalanceInTransaction(
    tenantRef: FirebaseFirestore.DocumentReference,
    tenantData: any, // The tenant document data you already read
    amount: number,
    transaction: FirebaseFirestore.Transaction
): void {
    const currentBalance = tenantData?.balance ?? 0;
    const newBalance = currentBalance + amount;
    
    transaction.update(tenantRef, { balance: newBalance });
}

// Alternative version that takes current balance directly
export function adjustTenantBalanceInTransactionByBalance(
    tenantRef: FirebaseFirestore.DocumentReference,
    currentBalance: number,
    amount: number,
    transaction: FirebaseFirestore.Transaction
): void {
    const newBalance = currentBalance + amount;
    transaction.update(tenantRef, { balance: newBalance });
}

// You could also add other cloud function utilities here
/*export async function getTenantById(tenantId: string, transaction?: FirebaseFirestore.Transaction) {
    // ...
}*/
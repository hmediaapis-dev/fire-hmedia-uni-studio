
/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

//import a utils file
import { adjustTenantBalanceInTransaction } from './utils/cloudFunctionPrivateUtils';

import {setGlobalOptions} from "firebase-functions/v2";

// Start writing functions
// https://firebase.google.com/docs/functions/typescript

// For cost control, you can set the maximum number of containers that can be
// running at the same time. This helps mitigate the impact of unexpected
// traffic spikes by instead downgrading performance. This limit is a
// per-function limit. You can override the limit for each function using the
// `maxInstances` option in the function's options, e.g.
// `onRequest({ maxInstances: 5 }, (req, res) => { ... })`.
// NOTE: setGlobalOptions does not apply to functions using the v1 API. V1
// functions should each use functions.runWith({ maxInstances: 10 }) instead.
// In the v1 API, each function can only serve one request per container, so
// this will be the maximum concurrent request count.
setGlobalOptions({ maxInstances: 10 });

import { HttpsError, onCall } from "firebase-functions/v2/https";
// import { onSchedule } from "firebase-functions/v2/scheduler";  //add back when its time to invoice
import * as admin from "firebase-admin";
import { Payment } from '../src/utils/types';  //this is for the payment type in the payment CRUD functions

admin.initializeApp();
const db = admin.firestore();

//ADMIN SECTION
export const setAdminClaim = onCall(async (request) => {
  // 1. Check if the user is authenticated at all.
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'The function must be called while authenticated.');
  }
  
  const email = request.data.email;
  const callingUserUID = request.auth.uid;
  const callingUserClaims = request.auth.token;

  // 2. Check if the caller is already an admin.
  if (callingUserClaims.admin === true) {
    console.log(`Admin user ${callingUserClaims.email} is setting claim for ${email}`);
    try {
      const user = await admin.auth().getUserByEmail(email);
      await admin.auth().setCustomUserClaims(user.uid, { admin: true });
      return { message: `Success! ${email} has been made an admin.` };
    } catch (error: any) {
      console.error("Error setting admin claim by admin:", error);
      throw new HttpsError('internal', error.message);
    }
  }

  // 3. If the caller is NOT an admin, check if any admins exist.
  // This is the "bootstrap" case for the first admin.
  console.log("Caller is not an admin. Checking for existing admins...");
  const listUsersResult = await admin.auth().listUsers(1000);
  const hasExistingAdmin = listUsersResult.users.some(user => !!user.customClaims?.admin);

  if (hasExistingAdmin) {
    console.log("An admin already exists. Denying non-admin request.");
    throw new HttpsError('permission-denied', 'Only an admin can grant this role.');
  }

  // 4. If NO admins exist, allow the caller to make themselves the first admin.
  console.log("No admins found. Promoting calling user to first admin.");
  try {
    await admin.auth().setCustomUserClaims(callingUserUID, { admin: true });
    return { message: `Success! You are now the first admin.` };
  } catch (error: any) {
    console.error("Error setting first admin claim:", error);
    throw new HttpsError('internal', error.message);
  }
});

//CURRENT GENERATE INVOICE SECTION
/* export const generateMonthlyInvoices = onSchedule(
    {
      schedule: '0 5 1 * *', // 5:00 AM on the 1st of every month
      timeZone: 'America/Chicago',
    },
    async () => {
      try {
        const today = new Date();
        const invoiceMonth = today.getMonth(); // 0-indexed
        const invoiceYear = today.getFullYear();
  
        const dateObject = new Date(invoiceYear, invoiceMonth, 1);
        const dateString = dateObject.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
        });
  
        // Get all rented units
        const unitsSnapshot = await db
          .collection('units')
          .where('tenantId', '!=', null)
          .get();
  
        let invoicesCreated = 0;
  
        for (const unitDoc of unitsSnapshot.docs) {
          const unit = unitDoc.data();
          const unitId = unitDoc.id;
  
          if (!unit.tenantId || !unit.startDate) continue;
  
          const startDate = unit.startDate.toDate
            ? unit.startDate.toDate()
            : new Date(unit.startDate);
  
          if (startDate > today) continue;
  
          const tenantId = unit.tenantId;
          const rent = unit.rent ?? 0;
  
          // 🔒 Deterministic invoice ID (prevents duplicates)
          const invoiceId = `${tenantId}_${unitId}_${invoiceYear}_${invoiceMonth}`;
          const invoiceRef = db.collection('invoices').doc(invoiceId);
  
          const settingsRef = db.collection('settings').doc('main');
          const tenantRef = db.collection('tenants').doc(tenantId);
  
          await db.runTransaction(async (transaction) => {
            // 🚫 Check if invoice already exists
            const existingInvoice = await transaction.get(invoiceRef);
            if (existingInvoice.exists) {
              return; // Skip if already created
            }
  
            // Read required docs
            const settingsDoc = await transaction.get(settingsRef);
            const tenantDoc = await transaction.get(tenantRef);
  
            if (!settingsDoc.exists) {
              throw new Error('Settings document not found');
            }
  
            const settingsData = settingsDoc.data();
            const currentInvoiceNum = settingsData?.currentInvoiceNum ?? 100;
            const nextInvoiceNum = currentInvoiceNum + 1;
  
            // Create invoice object
            const newInvoice = {
              tenantId,
              unitId,
              invoiceNumber: nextInvoiceNum,
              monthRange: dateString,
              amount: rent,
              dueDate: admin.firestore.Timestamp.fromDate(
                new Date(invoiceYear, invoiceMonth + 1, 1)
              ),
              status: 'unpaid',
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
              amountPaid: 0,
              notes: '',
            };
  
            // ✅ Create invoice
            transaction.set(invoiceRef, newInvoice);
  
            // ✅ Update invoice number
            transaction.update(settingsRef, {
              currentInvoiceNum: nextInvoiceNum,
            });
  
            // ✅ Update tenant balance
            if (tenantDoc.exists) {
              const tenantData = tenantDoc.data();
              const currentBalance = tenantData?.balance ?? 0;
  
              transaction.update(tenantRef, {
                balance: currentBalance + rent,
              });
            }
          });
  
          invoicesCreated++;
          console.log(
            `Processed invoice for tenant ${tenantId}, unit ${unitId}`
          );
        }
  
        console.log(
          `Monthly invoice generation completed: ${invoicesCreated} processed`
        );
      } catch (error) {
        console.error('Error in scheduled invoice generation:', error);
        throw error;
      }
    }
  );   */

//CURRENT GENERATE INVOICE SECTION
export const generateMonthlyInvoicesNow = onCall(async (request) => {
    // Check if the user is authenticated.
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'The function must be called while authenticated.');
    }
    // Check if the user is an admin.
    if (request.auth.token.admin !== true) {
        throw new HttpsError('permission-denied', 'The function must be called by an admin.');
    }

    try {
        const today = new Date();
        const invoiceMonth = today.getMonth(); // 0-indexed (Jan = 0)
        const invoiceYear = today.getFullYear();
        const dateObject = new Date(invoiceYear, invoiceMonth, 1);
        const dateOptions: {
            year: "numeric" | "2-digit"; // Specify the allowed string literals
            month: "numeric" | "2-digit" | "long" | "short" | "narrow"; // Example for month
        } = {
            year: "numeric",
            month: "long"
        };
        const dateString = dateObject.toLocaleDateString('en-US', dateOptions);

        // Get all rented units
        const unitsSnapshot = await db.collection('units')
            .where('tenantId', '!=', null)
            .get();

        let invoicesCreated = 0;

        for (const unitDoc of unitsSnapshot.docs) {
            const unit = unitDoc.data();
            const unitId = unitDoc.id;

            if (!unit.tenantId || !unit.startDate) continue;

            const startDate = unit.startDate.toDate
                ? unit.startDate.toDate()
                : new Date(unit.startDate);

            if (startDate > today) continue;

            const tenantId = unit.tenantId;
            const rent = unit.rent;

            // Check if invoice already exists for this month
            const invoiceQuery = await db.collection('invoices')
                .where('tenantId', '==', tenantId)
                .where('dueDate', '>=', new Date(invoiceYear, invoiceMonth, 1))
                .where('dueDate', '<', new Date(invoiceYear, invoiceMonth + 1, 1))
                .get();

            const alreadyExists = invoiceQuery.docs.some(
                (doc) => doc.data().amount === rent
            );
            if (alreadyExists) continue;
            
            // Get next invoice number and create invoice in a transaction
            const settingsRef = db.collection('settings').doc('main');
            const tenantRef = db.collection('tenants').doc(tenantId);

            await db.runTransaction(async (transaction) => {
                // READ PHASE: Get settings and tenant data
                const settingsDoc = await transaction.get(settingsRef);
                const tenantDoc = await transaction.get(tenantRef);

                if (!settingsDoc.exists) {
                    throw new Error('Settings document not found');
                }

                const settingsData = settingsDoc.data();
                const currentInvoiceNum = settingsData?.currentInvoiceNum ?? 100;
                const nextInvoiceNum = currentInvoiceNum + 1;

                // WRITE PHASE: Create invoice, update settings, update tenant balance
                const newInvoiceRef = db.collection('invoices').doc();
                const newInvoice = {
                    tenantId,
                    invoiceNumber: nextInvoiceNum,
                    monthRange: dateString,
                    unitId,
                    amount: rent,
                    dueDate: admin.firestore.Timestamp.fromDate(new Date(invoiceYear, invoiceMonth + 1, 1)),
                    status: 'unpaid',
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                    amountPaid: 0,
                    notes: "",
                };

                transaction.set(newInvoiceRef, newInvoice);

                // Update settings with new invoice number
                transaction.update(settingsRef, {
                    currentInvoiceNum: nextInvoiceNum,
                });

                // Update tenant balance
                if (tenantDoc.exists) {
                    const tenantData = tenantDoc.data();
                    const currentBalance = tenantData?.balance ?? 0;
                    transaction.update(tenantRef, {
                        balance: currentBalance + rent,
                    });
                } else {
                    console.warn(`Tenant ${tenantId} not found when updating balance`);
                }
            });

            invoicesCreated++;
            console.log(`Invoice created for tenant ${tenantId} and unit ${unitId}`);
            console.log(`Balance updated for tenant ${tenantId} by $${rent.toFixed(2)}`);
        }

        return {
            message: `Monthly invoices generated successfully.`,
            invoicesCreated,
        };
    } catch (error) {
        console.error('Error generating monthly invoices:', error);
        throw new HttpsError('internal', 'Internal Server Error');
    }
});

//INVOICE CRUD SECTION - CREATE
export const createInvoice = onCall(async (request) => {
    // Check auth
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'The function must be called while authenticated.');
    }
    if (request.auth.token.admin !== true) {
        throw new HttpsError('permission-denied', 'The function must be called by an admin.');
    }

    // Validate required data
    const data = request.data;
    if (!data.tenantId || !data.monthRange || !data.amount || !data.dueDate) {
        throw new HttpsError(
            'invalid-argument', 
            'The function must be called with "tenantId", "monthRange", "amount", and "dueDate" arguments.'
        );
    }

    // Validate tenant exists
    const tenantRef = db.collection('tenants').doc(data.tenantId);
    const tenantDoc = await tenantRef.get();
    if (!tenantDoc.exists) {
        throw new HttpsError('not-found', 'Tenant not found.');
    }

    // Validate amount is positive
    if (data.amount <= 0) {
        throw new HttpsError('invalid-argument', 'Amount must be greater than 0.');
    }

    try {
        const settingsRef = db.collection('settings').doc('main');
        let invoiceId: string;
        let invoiceNumber: number;

        // Use transaction to get invoice number and create invoice atomically
        await db.runTransaction(async (transaction) => {
            // READ PHASE: Get current invoice number and tenant data
            const settingsDoc = await transaction.get(settingsRef);
            const settingsData = settingsDoc.data();
            const currentInvoiceNum = settingsData?.currentInvoiceNum ?? 100;
            const nextInvoiceNum = currentInvoiceNum + 1;

            // Get tenant data within transaction for consistency
            const tenantSnapshot = await transaction.get(tenantRef);
            const tenantData = tenantSnapshot.data();
            const currentBalance = tenantData?.balance ?? 0;

            // Prepare invoice data
            const newInvoice = {
                invoiceNumber: nextInvoiceNum,
                monthRange: data.monthRange,
                tenantId: data.tenantId,
                unitId: data.unitId || null,
                amount: data.amount,
                dueDate: admin.firestore.Timestamp.fromDate(new Date(data.dueDate)),
                status: 'unpaid' as const,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                notes: data.notes || '',
                // paidDate and amountPaid are not set initially
            };

            // WRITE PHASE: Create invoice, update settings, and update tenant balance
            const invoiceRef = db.collection('invoices').doc();
            transaction.set(invoiceRef, newInvoice);
            transaction.update(settingsRef, {
                currentInvoiceNum: nextInvoiceNum,
            });
            transaction.update(tenantRef, {
                balance: currentBalance + data.amount,
            });

            // Store for return value
            invoiceId = invoiceRef.id;
            invoiceNumber = nextInvoiceNum;
        });

        return { 
            id: invoiceId!, 
            invoiceNumber: invoiceNumber!,
            success: true 
        };
    } catch (error) {
        console.error('Error creating invoice:', error);
        throw new HttpsError('internal', 'Could not create invoice.');
    }
});

//INVOICE CRUD SECTION - READ BY TENANT
export const getTenantInvoices = onCall(async (request) => {
// Check auth
if (!request.auth) {
    throw new HttpsError(
    'unauthenticated',
    'The function must be called while authenticated.'
    );
}

const {
    tenantId,
    startDate,
    endDate,
    limit = 10,
    lastDocId = null,
} = request.data;

    // 🧱 Hard validation (no accidental full scans)
    if (!tenantId) {
    return {
        invoices: [],
        lastDocId: null,
        hasMore: false,
        count: 0,
    };
    }

    if (!startDate || !endDate) {
    return {
        invoices: [],
        lastDocId: null,
        hasMore: false,
        count: 0,
    };
    }

    if (limit > 50) {
    throw new HttpsError(
        'invalid-argument',
        'Limit may not exceed 50.'
    );
    }

    let start: admin.firestore.Timestamp;
    let end: admin.firestore.Timestamp;

    try {
    start = admin.firestore.Timestamp.fromDate(new Date(startDate));
    end = admin.firestore.Timestamp.fromDate(new Date(endDate));
    } catch {
    throw new HttpsError(
        'invalid-argument',
        'Invalid date format.'
    );
    }

    try {
    let query: admin.firestore.Query = db
        .collection('invoices')
        .where('tenantId', '==', tenantId)
        .where('dueDate', '>=', start)
        .where('dueDate', '<=', end)
        .orderBy('dueDate', 'desc')
        .limit(limit + 1); // +1 to detect hasMore

    // Pagination
    if (lastDocId) {
        const lastDocSnap = await db
        .collection('invoices')
        .doc(lastDocId)
        .get();

        if (lastDocSnap.exists) {
        query = query.startAfter(lastDocSnap);
        }
    }

    const snapshot = await query.get();

    const docs = snapshot.docs.slice(0, limit);
    const hasMore = snapshot.docs.length > limit;

    const invoices = docs.map(doc => {
        const data = doc.data();
        return {
        id: doc.id,
        ...data,
        dueDate: data.dueDate?.toDate?.() ?? null, // serialize for client
        createdAt: data.createdAt?.toDate?.() ?? null,
        };
    });

    return {
        invoices,
        lastDocId: docs.length ? docs[docs.length - 1].id : null,
        hasMore,
        count: invoices.length,
    };
    } catch (error) {
    console.error('Error getting tenant invoices:', error);
    throw new HttpsError('internal', 'Could not retrieve tenant invoices.');
    }
});

//TENANT CRUD SECTION - CREATE
export const addTenant = onCall(async (request) => {
    // Check auth
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'The function must be called while authenticated.');
    }
    if (request.auth.token.admin !== true) {
        throw new HttpsError('permission-denied', 'The function must be called by an admin.');
    }

    // Validate data
    const data = request.data;
    if (!data.name || !data.phone) {
        throw new HttpsError('invalid-argument', 'The function must be called with "name" and "phone" arguments.');
    }

    try {
        const newTenant = {
            name: data.name,
            nameLower: data.name.toLowerCase(),
            email: data.email || '',
            phone: data.phone || '',
            address: data.address || '',
            notes: data.notes || '',
            units: [],
            rent: 0,
            balance: 0,
            joinDate: admin.firestore.Timestamp.now(),
        };

        const docRef = await db.collection('tenants').add(newTenant);
        return { id: docRef.id };
    } catch (error) {
        console.error('Error adding tenant:', error);
        throw new HttpsError('internal', 'Could not add tenant.');
    }
});

//TENANT CRUD SECTION - READ
export const getTenants = onCall(async (request) => {
    // Check auth
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'The function must be called while authenticated.');
    }
    if (request.auth.token.admin !== true) {
        throw new HttpsError('permission-denied', 'The function must be called by an admin.');
    }

    try {
        const snapshot = await db.collection('tenants').get();
        const tenants = snapshot.docs.map(doc => ({ 
            id: doc.id,
            name: doc.data().name,
             ...doc.data() }));

        // Sort alphabetically by name
        tenants.sort((a, b) => a.name.localeCompare(b.name));

        return tenants;
    } catch (error) {
        console.error('Error getting tenants:', error);
        throw new HttpsError('internal', 'Could not retrieve tenants.');
    }
});

//TENANT CRUD SECTION - READ BY TENANT
export const searchTenantsPaginated = onCall(async (request) => {
    // Check auth
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'The function must be called while authenticated.');
    }
    if (request.auth.token.admin !== true) {
        throw new HttpsError('permission-denied', 'The function must be called by an admin.');
    }

    // Validate data
    const data = request.data;
    const searchTerm = data.searchTerm?.trim();
    const limit = data.limit || 20;
    const lastDocId = data.lastDocId;

    // Require search term
    if (!searchTerm || searchTerm.length === 0) {
        throw new HttpsError(
            'invalid-argument', 
            'Search term is required.'
        );
    }

    // Validate limit
    if (limit < 1 || limit > 50) {
        throw new HttpsError(
            'invalid-argument', 
            'Limit must be between 1 and 50.'
        );
    }

    try {
        const tenantsRef = db.collection('tenants');
        const searchTermLower = searchTerm.toLowerCase();
        
        // Build query with range for prefix matching
        let query = tenantsRef
            .where('nameLower', '>=', searchTermLower)
            .where('nameLower', '<', searchTermLower + '\uf8ff')
            .orderBy('nameLower')
            .limit(limit + 1); // Fetch one extra to check if there are more

        // If continuing from previous page, start after last document
        if (lastDocId) {
            const lastDoc = await tenantsRef.doc(lastDocId).get();
            if (!lastDoc.exists) {
                throw new HttpsError('not-found', 'Last document not found.');
            }
            query = query.startAfter(lastDoc);
        }

        const snapshot = await query.get();
        const docs = snapshot.docs;
        
        // Check if there are more results
        const hasMore = docs.length > limit;
        const tenants = docs.slice(0, limit).map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        return {
            tenants: tenants,
            lastDocId: tenants.length > 0 ? tenants[tenants.length - 1].id : null,
            hasMore: hasMore,
            count: tenants.length
        };
    } catch (error) {
        console.error('Error searching tenants:', error);
        throw new HttpsError('internal', 'Could not search tenants.');
    }
});

//TENANT CRUD SECTION - UPDATE
export const updateTenant = onCall(async (request) => {
    // Check auth
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'The function must be called while authenticated.');
    }
    if (request.auth.token.admin !== true) {
        throw new HttpsError('permission-denied', 'The function must be called by an admin.');
    }

    // Validate data
    const { tenantId, tenantData } = request.data;
    if (!tenantId || !tenantData) {
        throw new HttpsError('invalid-argument', 'The function must be called with "tenantId" and "tenantData".');
    }

    try {
        const tenantRef = db.collection('tenants').doc(tenantId);
        await tenantRef.update(tenantData);
        return { message: 'Tenant updated successfully.' };
    } catch (error) {
        console.error('Error updating tenant:', error);
        throw new HttpsError('internal', 'Could not update tenant.');
    }
});

//TENANT CRUD SECTION - DELETE
export const deleteTenant = onCall(async (request) => {
    // Check auth
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'The function must be called while authenticated.');
    }
    if (request.auth.token.admin !== true) {
        throw new HttpsError('permission-denied', 'The function must be called by an admin.');
    }
    
    const { tenantId } = request.data;
    if (!tenantId) {
        throw new HttpsError('invalid-argument', 'The function must be called with a "tenantId" argument.');
    }
    
    const batch = db.batch();
    const tenantRef = db.collection('tenants').doc(tenantId);
    
    try {
        // Find units associated with the tenant
        const unitsSnapshot = await db.collection('units').where('tenantId', '==', tenantId).get();
        
        // Unassign tenant from each unit
        unitsSnapshot.forEach(unitDoc => {
            batch.update(unitDoc.ref, {
                status: 'available',
                tenantId: admin.firestore.FieldValue.delete(),
                startDate: admin.firestore.FieldValue.delete(),
            });
        });

        // Delete the tenant document
        batch.delete(tenantRef);
        
        await batch.commit();
        
        return { message: 'Tenant deleted and units unassigned successfully.' };
    } catch (error) {
        console.error('Error deleting tenant:', error);
        throw new HttpsError('internal', 'Could not delete tenant.');
    }
});

//PAYMENT CRUD SECTION - CREATE
export const createPayment = onCall(async (request) => {
    // Auth checks
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'The function must be called while authenticated.');
    }
    if (request.auth.token.admin !== true) {
        throw new HttpsError('permission-denied', 'The function must be called by an admin.');
    }

    // Data validation
    const { tenantId, amount, paymentMethod, invoiceIds, transactionId, notes } = request.data;
    if (!tenantId || !amount || !paymentMethod || !invoiceIds || !Array.isArray(invoiceIds)) {
        throw new HttpsError('invalid-argument', 'Missing required payment information.');
    }
    if (amount <= 0) {
        throw new HttpsError('invalid-argument', 'Payment amount must be positive.');
    }

    try {
        await db.runTransaction(async (transaction) => {
            const tenantRef = db.collection('tenants').doc(tenantId);
            const invoiceRefs = invoiceIds.map(id => db.collection('invoices').doc(id));
            
            // --- 1. READS FIRST ---
            const tenantDoc = await transaction.get(tenantRef);
            const invoiceDocs = await Promise.all(invoiceRefs.map(ref => transaction.get(ref)));

            if (!tenantDoc.exists) {
                throw new HttpsError('not-found', 'Tenant not found.');
            }

            // Validate that all invoices exist and belong to the tenant
            for (const invoiceDoc of invoiceDocs) {
                if (!invoiceDoc.exists) {
                    throw new HttpsError('not-found', `Invoice ${invoiceDoc.id} not found.`);
                }
                const invoiceData = invoiceDoc.data();
                if (invoiceData?.tenantId !== tenantId) {
                    throw new HttpsError('invalid-argument', `Invoice ${invoiceDoc.id} does not belong to tenant ${tenantId}.`);
                }
            }

            // --- 2. WRITES AFTER ---
            
            // Create the payment record
            const paymentRef = db.collection('payments').doc();
            transaction.set(paymentRef, {
                tenantId,
                amount,
                paymentMethod,
                invoiceIds,
                status: 'complete', // Default status for new payments
                paymentDate: admin.firestore.Timestamp.now(),
                ...(transactionId && { transactionId }), // Only include if provided
                ...(notes && { notes }), // Only include if provided
            });

            // Update tenant's balance using our helper function
            adjustTenantBalanceInTransaction(tenantRef, tenantDoc.data(), -amount, transaction);

            // Update the invoices
            let remainingAmountToApply = amount;

            for (const invoiceDoc of invoiceDocs) {
                if (remainingAmountToApply <= 0) break;
                
                const invoiceData = invoiceDoc.data();
                const amountDue = (invoiceData?.amount ?? 0) - (invoiceData?.amountPaid ?? 0);

                if (amountDue <= 0) continue; // Skip fully paid invoices

                const amountToApplyToInvoice = Math.min(remainingAmountToApply, amountDue);
                const newAmountPaid = (invoiceData?.amountPaid ?? 0) + amountToApplyToInvoice;
                const invoiceAmount = invoiceData?.amount ?? 0;
                
                let newStatus: string;
                const updateData: any = {
                    amountPaid: newAmountPaid,
                };

                if (newAmountPaid >= invoiceAmount) {
                    newStatus = 'paid';
                    updateData.paidDate = admin.firestore.Timestamp.now(); // Only set paidDate when fully paid
                } else if (newAmountPaid > 0) {
                    newStatus = 'partially-paid';
                    // Don't set paidDate for partially paid invoices
                } else {
                    newStatus = 'unpaid';
                }

                updateData.status = newStatus;
                
                transaction.update(invoiceDoc.ref, updateData);
                remainingAmountToApply -= amountToApplyToInvoice;
            }

            // Log if there's remaining payment amount (overpayment)
            if (remainingAmountToApply > 0) {
                console.log(`Overpayment of ${remainingAmountToApply} applied to tenant ${tenantId} balance.`);
            }
        });

        return { success: true, message: 'Payment recorded successfully.' };

    } catch (error: any) {
        console.error('Error recording payment:', error);
        if (error instanceof HttpsError) {
            throw error;
        }
        throw new HttpsError('internal', 'An internal error occurred while recording the payment.');
    }
});

// PAYMENT CRUD SECTION - READ PAYMENTS BY INVOICE ID
export const getInvoicePaymentsByInvoiceId = onCall(async (request) => {
    // Check auth
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'The function must be called while authenticated.');
    }
    if (request.auth.token.admin !== true) {
        throw new HttpsError('permission-denied', 'The function must be called by an admin.');
    }

    // Validate data
    const data = request.data;
    const invoiceId = data.invoiceId?.trim();

    // Require invoice ID
    if (!invoiceId || invoiceId.length === 0) {
        throw new HttpsError(
            'invalid-argument',
            'Invoice ID is required.'
        );
    }

    try {
        // Query payments where the invoiceIds array contains this invoice ID
        const paymentsSnapshot = await db.collection('payments')
            .where('invoiceIds', 'array-contains', invoiceId)
            .orderBy('paymentDate', 'desc')
            .get();

        // Map payments with converted timestamps
        const payments = paymentsSnapshot.docs.map(doc => {
            const paymentData = doc.data();
            
            return {
                id: doc.id,
                ...paymentData,
                // Convert Firestore Timestamps to ISO strings for JSON serialization
                paymentDate: paymentData.paymentDate?.toDate?.().toISOString() || null,
                voidedDate: paymentData.voidedDate?.toDate?.().toISOString() || null,
            };
        });

        return {
            payments: payments,
            count: payments.length
        };
    } catch (error) {
        console.error('Error fetching invoice payments:', error);
        throw new HttpsError('internal', 'Could not fetch payments for invoice.');
    }
});

// PAYMENT CRUD SECTION - VOID(DELETE)
export const voidPayment = onCall(async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'The function must be called while authenticated.');
    }
    if (request.auth.token.admin !== true) {
        throw new HttpsError('permission-denied', 'The function must be called by an admin.');
    }

    const { paymentId } = request.data;
    if (!paymentId) {
        throw new HttpsError('invalid-argument', 'Missing required payment ID.');
    }

    try {
        await db.runTransaction(async (transaction) => {
            // === READ PHASE ===
            const paymentRef = db.collection('payments').doc(paymentId);
            const paymentDoc = await transaction.get(paymentRef);

            if (!paymentDoc.exists) {
                throw new HttpsError('not-found', 'Payment not found.');
            }

            const paymentData = paymentDoc.data() as Payment;
            const { tenantId, amount, invoiceIds, status } = paymentData;

            // Check if payment is already voided
            if (status === 'void') {
                throw new HttpsError('failed-precondition', 'Payment is already voided.');
            }

            const tenantRef = db.collection('tenants').doc(tenantId);
            const tenantDoc = await transaction.get(tenantRef);

            if (!tenantDoc.exists) {
                throw new HttpsError('not-found', 'Associated tenant not found.');
            }

            let invoiceDocs: FirebaseFirestore.DocumentSnapshot[] = [];
            if (invoiceIds && invoiceIds.length > 0) {
                const invoiceRefs: FirebaseFirestore.DocumentReference[] = invoiceIds.map(
                    (id: string) => db.collection('invoices').doc(id)
                );
                const snapshots = await Promise.all(
                    invoiceRefs.map((ref: FirebaseFirestore.DocumentReference) => transaction.get(ref))
                );
                invoiceDocs = snapshots;
            }

            // === WRITE PHASE ===

            // 1. Update tenant balance (add back the voided payment amount)
            await adjustTenantBalanceInTransaction(tenantRef, tenantDoc.data(), amount, transaction);

            // 2. Update invoices - revert payment allocations
            for (const invoiceDoc of invoiceDocs) {
                if (invoiceDoc.exists) {
                    const invoiceData = invoiceDoc.data() as any;
                    const currentAmountPaid = invoiceData?.amountPaid ?? 0;
                    const invoiceAmount = invoiceData?.amount ?? 0;
                    
                    // Calculate payment allocation for this invoice
                    // For simplicity, we're distributing the payment proportionally
                    // You may want to adjust this based on your specific allocation logic
                    const totalInvoiceAmount = invoiceDocs.reduce((sum, doc) => {
                        if (doc.exists) {
                            return sum + (doc.data()?.amount ?? 0);
                        }
                        return sum;
                    }, 0);
                    
                    const allocationRatio = totalInvoiceAmount > 0 ? invoiceAmount / totalInvoiceAmount : 0;
                    const paymentAllocationForThisInvoice = Math.round(amount * allocationRatio * 100) / 100;
                    const newAmountPaid = Math.max(0, currentAmountPaid - paymentAllocationForThisInvoice);

                    // Determine new invoice status
                    let newStatus = 'unpaid';
                    if (newAmountPaid > 0) {
                        newStatus = newAmountPaid >= invoiceAmount ? 'paid' : 'partially-paid';
                    }

                    const updateData: any = {
                        amountPaid: newAmountPaid,
                        status: newStatus,
                    };

                    // Remove paidDate if invoice is no longer fully paid
                    if (newStatus !== 'paid') {
                        updateData.paidDate = admin.firestore.FieldValue.delete();
                    }

                    transaction.update(invoiceDoc.ref, updateData);
                }
            }

            // 3. Void the payment (don't delete, just mark as void)
            transaction.update(paymentRef, {
                status: 'void',
                voidedDate: admin.firestore.FieldValue.serverTimestamp(),
                voidedBy: /*request.auth.uid*/"admin", // Track who voided the payment
            });
        });

        return { success: true, message: 'Payment voided and records reverted successfully.' };

    } catch (error: any) {
        console.error('Error voiding payment:', error);
        if (error instanceof HttpsError) throw error;
        throw new HttpsError('internal', 'An internal error occurred while voiding the payment.');
    }
});

//INVOICE CRUD SECTION - READ BY INVOICE NUMBER PAGINATED
export const searchInvoicesPaginated = onCall(async (request) => {
    // Check auth
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'The function must be called while authenticated.');
    }
    if (request.auth.token.admin !== true) {
        throw new HttpsError('permission-denied', 'The function must be called by an admin.');
    }

    // Validate data
    const data = request.data;
    const searchTerm = data.searchTerm?.trim();
    const limit = data.limit || 20;
    const lastDocId = data.lastDocId;

    // Require search term
    if (!searchTerm || searchTerm.length === 0) {
        throw new HttpsError(
            'invalid-argument',
            'Search term is required.'
        );
    }

    // Validate limit
    if (limit < 1 || limit > 50) {
        throw new HttpsError(
            'invalid-argument',
            'Limit must be between 1 and 50.'
        );
    }

    try {
        const invoicesRef = db.collection('invoices');
        
        // Convert search term to number for invoice number search
        const invoiceNumber = parseInt(searchTerm, 10);
        
        // If it's not a valid number, return empty results
        if (isNaN(invoiceNumber)) {
            return {
                invoices: [],
                lastDocId: null,
                hasMore: false,
                count: 0
            };
        }

        // Build query to search by invoice number (exact match or prefix)
        // Using >= and < for range query to match invoice numbers starting with the search term
        let query = invoicesRef
            .where('invoiceNumber', '>=', invoiceNumber)
            .where('invoiceNumber', '<', invoiceNumber + Math.pow(10, Math.max(0, String(invoiceNumber).length - String(Math.floor(invoiceNumber)).length)))
            .orderBy('invoiceNumber', 'desc')
            .limit(limit + 1); // Fetch one extra to check if there are more

        // If continuing from previous page, start after last document
        if (lastDocId) {
            const lastDoc = await invoicesRef.doc(lastDocId).get();
            if (!lastDoc.exists) {
                throw new HttpsError('not-found', 'Last document not found.');
            }
            query = query.startAfter(lastDoc);
        }

        const snapshot = await query.get();
        const docs = snapshot.docs;
        
        // Check if there are more results
        const hasMore = docs.length > limit;
        const invoiceDocs = docs.slice(0, limit);

        // Get unique tenant IDs
        const tenantIds = [...new Set(invoiceDocs.map(doc => doc.data().tenantId).filter(Boolean))];
        
        // Fetch tenant data in batch
        const tenantMap = new Map();
        if (tenantIds.length > 0) {
            // Firestore 'in' query supports max 30 items, so we batch if needed
            const batchSize = 30;
            for (let i = 0; i < tenantIds.length; i += batchSize) {
                const batch = tenantIds.slice(i, i + batchSize);
                const tenantsSnapshot = await db.collection('tenants')
                    .where(admin.firestore.FieldPath.documentId(), 'in', batch)
                    .get();
                
                tenantsSnapshot.docs.forEach(doc => {
                    tenantMap.set(doc.id, {
                        name: doc.data().name,
                        email: doc.data().email
                    });
                });
            }
        }

        // Map invoices with tenant data
        const invoices = invoiceDocs.map(doc => {
            const invoiceData = doc.data();
            const tenant = tenantMap.get(invoiceData.tenantId);
            
            return {
                id: doc.id,
                ...invoiceData,
                tenantName: tenant?.name,
                tenantEmail: tenant?.email,
                // Convert Firestore Timestamps to ISO strings for JSON serialization
                dueDate: invoiceData.dueDate?.toDate?.().toISOString() || null,
                paidDate: invoiceData.paidDate?.toDate?.().toISOString() || null,
                createdAt: invoiceData.createdAt?.toDate?.().toISOString() || null,
            };
        });

        return {
            invoices: invoices,
            lastDocId: invoices.length > 0 ? invoices[invoices.length - 1].id : null,
            hasMore: hasMore,
            count: invoices.length
        };
    } catch (error) {
        console.error('Error searching invoices:', error);
        throw new HttpsError('internal', 'Could not search invoices.');
    }
});

//INVOICE CRUD SECTION - DELETE
export const deleteInvoice = onCall(async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'The function must be called while authenticated.');
    }
    if (request.auth.token.admin !== true) {
        throw new HttpsError('permission-denied', 'Only an admin can perform this action.');
    }

    const { invoiceId } = request.data;
    if (!invoiceId) {
        throw new HttpsError('invalid-argument', 'The function must be called with an "invoiceId".');
    }

    try {
        await db.runTransaction(async (transaction) => {
            const invoiceRef = db.collection('invoices').doc(invoiceId);
            const invoiceDoc = await transaction.get(invoiceRef);

            if (!invoiceDoc.exists) {
                throw new HttpsError('not-found', 'Invoice not found.');
            }

            const invoiceData = invoiceDoc.data() as any;
            const { tenantId, amount, amountPaid } = invoiceData;

            const tenantRef = db.collection('tenants').doc(tenantId);
            const tenantDoc = await transaction.get(tenantRef);
            if (!tenantDoc.exists) {
                throw new HttpsError('not-found', 'Tenant not found.');
            }
            const tenantData = tenantDoc.data();
            let tenantBalance = tenantData?.balance ?? 0;

            // 1. Find all payments linked to this invoice
            const paymentsQuery = db.collection('payments')
                .where('invoiceIds', 'array-contains', invoiceId);
            const paymentsSnap = await transaction.get(paymentsQuery);
            const payments = paymentsSnap.docs;

            // 2. For each payment:
            for (const paymentDoc of payments) {
                const paymentData = paymentDoc.data() as any;
                const paymentAmount = paymentData.amount;
                const paymentTenantId = paymentData.tenantId;
                const paymentInvoiceIds = paymentData.invoiceIds;

                // Only proceed if payment belongs to same tenant (safety)
                if (paymentTenantId === tenantId) {
                    // Add back payment amount to tenant balance
                    tenantBalance += paymentAmount;

                    // Adjust all invoices linked to this payment
                    for (const invId of paymentInvoiceIds) {
                        const invRef = db.collection('invoices').doc(invId);
                        const invDoc = await transaction.get(invRef);

                        if (invDoc.exists) {
                            const invData = invDoc.data() as any;
                            const currentAmountPaid = invData?.amountPaid ?? 0;
                            const newAmountPaid = Math.max(0, currentAmountPaid - paymentAmount);

                            let newStatus = 'unpaid';
                            if (newAmountPaid > 0 && newAmountPaid < (invData?.amount ?? 0)) {
                                newStatus = 'partially-paid';
                            }

                            transaction.update(invRef, {
                                amountPaid: newAmountPaid,
                                status: newStatus,
                                paidDate: admin.firestore.FieldValue.delete(),
                            });
                        }
                    }

                    // Update payment record - mark paymentMethod as "Invoice Deleted"
                    transaction.update(paymentDoc.ref, {
                        paymentMethod: "Invoice Deleted"
                    });
                }
            }

            // 3. Adjust tenant balance for invoice deletion (unpaid portion)
            const amountToAdjust = amount - (amountPaid ?? 0);
            tenantBalance -= amountToAdjust;

            transaction.update(tenantRef, { balance: tenantBalance });

            // 4. Delete the invoice
            transaction.delete(invoiceRef);
        });

        return { success: true, message: 'Invoice deleted, linked payments updated, and tenant balance adjusted.' };

    } catch (error: any) {
        console.error('Error deleting invoice:', error);
        if (error instanceof HttpsError) throw error;
        throw new HttpsError('internal', 'An internal error occurred while deleting the invoice.');
    }
});

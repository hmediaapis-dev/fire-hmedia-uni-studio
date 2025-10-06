
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
import { onSchedule } from "firebase-functions/v2/scheduler";
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
export const generateMonthlyInvoices = onSchedule(
    {
      schedule: '0 5 1 * *', // 5:00 AM on the 1st of every month
      timeZone: 'America/Chicago',
    },
    async (event) => {
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
  
        console.log(`Scheduled invoice generation completed: ${invoicesCreated} invoices created`);
      } catch (error) {
        console.error('Error in scheduled invoice generation:', error);
        throw error;
      }
    }
  );

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
    if (!data.name || !data.email) {
        throw new HttpsError('invalid-argument', 'The function must be called with "name" and "email" arguments.');
    }

    try {
        const newTenant = {
            name: data.name,
            email: data.email,
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
        const tenants = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        return tenants;
    } catch (error) {
        console.error('Error getting tenants:', error);
        throw new HttpsError('internal', 'Could not retrieve tenants.');
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
export const recordPayment = onCall(async (request) => {
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
            await adjustTenantBalanceInTransaction(tenantRef, tenantDoc.data(), -amount, transaction);

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
                voidedBy: /*request.auth.uid*/admin, // Track who voided the payment
            });
        });

        return { success: true, message: 'Payment voided and records reverted successfully.' };

    } catch (error: any) {
        console.error('Error voiding payment:', error);
        if (error instanceof HttpsError) throw error;
        throw new HttpsError('internal', 'An internal error occurred while voiding the payment.');
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

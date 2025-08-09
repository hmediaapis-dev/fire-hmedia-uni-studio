/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

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
//import { logger } from "firebase-functions";   //this is the v2 logger function from the firebase documentation - was using this on hellov2 log function
//import { Logging } from "@google-cloud/logging"; //helloworld v1 and v2
import * as admin from "firebase-admin";

admin.initializeApp();
const db = admin.firestore();

//Initialize logging client
/*const logging = new Logging();         //these two lines start a log
const log = logging.log("my-log");       //second line of log
const metadata = {
  resource: { type: "cloud_function", labels: { function_name: "scheduledHelloWorldV2" } },
};  //this adds granular metadata for the log

export const scheduledHelloWorldV2 = onSchedule("0 5 * * *", async (event) => {
  // Create a log entry
  const entry = log.entry(metadata, "Hello, world from scheduledHelloWorldV2");

  try {
    await log.write(entry);
    logger.log("Logged: Hello, world from scheduledHelloWorldV2");
  } catch (error) {
    logger.error("Logging error:", error);
  }
});*/

/*export const helloWorld = functions.https.onRequest(async (req, res) => {
  const entry = log.entry(metadata, 'Hello, world'); //this creates a variable to be sent to the log file my-log

  try {
    await log.write(entry);
    console.log('Logged: Hello, world');
    res.status(200).send('Hello World logged!'); //this send something to the screen
  } catch (error) {
    console.error('Logging error:', error);
    res.status(500).send('Error logging message.');
  }
});*/

export const generateMonthlyInvoices = onSchedule(
  {
    schedule: '0 5 1 * *', // 5:00 AM on the 1st of every month
    timeZone: 'America/Chicago',
  },
  async (event) => {
    const today = new Date();
    const invoiceMonth = today.getMonth(); // 0-indexed (Jan = 0)
    const invoiceYear = today.getFullYear();

    // Get all rented units
    const unitsSnapshot = await db.collection('units')
      .where('tenantId', '!=', null)
      .get();

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

      // Check if invoice already exists this month
      const invoiceQuery = await db.collection('invoices')
        .where('tenantId', '==', tenantId)
        .where('dueDate', '>=', new Date(invoiceYear, invoiceMonth, 1))
        .where('dueDate', '<', new Date(invoiceYear, invoiceMonth + 1, 1))
        .get();

      const alreadyExists = invoiceQuery.docs.some(
        (doc) => doc.data().amount === rent
      );
      if (alreadyExists) continue;

      // Create invoice
      const newInvoice = {
        tenantId,
        unitId,
        amount: rent,
        dueDate: admin.firestore.Timestamp.fromDate(new Date(invoiceYear, invoiceMonth, 1)),
        status: 'unpaid',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        amountPaid: 0,
      };

      await db.collection('invoices').add(newInvoice);
      console.log(`Invoice created for tenant ${tenantId} and unit ${unitId}`);

      // Update tenant balance in a transaction
      const tenantRef = db.collection('tenants').doc(tenantId);

      await db.runTransaction(async (transaction) => {
        const tenantDoc = await transaction.get(tenantRef);

        if (!tenantDoc.exists) {
          console.warn(`Tenant ${tenantId} not found when updating balance`);
          return;
        }

        const tenantData = tenantDoc.data();
        const currentBalance = tenantData?.balance ?? 0;

        transaction.update(tenantRef, {
          balance: currentBalance + rent,
        });
      });

      console.log(`Balance updated for tenant ${tenantId} by $${rent.toFixed(2)}`);
    }

    return;
  }
);

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

            // Create invoice
            const newInvoice = {
                tenantId,
                unitId,
                amount: rent,
                dueDate: admin.firestore.Timestamp.fromDate(new Date(invoiceYear, invoiceMonth, 1)),
                status: 'unpaid',
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                amountPaid: 0,
            };

            await db.collection('invoices').add(newInvoice);
            invoicesCreated++;
            console.log(`Invoice created for tenant ${tenantId} and unit ${unitId}`);

            // Update tenant balance in a transaction
            const tenantRef = db.collection('tenants').doc(tenantId);

            await db.runTransaction(async (transaction) => {
                const tenantDoc = await transaction.get(tenantRef);

                if (!tenantDoc.exists) {
                    console.warn(`Tenant ${tenantId} not found when updating balance`);
                    return;
                }

                const tenantData = tenantDoc.data();
                const currentBalance = tenantData?.balance ?? 0;

                transaction.update(tenantRef, {
                    balance: currentBalance + rent,
                });
            });
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

export const recordPayment = onCall(async (request) => {
    // Auth checks
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'The function must be called while authenticated.');
    }
    if (request.auth.token.admin !== true) {
        throw new HttpsError('permission-denied', 'The function must be called by an admin.');
    }

    // Data validation
    const { tenantId, amount, paymentMethod, invoiceIds } = request.data;
    if (!tenantId || !amount || !paymentMethod || !invoiceIds || !Array.isArray(invoiceIds)) {
        throw new HttpsError('invalid-argument', 'Missing required payment information.');
    }
    if (amount <= 0) {
        throw new HttpsError('invalid-argument', 'Payment amount must be positive.');
    }

    try {
        await db.runTransaction(async (transaction) => {
            const tenantRef = db.collection('tenants').doc(tenantId);
            const tenantDoc = await transaction.get(tenantRef);

            if (!tenantDoc.exists) {
                throw new HttpsError('not-found', 'Tenant not found.');
            }

            // 1. Create the payment record
            const paymentRef = db.collection('payments').doc();
            transaction.set(paymentRef, {
                ...request.data,
                paymentDate: admin.firestore.Timestamp.now(),
            });

            // 2. Update tenant's balance
            const currentBalance = tenantDoc.data()?.balance ?? 0;
            const newBalance = currentBalance - amount;
            transaction.update(tenantRef, { balance: newBalance });

            // 3. Update the invoices
            let remainingAmountToApply = amount;

            for (const invoiceId of invoiceIds) {
                if (remainingAmountToApply <= 0) break;

                const invoiceRef = db.collection('invoices').doc(invoiceId);
                const invoiceDoc = await transaction.get(invoiceRef);

                if (!invoiceDoc.exists) {
                    console.warn(`Invoice ${invoiceId} not found during payment transaction.`);
                    continue; // Skip if invoice not found
                }

                const invoiceData = invoiceDoc.data();
                const amountDue = (invoiceData?.amount ?? 0) - (invoiceData?.amountPaid ?? 0);

                if (amountDue <= 0) continue; // Skip already paid invoices

                const amountToApplyToInvoice = Math.min(remainingAmountToApply, amountDue);
                const newAmountPaid = (invoiceData?.amountPaid ?? 0) + amountToApplyToInvoice;
                
                let newStatus = invoiceData?.status;
                if (newAmountPaid >= (invoiceData?.amount ?? 0)) {
                    newStatus = 'paid';
                } else {
                    newStatus = 'partially-paid';
                }
                
                transaction.update(invoiceRef, {
                    amountPaid: newAmountPaid,
                    status: newStatus,
                    paidDate: admin.firestore.Timestamp.now(), // Update paidDate on any payment
                });

                remainingAmountToApply -= amountToApplyToInvoice;
            }
        });

        return { success: true, message: 'Payment recorded successfully.' };

    } catch (error: any) {
        // Log the full error to the console for debugging
        console.error('Error recording payment:', error);

        // If it's already a known HttpsError, rethrow it
        if (error instanceof HttpsError) {
            throw error;
        }

        // For unknown errors, throw a generic internal error
        throw new HttpsError('internal', 'An internal error occurred while recording the payment. Check function logs for details.');
    }
});

export const deletePayment = onCall(async (request) => {
    // Auth checks
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'The function must be called while authenticated.');
    }
    if (request.auth.token.admin !== true) {
        throw new HttpsError('permission-denied', 'The function must be called by an admin.');
    }

    // Data validation
    const { paymentId } = request.data;
    if (!paymentId) {
        throw new HttpsError('invalid-argument', 'Missing required payment ID.');
    }

    try {
        await db.runTransaction(async (transaction) => {
            const paymentRef = db.collection('payments').doc(paymentId);
            const paymentDoc = await transaction.get(paymentRef);

            if (!paymentDoc.exists) {
                throw new HttpsError('not-found', 'Payment not found.');
            }

            const paymentData = paymentDoc.data();
            const { tenantId, amount, invoiceIds } = paymentData as any;

            // 1. Revert tenant's balance
            const tenantRef = db.collection('tenants').doc(tenantId);
            const tenantDoc = await transaction.get(tenantRef);
            if (tenantDoc.exists) {
                const currentBalance = tenantDoc.data()?.balance ?? 0;
                transaction.update(tenantRef, { balance: currentBalance + amount });
            }

            // 2. Revert invoice statuses and amounts paid
            // This is a simplified reversal. For a real-world app, you might need more
            // complex logic to figure out which payment applied to which part of an invoice.
            for (const invoiceId of invoiceIds) {
                const invoiceRef = db.collection('invoices').doc(invoiceId);
                const invoiceDoc = await transaction.get(invoiceRef);
                if (invoiceDoc.exists) {
                    const invoiceData = invoiceDoc.data();
                    const currentAmountPaid = invoiceData?.amountPaid ?? 0;
                    
                    // Simple reversal: subtract the original payment amount from amount paid.
                    // This assumes the payment was fully applied to this invoice, which might
                    // not be true for complex scenarios but works for "Mark as Paid".
                    const newAmountPaid = Math.max(0, currentAmountPaid - amount);
                    
                    let newStatus = 'unpaid';
                    if (newAmountPaid > 0 && newAmountPaid < (invoiceData?.amount ?? 0)) {
                        newStatus = 'partially-paid';
                    } else if (newAmountPaid <= 0) {
                         newStatus = 'unpaid';
                    }
                    
                    transaction.update(invoiceRef, {
                        amountPaid: newAmountPaid,
                        status: newStatus,
                        paidDate: admin.firestore.FieldValue.delete(),
                    });
                }
            }

            // 3. Delete the payment record
            transaction.delete(paymentRef);
        });

        return { success: true, message: 'Payment deleted and records reverted successfully.' };

    } catch (error: any) {
        console.error('Error deleting payment:', error);
        if (error instanceof HttpsError) {
            throw error;
        }
        throw new HttpsError('internal', 'An internal error occurred while deleting the payment.');
    }
});

    
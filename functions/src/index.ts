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

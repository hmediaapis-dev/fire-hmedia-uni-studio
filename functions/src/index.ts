/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import {setGlobalOptions} from "firebase-functions";

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

// export const helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });

import * as functions from 'firebase-functions';
import { onSchedule } from "firebase-functions/v2/scheduler";
import { logger } from "firebase-functions";   //this is the v2 logger function from the firebase documentation
import { Logging } from "@google-cloud/logging";
import * as admin from "firebase-admin";
//import { onRequest } from "firebase-functions/https";   //it let me turn it off

admin.initializeApp();
const db = admin.firestore();

//Initialize logging client
const logging = new Logging();
const log = logging.log("my-log");
const metadata = {
  resource: { type: "cloud_function", labels: { function_name: "scheduledHelloWorldV2" } },
};  //this add granular metadata for the log

export const scheduledHelloWorldV2 = onSchedule("0 5 * * *", async (event) => {
  // Create a log entry
  const entry = log.entry(metadata, "Hello, world from scheduledHelloWorldV2");

  try {
    await log.write(entry);
    logger.log("Logged: Hello, world from scheduledHelloWorldV2");
  } catch (error) {
    logger.error("Logging error:", error);
  }
});

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

export const generateMonthlyInvoicesNow = functions.https.onRequest(async (req, res) => {
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

    res.status(200).json({
      message: `Monthly invoices generated successfully.`,
      invoicesCreated,
    });
  } catch (error) {
    console.error('Error generating monthly invoices:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

export const helloWorld = functions.https.onRequest(async (req, res) => {
  const entry = log.entry(metadata, 'Hello, world'); //this creates a variable to be sent to the log file my-log

  try {
    await log.write(entry);
    console.log('Logged: Hello, world');
    res.status(200).send('Hello World logged!'); //this send something to the screen
  } catch (error) {
    console.error('Logging error:', error);
    res.status(500).send('Error logging message.');
  }
});
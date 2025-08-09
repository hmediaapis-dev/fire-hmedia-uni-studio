import admin from "firebase-admin";

// Load service account credentials
admin.initializeApp({
  credential: admin.credential.cert("./serviceAccountKey.json")
});

/**
 * Usage:
 * node manageAdmin.js add email@example.com
 * node manageAdmin.js remove email@example.com
 * node manageAdmin.js list
 */
const [,, action, email] = process.argv;

async function setAdminStatus(email, makeAdmin) {
  try {
    const user = await admin.auth().getUserByEmail(email);

    // Update claims
    await admin.auth().setCustomUserClaims(user.uid, { admin: makeAdmin });

    console.log(
      `✅ Success! ${email} is now ${makeAdmin ? "an admin" : "no longer an admin"}.`
    );
  } catch (err) {
    console.error("❌ Error:", err.message);
    process.exit(1);
  }
}

async function listAdmins() {
  try {
    const listUsersResult = await admin.auth().listUsers(1000);
    const admins = listUsersResult.users.filter(u => u.customClaims?.admin);

    if (admins.length === 0) {
      console.log("⚠️ No admins found.");
      return;
    }

    console.log("📋 Current Admins:");
    admins.forEach(u => {
      console.log(` - ${u.email} (UID: ${u.uid})`);
    });
  } catch (err) {
    console.error("❌ Error listing admins:", err.message);
    process.exit(1);
  }
}

async function run() {
  if (action === "add") {
    if (!email) {
      console.error("Usage: node manageAdmin.js add <email>");
      process.exit(1);
    }
    await setAdminStatus(email, true);
  } else if (action === "remove") {
    if (!email) {
      console.error("Usage: node manageAdmin.js remove <email>");
      process.exit(1);
    }
    await setAdminStatus(email, false);
  } else if (action === "list") {
    await listAdmins();
  } else {
    console.error("Usage:");
    console.error("  node manageAdmin.js add <email>");
    console.error("  node manageAdmin.js remove <email>");
    console.error("  node manageAdmin.js list");
    process.exit(1);
  }
}

run();

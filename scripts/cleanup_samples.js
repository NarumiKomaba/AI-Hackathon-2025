const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");

const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || "./service-account.json";
const abs = path.isAbsolute(credPath) ? credPath : path.join(process.cwd(), credPath);
const serviceAccount = JSON.parse(fs.readFileSync(abs, "utf-8"));

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}
const db = admin.firestore();

async function cleanup() {
    console.log("Cleaning up sample documents...");

    // 1. Delete 'sampleStatus' from 'project_status'
    try {
        await db.collection("project_status").doc("sampleStatus").delete();
        console.log("- Deleted 'sampleStatus' from project_status");
    } catch (e) {
        console.warn("- Failed to delete 'sampleStatus':", e.message);
    }

    // 2. Clear any other 'dummy' or empty project documents if needed
    const snapshot = await db.collection("project_status").where("projectId", "==", "").get();
    for (const doc of snapshot.docs) {
        await doc.ref.delete();
        console.log(`- Deleted empty projectId doc: ${doc.id}`);
    }

    console.log("Cleanup complete.");
}

cleanup().catch(console.error);

const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");

const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || "./service-account.json";
const abs = path.isAbsolute(credPath) ? credPath : path.join(process.cwd(), credPath);

if (!fs.existsSync(abs)) {
    console.error("Service account file not found at:", abs);
    process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(abs, "utf-8"));

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function fetchAll() {
    console.log("Fetching all documents from 'project_status'...");
    const snapshot = await db.collection("project_status").get();

    if (snapshot.empty) {
        console.log("No documents found in 'project_status'.");
        return;
    }

    const docs = [];
    snapshot.forEach(doc => {
        docs.push({
            id: doc.id,
            data: doc.data()
        });
    });

    console.log(JSON.stringify(docs, null, 2));
}

fetchAll().then(() => process.exit(0)).catch(err => {
    console.error("Fetch failed:", err);
    process.exit(1);
});

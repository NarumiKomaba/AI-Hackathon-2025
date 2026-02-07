import { NextResponse } from "next/server";
import admin from "firebase-admin";
import fs from "node:fs";
import path from "node:path";

function initFirestoreAdmin() {
    if (admin.apps.length) return admin.firestore();
    const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    if (!credPath) throw new Error("GOOGLE_APPLICATION_CREDENTIALS is not set");
    const abs = path.isAbsolute(credPath) ? credPath : path.join(process.cwd(), credPath);
    const serviceAccount = JSON.parse(fs.readFileSync(abs, "utf-8"));
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    return admin.firestore();
}

export async function POST(req: Request) {
    try {
        const { projectId, slides, theme } = await req.json();
        const db = initFirestoreAdmin();

        const snapshot = await db.collection("project_status").where("project_id", "==", projectId).limit(1).get();

        const reportData = JSON.stringify({ slides });

        if (!snapshot.empty) {
            await db.collection("project_status").doc(snapshot.docs[0].id).update({
                progress_report: reportData,
                theme: theme || 'rpg',
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
        } else {
            await db.collection("project_status").add({
                project_id: projectId,
                progress_report: reportData,
                theme: theme || 'rpg',
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
        }

        return NextResponse.json({ success: true });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

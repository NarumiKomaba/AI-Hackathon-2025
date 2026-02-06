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

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId") || "core-system";

    try {
        const db = initFirestoreAdmin();
        const snapshot = await db.collection("project_status").where("project_id", "==", projectId).limit(1).get();

        if (snapshot.empty) {
            return NextResponse.json({ error: "Report not found" }, { status: 404 });
        }

        return NextResponse.json(snapshot.docs[0].data());
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

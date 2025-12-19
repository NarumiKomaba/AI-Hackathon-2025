// lib/firebaseAdmin.ts
import "server-only";
import admin from "firebase-admin";

const BUCKET = "ai-community-479508.firebasestorage.app"; // or envで

if (!admin.apps.length) {
  admin.initializeApp({
    storageBucket: BUCKET,
  });
}

export const adminDb = admin.firestore();

// ★ここが重要：デフォルト(bucketオプション)に依存しない
export const adminBucket = admin.storage().bucket(BUCKET);

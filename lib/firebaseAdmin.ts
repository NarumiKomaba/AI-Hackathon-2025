// lib/firebaseAdmin.ts
import admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp({
    storageBucket: "ai-community-479508.firebasestorage.app",
  });
}

export const adminDb = admin.firestore();
export const adminBucket = admin.storage().bucket();

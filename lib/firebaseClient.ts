// lib/firebaseClient.ts
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyDQD_FYfWSv8kW80nnwCBeXWLBDIUewSfM",
  authDomain: "ai-community-479508.firebaseapp.com",
  projectId: "ai-community-479508",
  storageBucket: "ai-community-479508.firebasestorage.app",
  messagingSenderId: "1008557986254",
  appId: "1:1008557986254:web:10bd84140ac52f4b471b9f",
  measurementId: "G-ZJ501PSCRG"
};

// アプリは一度だけ初期化
const app =
  getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export function getFirebaseApp() {
  return app;
}

export function getFirebaseFirestore() {
  return getFirestore(app);
}

export function getFirebaseStorage() {
  return getStorage(app);
}

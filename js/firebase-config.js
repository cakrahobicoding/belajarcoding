/* ============================================================
   firebase-config.js
   Config Firebase project "kodemulai" — sudah diisi. Kalau nanti
   ganti project, tinggal timpa nilai di bawah dengan config baru.
   ============================================================ */

const firebaseConfig = {
  apiKey: "AIzaSyBVHIL0wCvfaLUgIP-Fzgl7oEaxq5FlW3E",
  authDomain: "kodemulai-5c4e1.firebaseapp.com",
  projectId: "kodemulai-5c4e1",
  storageBucket: "kodemulai-5c4e1.firebasestorage.app",
  messagingSenderId: "427781418933",
  appId: "1:427781418933:web:425fcc0f62a7da239033fc",
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

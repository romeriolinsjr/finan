export const firebaseConfig = {
  apiKey: "AIzaSyBTx-q8xsQcqVfo03bFyqoMtfQaSua_fy4",
  authDomain: "meu-controle-financeiro-8922a.firebaseapp.com",
  projectId: "meu-controle-financeiro-8922a",
  storageBucket: "meu-controle-financeiro-8922a.firebasestorage.app",
  messagingSenderId: "696910887824",
  appId: "1:696910887824:web:210ce8f444fc8139a49115",
};

firebase.initializeApp(firebaseConfig);
export const auth = firebase.auth();
export const db = firebase.firestore();

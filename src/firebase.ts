import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

export const firebaseConfig = {
  apiKey: "AIzaSyD_8RQHLmRhruJ2t1R0iaXi4egtlBtoVt4",
  authDomain: "goosegames.firebaseapp.com",
  databaseURL:
    "https://goosegames-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "goosegames",
  storageBucket: "goosegames.firebasestorage.app",
  messagingSenderId: "79643116048",
  appId: "1:79643116048:web:7634334d1306f386ec8095",
};

export const firebaseApp = initializeApp(firebaseConfig);
export const db = getDatabase(firebaseApp);

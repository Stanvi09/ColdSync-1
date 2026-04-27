import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database"; // 1. Import the Database SDK

const firebaseConfig = {
  apiKey: "AIzaSyCkEEAOMLSv0dIO8dGRsqFKLDjBqUX7Pn4",
  authDomain: "coldsync-a2498.firebaseapp.com",
  databaseURL: "https://coldsync-a2498-default-rtdb.firebaseio.com",
  projectId: "coldsync-a2498",
  storageBucket: "coldsync-a2498.firebasestorage.app",
  messagingSenderId: "602210405395",
  appId: "1:602210405395:web:11a7db90c37ea675d983e6",
  measurementId: "G-GEF2KCPY3J"
};

// 2. Initialize Firebase
const app = initializeApp(firebaseConfig);

// 3. Initialize and Export the Database
export const db = getDatabase(app);
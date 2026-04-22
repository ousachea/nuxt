// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: "AIzaSyCsLFm2pEX0gRuJdNFCzjYfeP7Kw7dW2XY",
    authDomain: "ousanuxt.firebaseapp.com",
    projectId: "ousanuxt",
    storageBucket: "ousanuxt.firebasestorage.app",
    messagingSenderId: "252420930244",
    appId: "1:252420930244:web:d7c651640ad45df953e791",
    measurementId: "G-XRFKS9J3DX"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
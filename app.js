// ═══════════════════════════════════════════════════════════
// TRADING JOURNAL PRO - APPLICATION LOGIC
// With Firebase Cloud Sync 
// ═══════════════════════════════════════════════════════════


// ═══════════════════════════════════════════════════════════
// FIREBASE CONFIGURATION
// Replace these values with your own from Firebase Console!
// ═══════════════════════════════════════════════════════════


// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries


// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "[Credentials]",
  authDomain: "trading-journal-4aa15.firebaseapp.com",
  projectId: "trading-journal-4aa15",
  storageBucket: "trading-journal-4aa15.firebasestorage.app",
  messagingSenderId: "999346566072",
  appId: "1:999346566072:web:e169214b4daaf1a392954d"
};


// Initialize Firebase
const app = initializeApp(firebaseConfig);


// Initialize Firebase (only if config is set)
let db = null;
let auth = null;
let isFirebaseConfigured = false;


if (firebaseConfig.apiKey !== "YOUR_API_KEY") {
    firebase.initializeApp(firebaseConfig);
    db = firebase.firestore();
    auth = firebase.auth();
    isFirebaseConfigured = true;
}


class TradingJournal {
    constructor() {
        this.trades = [];
        this.settings = {
            initialBalance: 10000,
            riskPerTrade: 1,
            currency: 'USD'
        };
        this.currentScreenshots = [];
        this.currentUser = null;
        this.unsubscribeTrades = null;
        this.unsubscribeSettings = null;
        
        this.init();
    }
    
    // ═══════════════════════════════════════════════════════════
    // INITIALIZATION
    // ═══════════════════════════════════════════════════════════
    
    init() {
        this.loadLocalData();
        this.setupEventListeners();
        this.setupNavigation();
        this.setupScreenshotUpload();
        this.setupAuth();
        this.updateDashboard();
        this.renderHistoryTable();
        this.initCharts();
        this.populateSettingsForm();
    }
    

// ═══════════════════════════════════════════════════════════
// TRADING JOURNAL PRO - APPLICATION LOGIC
// With Firebase Cloud Sync
// ═══════════════════════════════════════════════════════════


// ═══════════════════════════════════════════════════════════
// FIREBASE CONFIGURATION
// Replace these values with your own from Firebase Console!
// ═══════════════════════════════════════════════════════════


const firebaseConfig = {
    apiKey: "[Credentials]",  // ← REEMPLAZA CON TU API KEY REAL
    authDomain: "trading-journal-4aa15.firebaseapp.com",
    projectId: "trading-journal-4aa15",
    storageBucket: "trading-journal-4aa15.firebasestorage.app",
    messagingSenderId: "999346566072",
    appId: "1:999346566072:web:e169214b4daaf1a392954d"
};


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
    
    loadLocalData() {
        const storedTrades = localStorage.getItem('tradingJournal_trades');
        const storedSettings = localStorage.getItem('tradingJournal_settings');
        
        if (storedTrades) {
            this.trades = JSON.parse(storedTrades);
        }
        
        if (storedSettings) {
            this.settings = { ...this.settings, ...JSON.parse(storedSettings) };
        }
    }
    

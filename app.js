// ═══════════════════════════════════════════════════════════
// TRADING JOURNAL PRO - APPLICATION LOGIC
// With Firebase Cloud Sync
// ═══════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════
// FIREBASE CONFIGURATION
// Replace these values with your own from Firebase Console!
// ═══════════════════════════════════════════════════════════

const firebaseConfig = {
    apiKey: "AIzaSyCj_xOVIK_Fgqy50WTpzAy-6DBbXw6uDY8",
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
    
    saveLocalData() {
        localStorage.setItem('tradingJournal_trades', JSON.stringify(this.trades));
        localStorage.setItem('tradingJournal_settings', JSON.stringify(this.settings));
    }
    
    // ═══════════════════════════════════════════════════════════
    // FIREBASE AUTHENTICATION
    // ═══════════════════════════════════════════════════════════
    
    setupAuth() {
        if (!isFirebaseConfigured) {
            document.getElementById('login-btn').style.display = 'none';
            this.updateSyncStatus('Local storage only');
            return;
        }
        
        // Listen for auth state changes
        auth.onAuthStateChanged((user) => {
            if (user) {
                this.currentUser = user;
                this.showLoggedInState(user);
                this.subscribeToCloudData();
            } else {
                this.currentUser = null;
                this.showLoggedOutState();
                this.unsubscribeFromCloudData();
            }
        });
        
        // Login button
        document.getElementById('login-btn').addEventListener('click', () => {
            this.signIn();
        });
        
        // Logout button
        document.getElementById('logout-btn').addEventListener('click', () => {
            this.signOut();
        });
    }
    
    async signIn() {
        try {
            const provider = new firebase.auth.GoogleAuthProvider();
            await auth.signInWithPopup(provider);
            this.showToast('Signed in successfully!', 'success');
        } catch (error) {
            console.error('Sign in error:', error);
            this.showToast('Sign in failed: ' + error.message, 'error');
        }
    }
    
    async signOut() {
        try {
            await auth.signOut();
            this.showToast('Signed out', 'success');
        } catch (error) {
            console.error('Sign out error:', error);
        }
    }
    
    showLoggedInState(user) {
        document.getElementById('login-btn').style.display = 'none';
        document.getElementById('logout-btn').style.display = 'block';
        document.getElementById('user-info').style.display = 'flex';
        document.getElementById('user-avatar').src = user.photoURL || '';
        document.getElementById('user-name').textContent = user.displayName || user.email;
    }
    
    showLoggedOutState() {
        document.getElementById('login-btn').style.display = 'block';
        document.getElementById('logout-btn').style.display = 'none';
        document.getElementById('user-info').style.display = 'none';
        this.updateSyncStatus('');
    }
    
    updateSyncStatus(message, type = '') {
        const status = document.getElementById('sync-status');
        status.textContent = message;
        status.className = 'sync-status ' + type;
    }
    
    // ═══════════════════════════════════════════════════════════
    // CLOUD DATA SYNC
    // ═══════════════════════════════════════════════════════════
    
    subscribeToCloudData() {
        if (!this.currentUser || !db) return;
        
        const userId = this.currentUser.uid;
        this.updateSyncStatus('Syncing...', 'syncing');
        
        // Subscribe to trades collection
        this.unsubscribeTrades = db
            .collection('users')
            .doc(userId)
            .collection('trades')
            .onSnapshot((snapshot) => {
                this.trades = [];
                snapshot.forEach((doc) => {
                    this.trades.push({ id: doc.id, ...doc.data() });
                });
                this.saveLocalData();
                this.updateDashboard();
                this.renderHistoryTable();
                this.updateCharts();
                this.updateSyncStatus('☁️ Synced', 'synced');
            }, (error) => {
                console.error('Trades sync error:', error);
                this.updateSyncStatus('Sync error', 'error');
            });
        
        // Subscribe to settings
        this.unsubscribeSettings = db
            .collection('users')
            .doc(userId)
            .onSnapshot((doc) => {
                if (doc.exists && doc.data().settings) {
                    this.settings = { ...this.settings, ...doc.data().settings };
                    this.saveLocalData();
                    this.populateSettingsForm();
                    this.updateDashboard();
                }
            });
    }
    
    unsubscribeFromCloudData() {
        if (this.unsubscribeTrades) {
            this.unsubscribeTrades();
            this.unsubscribeTrades = null;
        }
        if (this.unsubscribeSettings) {
            this.unsubscribeSettings();
            this.unsubscribeSettings = null;
        }
    }
    
    async saveTradeToCloud(trade) {
        if (!this.currentUser || !db) return;
        
        this.updateSyncStatus('Saving...', 'syncing');
        try {
            await db
                .collection('users')
                .doc(this.currentUser.uid)
                .collection('trades')
                .doc(trade.id)
                .set(trade);
        } catch (error) {
            console.error('Save trade error:', error);
            this.showToast('Cloud save failed', 'error');
        }
    }
    
    async deleteTradeFromCloud(tradeId) {
        if (!this.currentUser || !db) return;
        
        try {
            await db
                .collection('users')
                .doc(this.currentUser.uid)
                .collection('trades')
                .doc(tradeId)
                .delete();
        } catch (error) {
            console.error('Delete trade error:', error);
        }
    }
    
    async saveSettingsToCloud() {
        if (!this.currentUser || !db) return;
        
        try {
            await db
                .collection('users')
                .doc(this.currentUser.uid)
                .set({ settings: this.settings }, { merge: true });
        } catch (error) {
            console.error('Save settings error:', error);
        }
    }
    
    // ═══════════════════════════════════════════════════════════
    // EVENT LISTENERS
    // ═══════════════════════════════════════════════════════════
    
    setupEventListeners() {
        // Trade form submission
        document.getElementById('trade-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addTrade();
        });
        
        // Clear form button
        document.getElementById('clear-form').addEventListener('click', () => {
            this.clearTradeForm();
        });
        
        // Settings save
        document.getElementById('save-settings').addEventListener('click', () => {
            this.saveSettings();
        });
        
        // Reset all data
        document.getElementById('reset-all').addEventListener('click', () => {
            if (confirm('Are you sure you want to delete ALL your trading data? This cannot be undone!')) {
                this.resetAllData();
            }
        });
        
        // Export/Import
        document.getElementById('export-btn').addEventListener('click', () => {
            this.exportData();
        });
        
        document.getElementById('import-btn').addEventListener('click', () => {
            document.getElementById('import-file').click();
        });
        
        document.getElementById('import-file').addEventListener('change', (e) => {
            this.importData(e);
        });
        
        // Filters
        ['filter-symbol', 'filter-direction', 'filter-result', 'filter-from', 'filter-to'].forEach(id => {
            document.getElementById(id).addEventListener('input', () => {
                this.renderHistoryTable();
            });
        });
        
        document.getElementById('clear-filters').addEventListener('click', () => {
            this.clearFilters();
        });
        
        // Modal
        document.querySelector('.modal-overlay').addEventListener('click', () => {
            this.closeModal();
        });
        
        document.querySelector('.modal-close').addEventListener('click', () => {
            this.closeModal();
        });
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeModal();
            }
        });
        
        // Mobile menu toggle
        document.getElementById('menu-toggle').addEventListener('click', () => {
            document.querySelector('.sidebar').classList.toggle('open');
        });
        
        // Set default date to now
        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        document.getElementById('trade-date').value = now.toISOString().slice(0, 16);
    }
    
    // ═══════════════════════════════════════════════════════════
    // NAVIGATION
    // ═══════════════════════════════════════════════════════════
    
    setupNavigation() {
        const navItems = document.querySelectorAll('.nav-item');
        
        navItems.forEach(item => {
            item.addEventListener('click', () => {
                const tabId = item.getAttribute('data-tab');
                
                // Update nav items
                navItems.forEach(nav => nav.classList.remove('active'));
                item.classList.add('active');
                
                // Update tab content
                document.querySelectorAll('.tab-content').forEach(tab => {
                    tab.classList.remove('active');
                });
                document.getElementById(tabId).classList.add('active');
                
                // Close mobile menu
                document.querySelector('.sidebar').classList.remove('open');
            });
        });
    }
    
    // ═══════════════════════════════════════════════════════════
    // SCREENSHOT HANDLING
    // ═══════════════════════════════════════════════════════════
    
    setupScreenshotUpload() {
        const zone = document.getElementById('screenshot-zone');
        const input = document.getElementById('screenshot-input');
        
        zone.addEventListener('click', () => input.click());
        
        zone.addEventListener('dragover', (e) => {
            e.preventDefault();
            zone.classList.add('dragover');
        });
        
        zone.addEventListener('dragleave', () => {
            zone.classList.remove('dragover');
        });
        
        zone.addEventListener('drop', (e) => {
            e.preventDefault();
            zone.classList.remove('dragover');
            this.handleFiles(e.dataTransfer.files);
        });
        
        input.addEventListener('change', (e) => {
            this.handleFiles(e.target.files);
        });
    }
    
    handleFiles(files) {
        Array.from(files).forEach(file => {
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    // Compress image to reduce size for cloud storage
                    this.compressImage(e.target.result, (compressedImage) => {
                        this.currentScreenshots.push(compressedImage);
                        this.renderScreenshotPreviews();
                    });
                };
                reader.readAsDataURL(file);
            }
        });
    }
    
    compressImage(dataUrl, callback) {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const maxSize = 800; // Max width/height
            let width = img.width;
            let height = img.height;
            
            if (width > height && width > maxSize) {
                height = (height * maxSize) / width;
                width = maxSize;
            } else if (height > maxSize) {
                width = (width * maxSize) / height;
                height = maxSize;
            }
            
            canvas.width = width;
            canvas.height = height;
            
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            
            callback(canvas.toDataURL('image/jpeg', 0.7));
        };
        img.src = dataUrl;
    }
    
    renderScreenshotPreviews() {
        const container = document.getElementById('screenshot-previews');
        container.innerHTML = this.currentScreenshots.map((src, index) => `
            <div class="screenshot-preview">
                <img src="${src}" alt="Screenshot ${index + 1}">
                <button type="button" class="remove-screenshot" onclick="app.removeScreenshot(${index})">&times;</button>
            </div>
        `).join('');
    }
    
    removeScreenshot(index) {
        this.currentScreenshots.splice(index, 1);
        this.renderScreenshotPreviews();
    }
    
    // ═══════════════════════════════════════════════════════════
    // TRADE MANAGEMENT
    // ═══════════════════════════════════════════════════════════
    
    addTrade() {
        const trade = {
            id: Date.now().toString(),
            date: document.getElementById('trade-date').value,
            symbol: document.getElementById('trade-symbol').value.toUpperCase(),
            direction: document.getElementById('trade-direction').value,
            entry: parseFloat(document.getElementById('trade-entry').value),
            exit: parseFloat(document.getElementById('trade-exit').value),
            stopLoss: parseFloat(document.getElementById('trade-sl').value),
            takeProfit: parseFloat(document.getElementById('trade-tp').value) || null,
            size: parseFloat(document.getElementById('trade-size').value),
            pnl: parseFloat(document.getElementById('trade-pnl').value),
            fees: parseFloat(document.getElementById('trade-fees').value) || 0,
            strategy: document.getElementById('trade-strategy').value,
            notes: document.getElementById('trade-notes').value,
            screenshots: [...this.currentScreenshots],
            createdAt: new Date().toISOString()
        };
        
        // Calculate R:R
        trade.rr = this.calculateRR(trade);
        trade.netPnl = trade.pnl - trade.fees;
        
        // Save to cloud if logged in, otherwise local
        if (this.currentUser && db) {
            this.saveTradeToCloud(trade);
        } else {
            this.trades.push(trade);
            this.saveLocalData();
            this.updateDashboard();
            this.renderHistoryTable();
            this.updateCharts();
        }
        
        this.clearTradeForm();
        this.showToast('Trade saved successfully!', 'success');
        
        // Switch to dashboard
        document.querySelector('[data-tab="dashboard"]').click();
    }
    
    calculateRR(trade) {
        const risk = Math.abs(trade.entry - trade.stopLoss);
        if (risk === 0) return 0;
        
        const reward = Math.abs(trade.exit - trade.entry);
        let rr = reward / risk;
        
        // Determine if it's a winning or losing trade based on direction
        const isWin = (trade.direction === 'long' && trade.exit > trade.entry) ||
                      (trade.direction === 'short' && trade.exit < trade.entry);
        
        return isWin ? rr : -rr;
    }
    
    deleteTrade(id) {
        if (confirm('Are you sure you want to delete this trade?')) {
            if (this.currentUser && db) {
                this.deleteTradeFromCloud(id);
            } else {
                this.trades = this.trades.filter(t => t.id !== id);
                this.saveLocalData();
                this.updateDashboard();
                this.renderHistoryTable();
                this.updateCharts();
            }
            this.closeModal();
            this.showToast('Trade deleted', 'success');
        }
    }
    
    clearTradeForm() {
        document.getElementById('trade-form').reset();
        this.currentScreenshots = [];
        this.renderScreenshotPreviews();
        
        // Reset date to now
        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        document.getElementById('trade-date').value = now.toISOString().slice(0, 16);
    }
    
    // ═══════════════════════════════════════════════════════════
    // DASHBOARD & STATISTICS
    // ═══════════════════════════════════════════════════════════
    
    updateDashboard() {
        const stats = this.calculateStats();
        const currencySymbol = this.getCurrencySymbol();
        
        // Update stat cards
        document.getElementById('current-balance').textContent = 
            `${currencySymbol}${stats.currentBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        
        const balanceChange = ((stats.currentBalance - this.settings.initialBalance) / this.settings.initialBalance) * 100;
        const balanceChangeEl = document.getElementById('balance-change');
        balanceChangeEl.textContent = `${balanceChange >= 0 ? '+' : ''}${balanceChange.toFixed(2)}%`;
        balanceChangeEl.className = `stat-change ${balanceChange >= 0 ? 'positive' : 'negative'}`;
        
        const totalPnlEl = document.getElementById('total-pnl');
        totalPnlEl.textContent = `${stats.totalPnl >= 0 ? '+' : ''}${currencySymbol}${stats.totalPnl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        totalPnlEl.className = `stat-value ${stats.totalPnl >= 0 ? 'positive' : 'negative'}`;
        
        document.getElementById('win-rate').textContent = `${stats.winRate.toFixed(1)}%`;
        document.getElementById('wins').textContent = stats.wins;
        document.getElementById('losses').textContent = stats.losses;
        
        document.getElementById('max-drawdown').textContent = `${stats.maxDrawdown.toFixed(2)}%`;
        document.getElementById('avg-rr').textContent = stats.avgRR.toFixed(2);
        document.getElementById('total-trades').textContent = stats.totalTrades;
        
        // Update recent trades
        this.renderRecentTrades();
    }
    
    calculateStats() {
        const sortedTrades = [...this.trades].sort((a, b) => new Date(a.date) - new Date(b.date));
        
        let totalPnl = 0;
        let wins = 0;
        let losses = 0;
        let totalRR = 0;
        let peakBalance = this.settings.initialBalance;
        let maxDrawdown = 0;
        let runningBalance = this.settings.initialBalance;
        
        sortedTrades.forEach(trade => {
            const netPnl = trade.netPnl !== undefined ? trade.netPnl : (trade.pnl - (trade.fees || 0));
            totalPnl += netPnl;
            runningBalance += netPnl;
            
            if (netPnl > 0) wins++;
            else if (netPnl < 0) losses++;
            
            totalRR += trade.rr || 0;
            
            if (runningBalance > peakBalance) {
                peakBalance = runningBalance;
            }
            
            const drawdown = ((peakBalance - runningBalance) / peakBalance) * 100;
            if (drawdown > maxDrawdown) {
                maxDrawdown = drawdown;
            }
        });
        
        const totalTrades = this.trades.length;
        const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;
        const avgRR = totalTrades > 0 ? totalRR / totalTrades : 0;
        const currentBalance = this.settings.initialBalance + totalPnl;
        
        return {
            totalPnl,
            wins,
            losses,
            winRate,
            avgRR,
            maxDrawdown,
            totalTrades,
            currentBalance
        };
    }
    
    getCurrencySymbol() {
        const symbols = {
            'USD': '$',
            'EUR': '€',
            'GBP': '£',
            'JPY': '¥'
        };
        return symbols[this.settings.currency] || '$';
    }
    
    renderRecentTrades() {
        const tbody = document.getElementById('recent-trades-body');
        const recentTrades = [...this.trades]
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, 5);
        
        if (recentTrades.length === 0) {
            tbody.innerHTML = `
                <tr class="empty-row">
                    <td colspan="5">No trades yet. Start logging your trades!</td>
                </tr>
            `;
            return;
        }
        
        tbody.innerHTML = recentTrades.map(trade => {
            const netPnl = trade.netPnl !== undefined ? trade.netPnl : (trade.pnl - (trade.fees || 0));
            const pnlClass = netPnl > 0 ? 'pnl-positive' : netPnl < 0 ? 'pnl-negative' : 'pnl-neutral';
            const currencySymbol = this.getCurrencySymbol();
            
            return `
                <tr onclick="app.showTradeDetail('${trade.id}')" style="cursor: pointer;">
                    <td>${this.formatDate(trade.date)}</td>
                    <td>${trade.symbol}</td>
                    <td class="direction-${trade.direction}">${trade.direction.toUpperCase()}</td>
                    <td class="${pnlClass}">${netPnl >= 0 ? '+' : ''}${currencySymbol}${netPnl.toFixed(2)}</td>
                    <td>${trade.rr >= 0 ? '+' : ''}${trade.rr.toFixed(2)}R</td>
                </tr>
            `;
        }).join('');
    }
    
    // ═══════════════════════════════════════════════════════════
    // HISTORY TABLE
    // ═══════════════════════════════════════════════════════════
    
    renderHistoryTable() {
        const tbody = document.getElementById('history-body');
        const filteredTrades = this.getFilteredTrades();
        
        if (filteredTrades.length === 0) {
            tbody.innerHTML = `
                <tr class="empty-row">
                    <td colspan="10">No trades found</td>
                </tr>
            `;
            return;
        }
        
        const currencySymbol = this.getCurrencySymbol();
        
        tbody.innerHTML = filteredTrades
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .map(trade => {
                const netPnl = trade.netPnl !== undefined ? trade.netPnl : (trade.pnl - (trade.fees || 0));
                const pnlClass = netPnl > 0 ? 'pnl-positive' : netPnl < 0 ? 'pnl-negative' : 'pnl-neutral';
                
                return `
                    <tr>
                        <td>${this.formatDate(trade.date)}</td>
                        <td>${trade.symbol}</td>
                        <td class="direction-${trade.direction}">${trade.direction.charAt(0).toUpperCase()}</td>
                        <td>${trade.entry.toFixed(5)}</td>
                        <td>${trade.exit.toFixed(5)}</td>
                        <td>${trade.size}</td>
                        <td class="${pnlClass}">${netPnl >= 0 ? '+' : ''}${currencySymbol}${netPnl.toFixed(2)}</td>
                        <td>${trade.rr >= 0 ? '+' : ''}${trade.rr.toFixed(2)}R</td>
                        <td>${trade.strategy || '-'}</td>
                        <td>
                            <button class="btn-icon" onclick="app.showTradeDetail('${trade.id}')" title="View">👁</button>
                            <button class="btn-icon delete" onclick="app.deleteTrade('${trade.id}')" title="Delete">🗑</button>
                        </td>
                    </tr>
                `;
            }).join('');
    }
    
    getFilteredTrades() {
        let filtered = [...this.trades];
        
        const symbolFilter = document.getElementById('filter-symbol').value.toUpperCase();
        const directionFilter = document.getElementById('filter-direction').value;
        const resultFilter = document.getElementById('filter-result').value;
        const fromFilter = document.getElementById('filter-from').value;
        const toFilter = document.getElementById('filter-to').value;
        
        if (symbolFilter) {
            filtered = filtered.filter(t => t.symbol.includes(symbolFilter));
        }
        
        if (directionFilter) {
            filtered = filtered.filter(t => t.direction === directionFilter);
        }
        
        if (resultFilter) {
            filtered = filtered.filter(t => {
                const netPnl = t.netPnl !== undefined ? t.netPnl : (t.pnl - (t.fees || 0));
                if (resultFilter === 'win') return netPnl > 0;
                if (resultFilter === 'loss') return netPnl < 0;
                if (resultFilter === 'breakeven') return netPnl === 0;
                return true;
            });
        }
        
        if (fromFilter) {
            filtered = filtered.filter(t => new Date(t.date) >= new Date(fromFilter));
        }
        
        if (toFilter) {
            filtered = filtered.filter(t => new Date(t.date) <= new Date(toFilter + 'T23:59:59'));
        }
        
        return filtered;
    }
    
    clearFilters() {
        document.getElementById('filter-symbol').value = '';
        document.getElementById('filter-direction').value = '';
        document.getElementById('filter-result').value = '';
        document.getElementById('filter-from').value = '';
        document.getElementById('filter-to').value = '';
        this.renderHistoryTable();
    }
    
    // ═══════════════════════════════════════════════════════════
    // TRADE DETAIL MODAL
    // ═══════════════════════════════════════════════════════════
    
    showTradeDetail(id) {
        const trade = this.trades.find(t => t.id === id);
        if (!trade) return;
        
        const modal = document.getElementById('trade-modal');
        const body = document.getElementById('trade-modal-body');
        const netPnl = trade.netPnl !== undefined ? trade.netPnl : (trade.pnl - (trade.fees || 0));
        const pnlClass = netPnl > 0 ? 'text-profit' : netPnl < 0 ? 'text-loss' : '';
        const currencySymbol = this.getCurrencySymbol();
        
        body.innerHTML = `
            <div class="trade-detail-grid">
                <div class="trade-detail-item">
                    <div class="label">Date & Time</div>
                    <div class="value">${this.formatDateTime(trade.date)}</div>
                </div>
                <div class="trade-detail-item">
                    <div class="label">Symbol</div>
                    <div class="value">${trade.symbol}</div>
                </div>
                <div class="trade-detail-item">
                    <div class="label">Direction</div>
                    <div class="value direction-${trade.direction}">${trade.direction.toUpperCase()}</div>
                </div>
                <div class="trade-detail-item">
                    <div class="label">Entry</div>
                    <div class="value">${trade.entry}</div>
                </div>
                <div class="trade-detail-item">
                    <div class="label">Exit</div>
                    <div class="value">${trade.exit}</div>
                </div>
                <div class="trade-detail-item">
                    <div class="label">Stop Loss</div>
                    <div class="value">${trade.stopLoss}</div>
                </div>
                <div class="trade-detail-item">
                    <div class="label">Take Profit</div>
                    <div class="value">${trade.takeProfit || '-'}</div>
                </div>
                <div class="trade-detail-item">
                    <div class="label">Position Size</div>
                    <div class="value">${trade.size}</div>
                </div>
                <div class="trade-detail-item">
                    <div class="label">Gross P&L</div>
                    <div class="value">${currencySymbol}${trade.pnl.toFixed(2)}</div>
                </div>
                <div class="trade-detail-item">
                    <div class="label">Fees</div>
                    <div class="value">${currencySymbol}${(trade.fees || 0).toFixed(2)}</div>
                </div>
                <div class="trade-detail-item">
                    <div class="label">Net P&L</div>
                    <div class="value ${pnlClass}">${netPnl >= 0 ? '+' : ''}${currencySymbol}${netPnl.toFixed(2)}</div>
                </div>
                <div class="trade-detail-item">
                    <div class="label">R:R</div>
                    <div class="value">${trade.rr >= 0 ? '+' : ''}${trade.rr.toFixed(2)}R</div>
                </div>
            </div>
            
            ${trade.strategy ? `
                <div class="trade-detail-item" style="margin-bottom: 1rem;">
                    <div class="label">Strategy</div>
                    <div class="value">${trade.strategy}</div>
                </div>
            ` : ''}
            
            ${trade.notes ? `
                <div class="trade-notes-section" style="margin-bottom: 1.5rem;">
                    <h4>Trade Notes</h4>
                    <p>${trade.notes}</p>
                </div>
            ` : ''}
            
            ${trade.screenshots && trade.screenshots.length > 0 ? `
                <div class="trade-screenshots-section">
                    <h4>Screenshots</h4>
                    <div class="trade-screenshots-grid">
                        ${trade.screenshots.map((src, i) => `
                            <div class="trade-screenshot" onclick="window.open('${src}', '_blank')">
                                <img src="${src}" alt="Screenshot ${i + 1}">
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}
            
            <div style="margin-top: 1.5rem; display: flex; gap: 1rem; justify-content: flex-end;">
                <button class="btn-danger" onclick="app.deleteTrade('${trade.id}')">Delete Trade</button>
            </div>
        `;
        
        modal.classList.add('active');
    }
    
    closeModal() {
        document.getElementById('trade-modal').classList.remove('active');
    }
    
    // ═══════════════════════════════════════════════════════════
    // CHARTS
    // ═══════════════════════════════════════════════════════════
    
    initCharts() {
        this.equityChart = null;
        this.monthlyChart = null;
        this.updateCharts();
    }
    
    updateCharts() {
        this.drawEquityChart();
        this.drawMonthlyChart();
    }
    
    drawEquityChart() {
        const canvas = document.getElementById('equity-canvas');
        const ctx = canvas.getContext('2d');
        const container = canvas.parentElement;
        
        // Set canvas size
        canvas.width = container.offsetWidth;
        canvas.height = container.offsetHeight;
        
        const sortedTrades = [...this.trades].sort((a, b) => new Date(a.date) - new Date(b.date));
        
        if (sortedTrades.length < 2) {
            ctx.fillStyle = '#64748b';
            ctx.font = '14px Outfit';
            ctx.textAlign = 'center';
            ctx.fillText('Add more trades to see the equity curve', canvas.width / 2, canvas.height / 2);
            return;
        }
        
        // Calculate equity curve data
        let balance = this.settings.initialBalance;
        const data = [{ x: 0, y: balance }];
        
        sortedTrades.forEach((trade, i) => {
            const netPnl = trade.netPnl !== undefined ? trade.netPnl : (trade.pnl - (trade.fees || 0));
            balance += netPnl;
            data.push({ x: i + 1, y: balance });
        });
        
        const padding = { top: 20, right: 20, bottom: 30, left: 70 };
        const chartWidth = canvas.width - padding.left - padding.right;
        const chartHeight = canvas.height - padding.top - padding.bottom;
        
        const minY = Math.min(...data.map(d => d.y)) * 0.98;
        const maxY = Math.max(...data.map(d => d.y)) * 1.02;
        const yRange = maxY - minY;
        
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw grid lines
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.1)';
        ctx.lineWidth = 1;
        
        for (let i = 0; i <= 5; i++) {
            const y = padding.top + (i / 5) * chartHeight;
            ctx.beginPath();
            ctx.moveTo(padding.left, y);
            ctx.lineTo(canvas.width - padding.right, y);
            ctx.stroke();
            
            // Y-axis labels
            const value = maxY - (i / 5) * yRange;
            ctx.fillStyle = '#64748b';
            ctx.font = '11px JetBrains Mono';
            ctx.textAlign = 'right';
            ctx.fillText(`$${value.toFixed(0)}`, padding.left - 10, y + 4);
        }
        
        // Draw the line
        const gradient = ctx.createLinearGradient(0, padding.top, 0, canvas.height - padding.bottom);
        gradient.addColorStop(0, 'rgba(0, 212, 170, 0.3)');
        gradient.addColorStop(1, 'rgba(0, 212, 170, 0)');
        
        // Fill area
        ctx.beginPath();
        data.forEach((point, i) => {
            const x = padding.left + (point.x / (data.length - 1)) * chartWidth;
            const y = padding.top + ((maxY - point.y) / yRange) * chartHeight;
            
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });
        ctx.lineTo(padding.left + chartWidth, canvas.height - padding.bottom);
        ctx.lineTo(padding.left, canvas.height - padding.bottom);
        ctx.closePath();
        ctx.fillStyle = gradient;
        ctx.fill();
        
        // Draw line
        ctx.beginPath();
        data.forEach((point, i) => {
            const x = padding.left + (point.x / (data.length - 1)) * chartWidth;
            const y = padding.top + ((maxY - point.y) / yRange) * chartHeight;
            
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });
        ctx.strokeStyle = '#00d4aa';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Draw points
        data.forEach((point) => {
            const x = padding.left + (point.x / (data.length - 1)) * chartWidth;
            const y = padding.top + ((maxY - point.y) / yRange) * chartHeight;
            
            ctx.beginPath();
            ctx.arc(x, y, 3, 0, Math.PI * 2);
            ctx.fillStyle = '#00d4aa';
            ctx.fill();
        });
    }
    
    drawMonthlyChart() {
        const canvas = document.getElementById('monthly-canvas');
        const ctx = canvas.getContext('2d');
        const container = canvas.parentElement;
        
        canvas.width = container.offsetWidth;
        canvas.height = container.offsetHeight;
        
        // Group trades by month
        const monthlyData = {};
        this.trades.forEach(trade => {
            const date = new Date(trade.date);
            const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            const netPnl = trade.netPnl !== undefined ? trade.netPnl : (trade.pnl - (trade.fees || 0));
            
            if (!monthlyData[key]) {
                monthlyData[key] = 0;
            }
            monthlyData[key] += netPnl;
        });
        
        const months = Object.keys(monthlyData).sort();
        
        if (months.length === 0) {
            ctx.fillStyle = '#64748b';
            ctx.font = '14px Outfit';
            ctx.textAlign = 'center';
            ctx.fillText('No data available', canvas.width / 2, canvas.height / 2);
            return;
        }
        
        const values = months.map(m => monthlyData[m]);
        const maxAbs = Math.max(...values.map(Math.abs)) * 1.1;
        
        const padding = { top: 20, right: 20, bottom: 40, left: 70 };
        const chartWidth = canvas.width - padding.left - padding.right;
        const chartHeight = canvas.height - padding.top - padding.bottom;
        const barWidth = Math.min(40, chartWidth / months.length - 10);
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw zero line
        const zeroY = padding.top + chartHeight / 2;
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.3)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(padding.left, zeroY);
        ctx.lineTo(canvas.width - padding.right, zeroY);
        ctx.stroke();
        
        // Draw bars
        months.forEach((month, i) => {
            const value = monthlyData[month];
            const barHeight = (Math.abs(value) / maxAbs) * (chartHeight / 2);
            const x = padding.left + (i + 0.5) * (chartWidth / months.length) - barWidth / 2;
            const y = value >= 0 ? zeroY - barHeight : zeroY;
            
            ctx.fillStyle = value >= 0 ? '#00d4aa' : '#ef4444';
            ctx.beginPath();
            ctx.roundRect(x, y, barWidth, barHeight, 4);
            ctx.fill();
            
            // Month label
            ctx.fillStyle = '#64748b';
            ctx.font = '10px JetBrains Mono';
            ctx.textAlign = 'center';
            const [year, mon] = month.split('-');
            ctx.fillText(`${mon}/${year.slice(2)}`, x + barWidth / 2, canvas.height - padding.bottom + 15);
            
            // Value label
            ctx.fillStyle = value >= 0 ? '#00d4aa' : '#ef4444';
            ctx.font = '10px JetBrains Mono';
            const labelY = value >= 0 ? y - 5 : y + barHeight + 12;
            ctx.fillText(`$${value.toFixed(0)}`, x + barWidth / 2, labelY);
        });
    }
    
    // ═══════════════════════════════════════════════════════════
    // SETTINGS
    // ═══════════════════════════════════════════════════════════
    
    populateSettingsForm() {
        document.getElementById('initial-balance').value = this.settings.initialBalance;
        document.getElementById('risk-per-trade').value = this.settings.riskPerTrade;
        document.getElementById('currency').value = this.settings.currency;
    }
    
    saveSettings() {
        this.settings.initialBalance = parseFloat(document.getElementById('initial-balance').value) || 10000;
        this.settings.riskPerTrade = parseFloat(document.getElementById('risk-per-trade').value) || 1;
        this.settings.currency = document.getElementById('currency').value;
        
        this.saveLocalData();
        
        if (this.currentUser && db) {
            this.saveSettingsToCloud();
        }
        
        this.updateDashboard();
        this.updateCharts();
        this.showToast('Settings saved!', 'success');
    }
    
    async resetAllData() {
        // Clear cloud data if logged in
        if (this.currentUser && db) {
            const userId = this.currentUser.uid;
            const tradesRef = db.collection('users').doc(userId).collection('trades');
            const snapshot = await tradesRef.get();
            const batch = db.batch();
            snapshot.docs.forEach(doc => batch.delete(doc.ref));
            await batch.commit();
            await db.collection('users').doc(userId).delete();
        }
        
        this.trades = [];
        this.settings = {
            initialBalance: 10000,
            riskPerTrade: 1,
            currency: 'USD'
        };
        
        localStorage.removeItem('tradingJournal_trades');
        localStorage.removeItem('tradingJournal_settings');
        
        this.populateSettingsForm();
        this.updateDashboard();
        this.renderHistoryTable();
        this.updateCharts();
        
        this.showToast('All data has been reset', 'success');
    }
    
    // ═══════════════════════════════════════════════════════════
    // IMPORT/EXPORT
    // ═══════════════════════════════════════════════════════════
    
    exportData() {
        const data = {
            version: '1.0',
            exportDate: new Date().toISOString(),
            settings: this.settings,
            trades: this.trades
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `trading-journal-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        
        URL.revokeObjectURL(url);
        this.showToast('Data exported successfully!', 'success');
    }
    
    async importData(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const data = JSON.parse(event.target.result);
                
                if (data.trades && Array.isArray(data.trades)) {
                    // If logged in, upload to cloud
                    if (this.currentUser && db) {
                        for (const trade of data.trades) {
                            await this.saveTradeToCloud(trade);
                        }
                    } else {
                        this.trades = data.trades;
                    }
                }
                
                if (data.settings) {
                    this.settings = { ...this.settings, ...data.settings };
                    if (this.currentUser && db) {
                        await this.saveSettingsToCloud();
                    }
                }
                
                this.saveLocalData();
                this.populateSettingsForm();
                this.updateDashboard();
                this.renderHistoryTable();
                this.updateCharts();
                
                this.showToast(`Imported ${data.trades?.length || 0} trades successfully!`, 'success');
            } catch (err) {
                this.showToast('Error importing data. Please check the file format.', 'error');
                console.error('Import error:', err);
            }
        };
        reader.readAsText(file);
        
        // Reset input
        e.target.value = '';
    }
    
    // ═══════════════════════════════════════════════════════════
    // UTILITIES
    // ═══════════════════════════════════════════════════════════
    
    formatDate(dateStr) {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: '2-digit'
        });
    }
    
    formatDateTime(dateStr) {
        const date = new Date(dateStr);
        return date.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
    
    showToast(message, type = 'success') {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.className = `toast ${type} show`;
        
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }
}

// Initialize app
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new TradingJournal();
});

// Handle window resize for charts
window.addEventListener('resize', () => {
    if (app) {
        app.updateCharts();
    }
});

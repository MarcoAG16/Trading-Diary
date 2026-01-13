# Trading Journal Pro

A professional, responsive trading journal web application for tracking your trading operations. Built with vanilla HTML, CSS, and JavaScript - perfect for GitHub Pages hosting.

## Features

- **Dashboard Overview**: Real-time stats including balance, P&L, win rate, max drawdown, and average R:R
- **Trade Logging**: Record entries with full details (symbol, direction, entry/exit, SL/TP, position size)
- **Screenshot Support**: Attach trade screenshots for visual review
- **Equity Curve**: Visual representation of your account growth
- **Monthly Performance**: Bar chart showing monthly P&L
- **Trade History**: Filterable table with all recorded trades
- **Data Persistence**: All data stored locally in your browser (localStorage)
- **Import/Export**: Backup and restore your data as JSON files
- **Responsive Design**: Works on desktop, tablet, and mobile devices

## Metrics Tracked

- Account Balance
- Total P&L (Profit & Loss)
- Win Rate
- Maximum Drawdown
- Risk:Reward Ratio (R:R)
- Total Trades Count
- Per-trade details (entry, exit, SL, TP, fees, notes)

## Deploying to GitHub Pages

1. Create a new repository on GitHub
2. Push this code to your repository:
   ```bash
   git init
   git add .
   git commit -m "Initial commit - Trading Journal"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
   git push -u origin main
   ```
3. Go to your repository Settings → Pages
4. Under "Source", select "Deploy from a branch"
5. Select the `main` branch and `/ (root)` folder
6. Click Save
7. Your site will be live at `https://YOUR_USERNAME.github.io/YOUR_REPO/`

## Local Usage

Simply open `index.html` in your browser. No server required!

## Data Storage

All your trading data is stored in your browser's localStorage. This means:
- ✅ Data persists across sessions
- ✅ No account or login required
- ✅ Complete privacy - data never leaves your device
- ⚠️ Clearing browser data will delete your trades
- ⚠️ Data is browser-specific (won't sync across devices)

**Tip**: Use the Export feature regularly to backup your data!

## File Structure

```
├── index.html    # Main HTML structure
├── styles.css    # All styling (responsive design)
├── app.js        # Application logic and data management
└── README.md     # This file
```

## Browser Support

- Chrome (recommended)
- Firefox
- Safari
- Edge

## License

MIT License - Feel free to modify and use for your personal trading journal. 



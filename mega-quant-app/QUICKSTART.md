# 🚀 MEGA QUANT - Quick Start Guide

## Table of Contents
- [First Time Setup](#first-time-setup)
- [Starting the App](#starting-the-app)
- [Starting from Scratch](#starting-from-scratch)
- [Security Setup](#security-setup)
- [Development Workflow](#development-workflow)
- [Troubleshooting](#troubleshooting)

---

## First Time Setup

### Prerequisites
- **Node.js** v22+ installed
- **npm** package manager

### Installation

```bash
# 1. Navigate to the project directory
cd mega-quant-app

# 2. Install dependencies (one time only)
npm install

# 3. Install backend dependencies
cd backend
npm install
cd ..

# That's it! You're ready to run the app.
```

---

## Starting the App

### Single Command (Recommended)

```bash
npm start
```

This automatically:
1. Starts the backend API (port 3001)
2. Starts the frontend dev server (port 5173)
3. Launches the Electron desktop app
4. Auto-creates the database on first run

### Manual Start (Alternative)

If you prefer separate terminals for debugging:

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
npm run dev
```

**Terminal 3 - Electron:**
```bash
# Wait for both servers to start, then:
npx electron .
```

---

## Starting from Scratch

### Stop All Running Processes

```bash
# Kill all node and tsx processes
killall -9 node tsx 2>/dev/null

# Or kill specific ports
lsof -ti:3001 | xargs kill  # Backend
lsof -ti:5173 | xargs kill  # Frontend
```

### Reset Database (Fresh Start)

```bash
# macOS
rm -f ~/Library/Application\ Support/MEGA\ QUANT/database/megaquant.db

# Windows (PowerShell)
Remove-Item "$env:APPDATA\MEGA QUANT\database\megaquant.db" -Force

# Linux
rm -f ~/.megaquant/database/megaquant.db
```

### Clean Install

```bash
# 1. Stop all processes
killall -9 node tsx 2>/dev/null

# 2. Remove node_modules and reinstall
rm -rf node_modules backend/node_modules
npm install
cd backend && npm install && cd ..

# 3. Remove database (if you want fresh start)
rm -f ~/Library/Application\ Support/MEGA\ QUANT/database/megaquant.db

# 4. Start fresh
npm start
```

---

## Security Setup

### First Launch - Password Setup

1. When you first run the app, you'll see the **"SECURE YOUR VAULT"** modal
2. Create a master password with these requirements:
   - Minimum 8 characters
   - At least one uppercase letter
   - At least one lowercase letter
   - At least one number
   - At least one special character (!@#$%^&*)
3. Confirm your password
4. Click **"SECURE MY DATA"**

**⚠️ IMPORTANT**: Write down your password! If you forget it, you'll need to reset the app and lose all data.

### Subsequent Launches - Unlock

1. When you reopen the app, you'll see the **"UNLOCK VAULT"** modal
2. Enter your master password
3. Click **"UNLOCK"**
4. Your encrypted data is decrypted and loaded

### Forgot Password - Reset App

If you forgot your password:

1. Click **"Forgot your password?"** on unlock screen
2. Confirm you want to delete all data
3. App resets to fresh state
4. You can set up a new password

---

## Development Workflow

### Daily Development

```bash
# Start everything in dev mode
npm start

# The app opens with DevTools enabled for debugging
```

### Component Development (Storybook)

```bash
# In the mega-quant component library
cd ../mega-quant
npm run storybook
```

### Building for Production

```bash
# Create installer packages
npm run build

# Creates:
# - macOS: release/MEGA QUANT.dmg
# - Windows: release/MEGA QUANT Setup.exe
# - Linux: release/MEGA QUANT.AppImage
```

### Development vs Production

**Development Mode** (`npm start`):
- DevTools auto-open
- Hot reload enabled
- Detailed error messages
- Source maps available

**Production Mode** (`npm run build`):
- No DevTools
- Optimized bundles
- Minified code
- Single installer file

---

## Troubleshooting

### Port Already in Use

```bash
# Kill processes on specific ports
lsof -ti:3001 | xargs kill  # Backend
lsof -ti:5173 | xargs kill  # Frontend

# Or kill all node processes
killall -9 node tsx

# Then restart
npm start
```

### Database Issues

```bash
# Check database location
# macOS:
ls -la ~/Library/Application\ Support/MEGA\ QUANT/database/

# Reset database (deletes all data!)
rm -f ~/Library/Application\ Support/MEGA\ QUANT/database/megaquant.db

# Restart app - new database created automatically
npm start
```

### Dependencies Issues

```bash
# Clean install
rm -rf node_modules backend/node_modules
npm install
cd backend && npm install && cd ..

# Try again
npm start
```

### Backend Won't Start

```bash
# Check if port 3001 is available
lsof -ti:3001

# Kill process if needed
lsof -ti:3001 | xargs kill

# Check backend logs
cd backend
npm run dev
# Look for error messages in console
```

### Electron App Won't Open

```bash
# Make sure both servers are running first
# 1. Check backend: http://localhost:3001
# 2. Check frontend: http://localhost:5173

# Then start Electron
npx electron .
```

### Modal Not Appearing (Security Setup)

```bash
# 1. Open DevTools Console (Cmd+Option+I or Ctrl+Shift+I)
# 2. Look for [Security] messages
# 3. Check for any errors

# If database has old data, reset it:
rm -f ~/Library/Application\ Support/MEGA\ QUANT/database/megaquant.db
npm start
```

### Certificate Trust Store Warning (macOS)

Error: `ERROR:trust_store_mac.cc(750)] Error parsing certificate`

**This is harmless!** It's a macOS system warning and can be ignored.

---

## Quick Test

Verify everything works:

```bash
# 1. Start the app
npm start

# 2. Set up your master password (first time)
# 3. Add a test wallet (optional)
# 4. Create a test strategy
# 5. Close the app

# 6. Restart the app
npm start

# 7. Enter your password to unlock
# 8. Verify your strategy is still there ✅
```

---

## Data Locations

### Database

**macOS:**
```
~/Library/Application Support/MEGA QUANT/database/megaquant.db
```

**Windows:**
```
C:\Users\YourName\AppData\Roaming\MEGA QUANT\database\megaquant.db
```

**Linux:**
```
~/.megaquant/database/megaquant.db
```

### What's Stored

- ✅ Wallet accounts (encrypted)
- ✅ API keys (encrypted)
- ✅ Trading strategies
- ✅ Execution history
- ✅ Portfolio data
- ✅ Network configurations (encrypted custom RPCs)

All sensitive data is encrypted with AES-256-GCM using your master password.

---

## Architecture Overview

```
┌─────────────────────────────────────────┐
│         Electron Desktop App            │
│  ┌───────────────────────────────────┐  │
│  │  React Frontend (Port 5173)       │  │
│  │  - CyberpunkDashboard UI          │  │
│  │  - Strategy Editor (Monaco)       │  │
│  │  - Security Modals                │  │
│  └──────────┬────────────────────────┘  │
│             │ IPC (window.electronAPI)  │
│  ┌──────────▼────────────────────────┐  │
│  │  Main Process                     │  │
│  │  - IPC Handlers                   │  │
│  │  - Security Management            │  │
│  │  - Backend API Proxy              │  │
│  └──────────┬────────────────────────┘  │
└─────────────┼──────────────────────────┘
              │ HTTP (axios)
   ┌──────────▼─────────────┐
   │  Backend API (3001)    │
   │  - Express.js          │
   │  - Security Routes     │
   │  - Config Routes       │
   │  - Strategy Routes     │
   └──────────┬─────────────┘
              │
   ┌──────────▼─────────────┐
   │  SQLite Database       │
   │  - Auto-created file   │
   │  - Encrypted columns   │
   │  - Zero-config setup   │
   └────────────────────────┘
```

---

## Key Features

### Zero-Configuration Database
- ✅ SQLite auto-creates on first run
- ✅ No PostgreSQL/MySQL installation needed
- ✅ No database configuration required
- ✅ Portable single-file storage

### Password-Based Encryption
- ✅ AES-256-GCM encryption
- ✅ PBKDF2 key derivation (100,000 iterations)
- ✅ All private keys encrypted
- ✅ All API keys encrypted
- ✅ Master password never stored

### Non-Blocking Architecture
- ✅ Web workers for strategy execution
- ✅ Async IPC handlers
- ✅ React state management
- ✅ Responsive UI

### Cross-Platform
- ✅ macOS
- ✅ Windows
- ✅ Linux

---

## Example Strategy

```javascript
async function tradingStrategy() {
  console.log('▶ Strategy started...');

  // Get wallet for Ethereum (chain ID: 1)
  const wallet = mqApi.getWallet(1);
  console.log('Wallet:', wallet.address);

  // Get balance
  const balance = await mqApi.getBalance('ETH', 1);
  console.log('Balance:', balance, 'ETH');

  // Technical analysis
  const prices = [100, 102, 101, 105, 107, 110];
  const rsi = ta.RSI.calculate({ period: 14, values: prices });

  if (rsi[rsi.length - 1] < 30) {
    console.log('✓ OVERSOLD - Consider buying');
  } else if (rsi[rsi.length - 1] > 70) {
    console.log('✕ OVERBOUGHT - Consider selling');
  }

  console.log('✓ Strategy completed');
}

tradingStrategy()
  .then(() => console.log('✓ Done'))
  .catch(err => console.error('✕ Error:', err.message));
```

---

## Next Steps

1. **Configure your API keys**: Add Alchemy, Etherscan keys in the app
2. **Add wallet accounts**: Use the Account Manager
3. **Create strategies**: Click "Deploy Strategy" button
4. **Check the Docs tab**: Full API documentation and examples in the app
5. **Build for distribution**: `npm run build`

---

## Summary

### Getting Started
```bash
# Install once
npm install && cd backend && npm install && cd ..

# Run anytime
npm start
```

### Start from Scratch
```bash
# Kill all processes
killall -9 node tsx 2>/dev/null

# Reset database
rm -f ~/Library/Application\ Support/MEGA\ QUANT/database/megaquant.db

# Clean install
rm -rf node_modules backend/node_modules
npm install && cd backend && npm install && cd ..

# Start fresh
npm start
```

---

**Questions?** Check the Docs tab in the app for full API documentation.

**Happy Trading!** 🚀

# Quick Start Guide 🚀

Complete setup in under 5 minutes!

## 📦 Prerequisites

- Node.js v16+ ([Download](https://nodejs.org))
- npm (included with Node.js)
- Mero Share account credentials

## ⚡ 3-Step Setup (5 minutes)

### Step 1️⃣: Install Dependencies

```bash
cd ipo-bulk-applier
npm install
```

**Expected output:**
```
added 150 packages in 45s
```

### Step 2️⃣: Start the Server

```bash
npm start
```

**Expected output:**
```
✓ IPO Bulk Applier server running at http://localhost:3000
✓ Ready to accept connections
```

### Step 3️⃣: Open in Browser

Navigate to: **http://localhost:3000**

You should see the web application with two tabs:
- 📝 **Manage Accounts** 
- 🚀 **Bulk Apply**

---

## 💾 First-Time Setup

### Add Your First Account

1. Click **"Add New Account"** button
2. Fill in your details:

| Field | Example | Notes |
|-------|---------|-------|
| **Account Name** | Mom's Account | Friendly name for reference |
| **DP ID** | 18200 | Your Depository Participant number |
| **Username** | user@example.com | Your Mero Share login |
| **Password** | •••••••••• | Your Mero Share password |
| **CRN Number** | 08314100719564000001 | Full 20-digit account number |
| **PIN 1** | 2227 | Primary transaction PIN |
| **PIN 2** | 6406 | Backup PIN (optional) |

3. Click **"Save Account"** ✓

**Note:** CRN is extracted automatically from digits 6-14 of your account number.

### Add More Accounts (Optional)

Repeat the above for each additional account.

### Apply for IPOs

1. Click **"Bulk Apply"** tab
2. Enter **IPO Quantity** (e.g., 10 shares)
3. Check ☑️ accounts to apply with
4. Click **"Start Bulk Application"** ▶️
5. Watch the browser window apply automatically
6. View results when complete ✓

---

## 📚 What Happens During Application?

1. **Login** → Logs into your Mero Share account
2. **Navigate** → Goes to ASBA page with available IPOs
3. **Filter** → Shows only IPO type "Ordinary Shares"
4. **Apply** → For each IPO:
   - Selects bank (first available)
   - Selects account (first available)
   - Enters quantity
   - Enters CRN (auto-extracted)
   - Enters PIN 1 (or tries PIN 2 if wrong)
   - Verifies success
5. **Report** → Shows detailed results (✓ success, ✗ failed)

---

## 🆘 Troubleshooting

### Port 3000 Already in Use

```bash
# Use different port
PORT=3001 npm start

# Then go to http://localhost:3001
```

### Chrome/Chromium Not Found

```bash
npm install puppeteer
```

### Accounts Not Persisting

- Check if browser is clearing localStorage
- Browser Settings → Privacy → Clear cache → Never
- Try private/incognito mode

### Application Fails at Login

- Verify Mero Share website is accessible
- Check username/password are correct
- Ensure account is not locked

### PIN Verification Fails

- Verify PIN 1 is correct
- Add PIN 2 as backup
- Make sure PINs are for your account

---

## 🚀 Next Steps

### Deploy to Vercel (Recommended)

```bash
# 1. Push to GitHub
git add .
git commit -m "Initial commit"
git push origin main

# 2. Go to vercel.com
# 3. Click "Add New Project"
# 4. Select your GitHub repository
# 5. Click "Deploy"

# That's it! App is live! 🎉
```

See [DEPLOYMENT.md](DEPLOYMENT.md) for other deployment options.

### Configure Environment

Create `.env` file for production:

```env
NODE_ENV=production
PORT=3000
```

### Monitor Application

```bash
# Check if server is running
curl http://localhost:3000/api/health

# View logs
npm start  # See console output
```

---

## 📖 More Documentation

- **[README.md](README.md)** - Full feature list and API reference
- **[DEPLOYMENT.md](DEPLOYMENT.md)** - Deploy to Vercel, Docker, Railway, etc.
- **[SECURITY.md](SECURITY.md)** - Security best practices
- **[CONTRIBUTING.md](CONTRIBUTING.md)** - How to contribute to the project

---

## 💡 Tips & Tricks

### Bulk Adding Accounts

If you have multiple accounts, use a script to auto-populate:

```javascript
// In browser console:
const accounts = [
  { name: 'Mom', dp: 18200, username: 'mom@example.com', ... },
  { name: 'Dad', dp: 18200, username: 'dad@example.com', ... }
];
accounts.forEach(acc => saveAccount(acc));
```

### Testing Before Real Application

1. Add test account
2. Try bulk application on a weekend
3. Check results carefully
4. Then use for real IPOs

### Scheduling Applications

Add cron job for automatic applications:

```bash
# Linux/Mac: Add to crontab
0 10 * * * cd /path/to/app && curl -X POST http://localhost:3000/api/apply-ipo

# Windows: Use Task Scheduler
```

---

## ⚠️ Important Reminders

✅ **Do:**
- Keep your password secure
- Verify all applications after completion
- Update PINs if they change
- Follow Mero Share's terms

❌ **Don't:**
- Share your login credentials
- Run multiple instances simultaneously
- Apply to IPOs you're not eligible for
- Leave sensitive data in git history

---

## 🎯 Common Questions

**Q: Is my password safe?**
A: Passwords are stored in your browser's localStorage (client-side). Use HTTPS in production.

**Q: Can I run multiple accounts simultaneously?**
A: Recommended to do 1-2 at a time for stability. Each browser uses ~150MB memory.

**Q: What if PIN verification fails?**
A: App automatically tries PIN 2. If both fail, marks as failed but continues with next IPO.

**Q: Can I edit accounts after creating?**
A: Yes! Click the edit icon next to account name.

**Q: What happens if website changes?**
A: Automation might break. Check [GitHub Issues](https://github.com/yourusername/ipo-bulk-applier/issues) for updates.

---

## 🔗 Quick Links

- 🌐 **Website**: http://localhost:3000
- 🐛 **Report Issues**: [GitHub Issues](https://github.com/yourusername/ipo-bulk-applier/issues)
- 💬 **Ask Questions**: [GitHub Discussions](https://github.com/yourusername/ipo-bulk-applier/discussions)
- 📖 **Full Docs**: [README.md](README.md)

---

**Ready to get started? Follow the 3 steps above and you'll be applying for IPOs in minutes!** 🚀


## 📋 Account Details Reference

| Field | Example | Notes |
|-------|---------|-------|
| DP | 18200 | Depository Participant number |
| Username | 0374923 | Your login username |
| Password | the_god_09 | Your login password |
| CRN Number | 08314100719564000001 | Full account number (16 digits) |
| PIN 1 | 2227 | Primary transaction PIN |
| PIN 2 | 64069 | Backup PIN |

**CRN Extraction**: Last 8 digits of account number starting from position 6
- Account: `08314100719564000001`
- CRN: `00719564` (positions 6-14)

---

## 🎯 Using the Application

### Manage Accounts Tab
- **View**: See all added accounts with masked sensitive data
- **Edit**: Click Edit button to modify account details
- **Delete**: Click Delete button to remove account

### Bulk Apply Tab
1. Set "IPO Quantity per Account" (number of shares)
2. Select "Select All" or check individual accounts
3. Click "Start Bulk Application"
4. Monitor progress in real-time

**Application will:**
- Open browser window (do not close it)
- Login to each account
- Navigate to IPO listing page
- Filter IPOs (IPO type + Ordinary Shares only)
- Fill form with bank, account, quantity, CRN
- Verify with PIN
- Move to next IPO

---

## ⚠️ Important Notes

1. **Keep Browser Open**: Do not close the browser window during bulk application
2. **PINs Required**: Make sure to add both PIN 1 and PIN 2
3. **One at a Time**: Application processes accounts sequentially
4. **Quantity**: Configure quantity in "Bulk Apply" tab before starting
5. **IPO Filtering**: Automatically filters for IPO type + Ordinary Shares

---

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| "Cannot find module 'express'" | Run `npm install` |
| "Port 3000 in use" | Change PORT in server.js or close conflicting app |
| "Can't login" | Verify username/password in account details |
| "PIN failed" | Make sure PIN 1 and PIN 2 are correct |
| "No IPOs found" | Check if IPO listing page loaded correctly |
| "Form fields not filled" | Website UI may have changed, check selectors |

---

## 📁 File Structure

```
Apply_ipo/
├── server.js          ← Backend (start this)
├── database.js        ← SQLite database
├── automation.js      ← Puppeteer automation
├── package.json       ← Dependencies
├── README.md          ← Full documentation
├── public/
│   ├── index.html     ← Web interface
│   ├── app.js         ← Frontend logic
│   └── style.css      ← Styling
└── ipo_accounts.db    ← Created after first use
```

---

## 🔄 Workflow Example

1. Start server: `npm start`
2. Open: `http://localhost:3000`
3. Add account: Click "Add New Account" → Fill details → Save
4. Select bulk: Go to "Bulk Apply" → Set quantity → Select accounts
5. Apply: Click "Start Bulk Application" → Watch browser apply

---

## 💡 Tips

- **Multiple Accounts**: Add all accounts first, then bulk apply to all at once
- **Different Quantities**: Run separate bulk applications with different quantities
- **Test First**: Try with one account first before adding many
- **Time**: Each IPO takes ~10-30 seconds depending on response time
- **Accounts Tab**: Shows masked data (first 2 chars for username, last 4 for CRN)

---

## 📞 Support

If something goes wrong:
1. Check terminal output for error messages
2. Check browser console (F12) for JavaScript errors
3. Try restarting the server
4. Delete database file if needed: `rm ipo_accounts.db`

---

## Next Steps

→ Install dependencies with `npm install`
→ Start server with `npm start`
→ Go to http://localhost:3000
→ Add your first account
→ Test bulk application!

Happy applying! 🎉

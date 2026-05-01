# Complete Oracle Cloud Deployment Guide

## Phase 1: Account Setup (10 minutes)

### Step 1: Create Oracle Cloud Account

1. **Visit Oracle Cloud Free Tier:**
   - Go to: https://www.oracle.com/cloud/free/
   - Click "Start for free"

2. **Fill Registration Form:**
   - Email address
   - Country
   - Company name (can be your own)
   - Click "Verify my email"

3. **Verify Email:**
   - Check inbox for Oracle verification email
   - Click verification link
   - Complete form:
     - First name
     - Last name
     - Password (strong password, 12+ characters)
     - Company (optional)
     - Click "Create Account"

4. **Address & Payment Info:**
   - Oracle will ask for address (they won't charge)
   - Add payment method (credit/debit card) - NOT charged
   - Phone verification (optional)
   - Click "Start My Free Trial"

5. **Account Confirmation:**
   - You'll see "Your Oracle Cloud Account is ready"
   - Click "Sign In" to access dashboard

**You now have:**
- ✅ Always-free VM instances
- ✅ 100 GB storage
- ✅ Never expires (unlike AWS 12-month limit)

---

## Phase 2: Create Compute Instance (10 minutes)

### Step 1: Navigate to Compute

1. **Login to Oracle Cloud Console:**
   - URL: https://www.oracle.com/cloud/
   - Sign in with your credentials

2. **Go to Compute:**
   - Click menu icon (☰) top-left
   - Search for "Instances"
   - Click "Compute → Instances"

3. **Check Your Compartment:**
   - Left sidebar: Compartment dropdown
   - Select "root" (default compartment)

### Step 2: Create Instance

1. **Click "Create Instance" button**

2. **Configure Instance Details:**

   **Name:**
   ```
   ipo-applier
   ```

   **Image & Shape:**
   - Click "Change Image"
   - Select: Ubuntu 22.04 LTS
   - Click "Select Image"

   - Click "Change Shape"
   - Select: Ampere A1 Compute (ARM-based)
   - OCPU Count: 2
   - RAM: 12 GB
   - Click "Select Shape"
   - ✅ Should show "Always Free Eligible"

3. **SSH Key Configuration:**
   - Option 1 (Recommended): "Generate a key pair for me"
     - Click "Save Private Key"
     - Browser downloads: `ssh-key-xxxx-xxxx-xx.key`
     - Save to safe location
   
   - Option 2: Use existing key
     - Paste your public SSH key

4. **Virtual Cloud Network:**
   - Keep default settings
   - VCN will be created automatically

5. **Click "Create Instance"**
   - Wait 2-3 minutes for instance to be "Running"
   - You'll see green "Running" status

### Step 3: Find Your Instance IP

1. **In Instances list:**
   - Find your "ipo-applier" instance
   - Copy the "Public IP Address" (looks like: 123.45.67.89)

---

## Phase 3: SSH Connection (5 minutes)

### Step 1: Connect via SSH (Windows)

**If you have the SSH key file:**

```powershell
# Navigate to folder where you saved ssh-key-xxxx.key
cd Downloads

# Fix permissions (Windows)
icacls ssh-key-xxxx.key /inheritance:r /grant:r "$env:USERNAME`:`(F`)"

# Connect to instance
ssh -i ssh-key-xxxx.key ubuntu@YOUR_INSTANCE_IP
```

**Replace `YOUR_INSTANCE_IP` with actual IP (e.g., 123.45.67.89)**

### Step 2: First-Time Connection

When connecting for first time, you'll see:
```
The authenticity of host '123.45.67.89' can't be established.
Are you sure you want to continue connecting (yes/no)?
```

Type: `yes` and press Enter

### Step 3: You're In!

Once connected, you'll see:
```bash
ubuntu@ipo-applier:~$
```

---

## Phase 4: Install Dependencies (10 minutes)

Once you're SSH'd into the server, run these commands:

### Step 1: Update System

```bash
sudo apt update
sudo apt upgrade -y
```

### Step 2: Install Node.js

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

### Step 3: Install Chromium (for Puppeteer)

```bash
sudo apt install -y chromium-browser
```

### Step 4: Install Git

```bash
sudo apt install -y git
```

### Step 5: Verify Installation

```bash
node --version    # Should show v20.x.x
npm --version     # Should show 10.x.x
chromium-browser --version  # Should show version number
```

---

## Phase 5: Deploy Your App (10 minutes)

### Step 1: Clone Your Repository

```bash
cd ~
git clone https://github.com/shreeprasaddas/bulkipoApply.git
cd bulkipoApply
```

### Step 2: Install App Dependencies

```bash
npm install
```

This will:
- Install Express
- Install Puppeteer
- Install all other packages
- Takes 2-3 minutes

### Step 3: Test Run

```bash
npm start
```

You should see:
```
🚀 IPO Bulk Applier running at http://localhost:3000
Environment: Local/VPS - All features available
```

### Step 4: Stop the Server

Press: `Ctrl + C`

---

## Phase 6: Run App 24/7 (10 minutes)

### Option A: Using `pm2` (Recommended)

```bash
# Install pm2 globally
sudo npm install -g pm2

# Start app with pm2
pm2 start npm --name "ipo-applier" -- start

# Save pm2 config to restart on reboot
pm2 startup systemd -u ubuntu --hp /home/ubuntu
pm2 save

# Check status
pm2 status
pm2 logs ipo-applier
```

### Option B: Using `nohup` (Simple)

```bash
nohup npm start > app.log 2>&1 &
```

To view logs:
```bash
tail -f app.log
```

### Option C: Using `screen` (Simple)

```bash
screen -S ipo-server
npm start
# Press Ctrl + A, then D (detaches, leaves running)
```

To reattach:
```bash
screen -r ipo-server
```

---

## Phase 7: Configure Firewall (5 minutes)

### Step 1: Open Port 3000 in Firewall

Go back to Oracle Cloud Console:

1. **Find your instance:**
   - Compute → Instances
   - Click on "ipo-applier"

2. **Get VCN info:**
   - Scroll down to "Virtual cloud network"
   - Click on your VCN name

3. **Edit Security List:**
   - Click "Security Lists"
   - Click "Default Security List..."
   - Click "Add Ingress Rule"

4. **Add Port 3000:**
   - Stateless: Unchecked
   - Protocol: TCP
   - Source CIDR: 0.0.0.0/0 (allow from anywhere)
   - Destination Port Range: 3000
   - Click "Add Ingress Rule"

### Step 2: Test Access

Open browser: `http://YOUR_INSTANCE_IP:3000`

You should see the app!

---

## Phase 8: Optional - Setup Domain (15 minutes)

### Step 1: Buy Domain

- Domain registrar options:
  - GoDaddy
  - Namecheap
  - Domain.com
  - Google Domains

- Cost: $1-15/year typically

### Step 2: Point Domain to Your IP

In your domain registrar:

1. Find "DNS Settings"
2. Add A Record:
   ```
   Type: A
   Name: @ (or subdomain)
   Value: YOUR_INSTANCE_IP
   TTL: 3600
   ```

3. Save changes
4. Wait 5-30 minutes for DNS to propagate

### Step 3: Test Domain

Open browser: `http://yourdomain.com:3000`

### Step 4: Setup SSL Certificate (Optional)

```bash
# Install certbot
sudo apt install -y certbot

# Get certificate (standalone)
sudo certbot certonly --standalone -d yourdomain.com

# Certificate will be at: /etc/letsencrypt/live/yourdomain.com/
```

---

## Phase 9: Useful Commands Reference

### Check if app is running:
```bash
ps aux | grep node
```

### View app logs:
```bash
pm2 logs ipo-applier    # If using pm2
tail -f app.log         # If using nohup
```

### Restart app:
```bash
pm2 restart ipo-applier  # If using pm2
# Or kill and restart with nohup
```

### Stop app:
```bash
pm2 stop ipo-applier     # If using pm2
pkill -f "npm start"     # Generic
```

### Update app from GitHub:
```bash
cd ~/bulkipoApply
git pull origin main
npm install
pm2 restart ipo-applier
```

### Check resource usage:
```bash
free -h              # RAM usage
df -h                # Disk usage
top                  # CPU usage (press q to exit)
```

### Monitor with pm2:
```bash
pm2 monit          # Real-time monitoring
pm2 describe ipo-applier  # Detailed info
```

---

## Final Checklist

- [ ] Oracle Cloud account created
- [ ] Compute instance created (Ubuntu 22.04 LTS, Ampere A1)
- [ ] SSH connection working
- [ ] Node.js installed (v20+)
- [ ] Chromium installed
- [ ] Repository cloned
- [ ] npm install completed
- [ ] pm2 installed and configured
- [ ] Port 3000 open in firewall
- [ ] App accessible at http://YOUR_IP:3000
- [ ] (Optional) Domain configured
- [ ] (Optional) SSL certificate installed

---

## Common Issues & Solutions

### Issue: SSH connection refused
**Solution:**
```bash
# Make sure instance is "Running" (not "Starting")
# Wait 2-3 minutes after creation
# Check IP address is correct
# Check SSH key has correct permissions
```

### Issue: Command 'npm' not found
**Solution:**
```bash
# Reinstall Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

### Issue: Cannot access http://IP:3000
**Solution:**
```bash
# 1. Check if app is running
ps aux | grep node

# 2. Check firewall rule is added (Phase 7)

# 3. Restart app
pm2 restart ipo-applier

# 4. Check logs
pm2 logs ipo-applier
```

### Issue: Puppeteer throws error
**Solution:**
```bash
# Reinstall Chromium
sudo apt install -y chromium-browser
rm -rf node_modules
npm install
```

### Issue: Port 3000 already in use
**Solution:**
```bash
# Kill existing process
pkill -f "npm start"
pkill -9 node

# Wait 5 seconds and restart
pm2 restart ipo-applier
```

---

## Next Steps

1. **Access the app:**
   - Browser: http://YOUR_INSTANCE_IP:3000

2. **Add your accounts:**
   - Click "Manage Accounts" tab
   - Add your details

3. **Test verification:**
   - Click "Bulk Apply" tab
   - Quick Verify or Bulk Verify

4. **Monitor the server:**
   - SSH in and check: `pm2 logs ipo-applier`

---

## Cost Breakdown

| Item | Cost |
|------|------|
| Compute Instance | **$0** (Always-free) |
| Storage (100GB) | **$0** (Always-free) |
| Domain (optional) | $5-15/year |
| SSL Certificate | **$0** (Let's Encrypt) |
| **Total Monthly** | **$0** |

---

## Support & Troubleshooting

If you get stuck at any step:

1. Check the exact error message
2. Search Google for: `oracle cloud ubuntu [error message]`
3. Check logs: `pm2 logs ipo-applier`
4. Restart instance from Oracle Console

---

**You're done!** Your app is now running 24/7 on Oracle Cloud for free! 🎉

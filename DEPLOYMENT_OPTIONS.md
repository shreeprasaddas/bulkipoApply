# Free Deployment Options for Bulk IPO Applier

## ✅ Recommended Free Platforms (Puppeteer-Compatible)

### 1. **Oracle Cloud Always-Free Tier** ⭐ BEST OPTION
- **Cost:** Completely free, forever
- **What you get:** 
  - 2x Compute Instances (ARM architecture, 1 CPU, 1GB RAM each)
  - 1x Intel instance (2 OCPU, 1GB RAM)
  - 100 GB storage
  - 10 Mbps bandwidth
- **Puppeteer Support:** ✅ Yes (Full VM, install anything)
- **Limitations:** ARM architecture (works but fewer pre-built binaries)
- **Setup:** ~20 minutes
- **Best for:** Production use, 24/7 online

**Setup Guide:**
```bash
# 1. Create free account: https://www.oracle.com/cloud/free/
# 2. Create Compute Instance (Ubuntu 22.04)
# 3. SSH into instance
# 4. Clone repo and install
git clone https://github.com/shreeprasaddas/bulkipoApply.git
cd bulkipoApply
npm install
npm start
# 5. Access via IP:3000
```

---

### 2. **Railway.app**
- **Cost:** $5/month free credit (can sustain basic app)
- **What you get:** 
  - Docker container support
  - Environment variables
  - Persistent storage
- **Puppeteer Support:** ✅ Yes (supports system packages)
- **Limitations:** After $5 credit expires, need to pay (~$7/month)
- **Setup:** ~5 minutes
- **Best for:** Quick testing, small-scale use

**Setup Guide:**
```bash
# 1. Sign up: https://railway.app
# 2. Connect GitHub repo: https://github.com/shreeprasaddas/bulkipoApply
# 3. Railway auto-detects Node.js
# 4. Deploy automatic from main branch
# 5. Access via railway provided URL
```

---

### 3. **Fly.io**
- **Cost:** Free tier available ($3/month credit)
- **What you get:**
  - Docker container deployment
  - Global deployment
  - Auto-scaling
- **Puppeteer Support:** ✅ Yes
- **Limitations:** Free tier limited to 3 shared-cpu-1x 256MB VMs
- **Setup:** ~10 minutes
- **Best for:** Testing, low-traffic use

**Setup Guide:**
```bash
# 1. Install fly CLI: https://fly.io/docs/getting-started/
# 2. Sign up: fly auth signup
# 3. In project directory: fly launch
# 4. Deploy: fly deploy
# 5. Access via fly-generated URL
```

---

### 4. **Google Cloud Run**
- **Cost:** Free tier (2 million requests/month)
- **What you get:**
  - Pay-per-use pricing
  - Docker container support
  - Auto-scaling
- **Puppeteer Support:** ⚠️ Limited (60-second timeout, memory limits)
- **Limitations:** Same serverless issues as Vercel (timeout)
- **Setup:** ~15 minutes
- **Best for:** Stateless endpoints only

---

### 5. **AWS EC2 Free Tier** (Time-limited)
- **Cost:** Free for 12 months (then ~$3-5/month for t3.micro)
- **What you get:**
  - t3.micro instance (eligible for 12 months free)
  - 30GB EBS storage
  - 1GB RAM, 2 vCPU
- **Puppeteer Support:** ✅ Yes (Full VM control)
- **Limitations:** Free only for first 12 months
- **Setup:** ~15 minutes
- **Best for:** Production use with future cost consideration

**Setup Guide:**
```bash
# 1. Create AWS account: https://aws.amazon.com/free/
# 2. Launch t3.micro EC2 instance (Ubuntu 22.04)
# 3. SSH into instance
# 4. Clone and run:
git clone https://github.com/shreeprasaddas/bulkipoApply.git
cd bulkipoApply
npm install
npm start
# 5. Configure security groups for port 3000
```

---

### 6. **Linode (Akamai)** - Paid but CHEAP
- **Cost:** $5/month (or try with $100 credit)
- **What you get:**
  - Nanode with 1GB RAM
  - 25GB SSD storage
  - 1 CPU
- **Puppeteer Support:** ✅ Yes
- **Limitations:** Paid but affordable
- **Setup:** ~10 minutes

---

## ❌ NOT Recommended (Serverless Issues)

- Vercel ❌ (Puppeteer incompatible)
- Render ❌ (Same serverless limits)
- Netlify ❌ (Serverless only)
- Heroku ❌ (Free tier removed, now paid)

---

## 📊 Comparison Table

| Platform | Cost | Duration | Puppeteer | Setup | Best For |
|----------|------|----------|-----------|-------|----------|
| **Oracle Cloud** | Free | Forever | ✅ Full | 20min | **Production** |
| Railway | $5/mo | After trial | ✅ Full | 5min | Testing |
| Fly.io | $3/mo | Free tier | ✅ Full | 10min | Testing |
| AWS EC2 | Free/mo | 12 months | ✅ Full | 15min | Production (limited) |
| Google Cloud Run | $0 (limited) | Pay-per-use | ⚠️ Limited | 15min | API endpoints |
| Linode | $5/mo | Always | ✅ Full | 10min | Production |

---

## 🚀 Quick Start: Oracle Cloud (Recommended)

### Step 1: Create Oracle Cloud Account
```
Go to: https://www.oracle.com/cloud/free/
Sign up with email
Verify email
Create free account (no credit card needed after free tier)
```

### Step 2: Create Compute Instance
```
1. Login to Oracle Cloud Console
2. Navigate to Compute → Instances
3. Click "Create Instance"
4. Select:
   - Image: Ubuntu 22.04 LTS
   - Shape: Ampere A1 Compute (ARM, Free tier eligible)
   - SSH Key: Generate and download
5. Create instance (wait 2-3 minutes)
```

### Step 3: SSH into Instance
```bash
# On your Windows machine (PowerShell):
ssh -i path/to/ssh_key ubuntu@YOUR_INSTANCE_IP

# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install Chromium dependencies
sudo apt install -y chromium-browser
```

### Step 4: Deploy App
```bash
# Clone repository
git clone https://github.com/shreeprasaddas/bulkipoApply.git
cd bulkipoApply

# Install dependencies
npm install

# Start server (runs on port 3000)
npm start

# Or run in background
nohup npm start > app.log 2>&1 &
```

### Step 5: Access App
```
Open browser: http://YOUR_INSTANCE_IP:3000
```

### Step 6: (Optional) Setup Domain
```bash
# Install nginx as reverse proxy
sudo apt install -y nginx

# Configure nginx to forward to localhost:3000
# Install SSL with Let's Encrypt
sudo apt install -y certbot python3-certbot-nginx
sudo certbot certonly --nginx -d yourdomain.com
```

---

## 💰 Monthly Cost Comparison

| Platform | Monthly Cost | Notes |
|----------|--------------|-------|
| **Oracle Cloud** | $0 | Truly forever free |
| Railway | $5 | After free credit |
| Fly.io | $3 | After free tier |
| AWS EC2 | $0-3 | Free for 12 months, then $5/mo |
| Linode | $5 | Cheapest paid option |
| DigitalOcean | $5 | Cheapest traditional option |

---

## ⚡ Recommended Action Plan

1. **Best Choice:** Deploy on **Oracle Cloud Always-Free** (truly free, forever)
2. **Quick Testing:** Use **Railway** ($5 credit lasts ~1 month)
3. **Budget Option:** Use **Fly.io** ($3/month sustainable)
4. **Time-Limited:** Use **AWS EC2** (free for 12 months, then reassess)

---

## 📝 Notes

- All recommended options support:
  - Node.js + Express
  - Puppeteer + Chromium
  - Full file system access
  - Environment variables
  - Persistent storage
  
- Avoid serverless (Vercel, Netlify, Google Cloud Run) - Puppeteer won't work

- For 24/7 operation, use:
  - Oracle Cloud (free)
  - AWS EC2 (free 12 months)
  - Traditional VPS ($5+/mo)

---

Need help deploying to any of these platforms? Let me know!

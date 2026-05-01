# Deployment Guide 🚀

This guide covers deployment to GitHub, Vercel, Docker, Railway, and Heroku.

## 1. GitHub Deployment 📝

### Step 1: Create GitHub Repository

```bash
# Initialize git (if not already)
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit: IPO Bulk Applier"

# Create repository on GitHub, then:
git remote add origin https://github.com/yourusername/ipo-bulk-applier.git
git branch -M main
git push -u origin main
```

### Step 2: GitHub Settings

1. Go to **Settings** → **Secrets and variables** → **Actions**
2. Add required secrets:
   - `VERCEL_TOKEN`: Get from [Vercel Dashboard](https://vercel.com/account/tokens)
   - `VERCEL_ORG_ID`: From Vercel settings
   - `VERCEL_PROJECT_ID`: From Vercel project settings

## 2. Vercel Deployment ✨

### Option A: Deploy from GitHub (Recommended)

1. **Connect to Vercel:**
   - Go to [vercel.com](https://vercel.com)
   - Click "Add New..." → "Project"
   - Import GitHub repository
   - Click "Deploy"

2. **Set Environment Variables:**
   - Go to **Settings** → **Environment Variables**
   - Add any required `.env` variables
   - Re-deploy if needed

3. **Configure for Puppeteer:**
   - The `vercel.json` is already configured
   - Max lambda duration: 60 seconds
   - Memory: 1024 MB

### Option B: Deploy from CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel

# Deploy to production
vercel --prod
```

## 3. Docker Deployment 🐳

### Local Docker Development

```bash
# Build image
docker build -t ipo-bulk-applier .

# Run container
docker run -p 3000:3000 ipo-bulk-applier

# Or use docker-compose
docker-compose up
```

### Deploy to Cloud (AWS, GCP, Azure, DigitalOcean)

```bash
# Build and push to Docker Hub
docker login
docker build -t yourusername/ipo-bulk-applier:latest .
docker push yourusername/ipo-bulk-applier:latest

# Then deploy using cloud provider's container service
```

## 4. Railway Deployment 🚂

1. **Connect Repository:**
   - Go to [railway.app](https://railway.app)
   - Click "New Project" → "Deploy from GitHub"
   - Select repository
   - Grant permissions

2. **Configure:**
   - Service automatically detects Node.js
   - Add environment variables if needed
   - Railway deploys automatically on push

3. **View Logs:**
   - Click service → "Logs" tab
   - Monitor in real-time

## 5. Heroku Deployment 🔵

### Using Heroku CLI

```bash
# Install Heroku CLI
npm i -g heroku

# Login
heroku login

# Create app
heroku create your-app-name

# Deploy
git push heroku main

# View logs
heroku logs --tail
```

### Using GitHub Integration

1. Go to Heroku Dashboard → Settings
2. Connect GitHub account
3. Enable automatic deploys from main branch
4. Deploy main branch

## 6. Self-Hosted Deployment 🖥️

### Ubuntu/Debian Server

```bash
# SSH into server
ssh user@your-server.com

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Clone repository
git clone https://github.com/yourusername/ipo-bulk-applier.git
cd ipo-bulk-applier

# Install dependencies
npm install

# Install PM2 (process manager)
sudo npm i -g pm2

# Start with PM2
pm2 start server.js --name "ipo-applier"
pm2 startup
pm2 save

# Setup Nginx reverse proxy (optional)
sudo apt-get install nginx
# Configure /etc/nginx/sites-available/default to proxy to localhost:3000
```

### Windows Server

```batch
# Download Node.js from nodejs.org and install

# Clone repository
git clone https://github.com/yourusername/ipo-bulk-applier.git
cd ipo-bulk-applier

# Install dependencies
npm install

# Install PM2 or use Task Scheduler to run:
npm start

# Or create batch file: start.bat
@echo off
cd /d %~dp0
npm start
```

## Monitoring & Maintenance

### Health Checks

All deployment methods have health check endpoint:
```bash
curl http://your-app.com/api/health
```

### Logs

- **Vercel**: Dashboard → Logs
- **Railway**: Dashboard → Logs
- **Heroku**: `heroku logs --tail`
- **Docker**: `docker logs container-id`
- **Self-hosted**: Check `npm start` output

### Updates

```bash
# Get latest changes
git pull origin main

# Redeploy
git push heroku main  # For Heroku
vercel --prod         # For Vercel
docker-compose up     # For Docker
```

## Environment Variables

Required `.env` variables for production:

```env
NODE_ENV=production
PORT=3000
```

Optional:
```env
LOG_LEVEL=info
DEBUG=false
```

## Performance Tips

1. **Memory**: Each Puppeteer instance uses ~150MB
   - Limit concurrent accounts to 1-2 for shared hosting
   - Use 2GB+ for production deployment

2. **CPU**: Browser automation is CPU intensive
   - Don't run during peak hours
   - Schedule applications during off-peak times

3. **Storage**: localStorage persists in browser
   - No server-side storage overhead
   - Data auto-syncs on application start

## SSL/HTTPS

- **Vercel**: Automatic HTTPS with SSL certificate
- **Railway**: Automatic HTTPS with SSL certificate
- **Heroku**: Automatic HTTPS with `.herokuapp.com`
- **Self-hosted**: Use Let's Encrypt (Certbot)

## Troubleshooting

### "Chrome not found" on Vercel
- Already handled in `vercel.json`
- Puppeteer uses `chromium` package

### Port already in use
```bash
# Find process using port 3000
lsof -i :3000
kill -9 <PID>

# Or use different port
PORT=3001 npm start
```

### Connection timeouts
- Increase timeout in vercel.json
- Check network connectivity
- Verify Mero Share website is accessible

### Out of memory
- Reduce number of concurrent accounts
- Increase allocated memory
- Monitor with `top` command

## Cost Estimates

- **Vercel**: Free tier (100GB bandwidth/month)
- **Railway**: $5/month startup (includes free tier)
- **Heroku**: $50/month minimum (dyno)
- **DigitalOcean**: $4-6/month (basic droplet)
- **AWS**: Variable (pay as you go)

## Support

- GitHub Issues: Report bugs
- GitHub Discussions: Ask questions
- Email: Contact maintainers

---

**Next Steps:**
1. Choose deployment platform
2. Set up GitHub repository
3. Configure environment variables
4. Deploy!

Happy deploying! 🎉

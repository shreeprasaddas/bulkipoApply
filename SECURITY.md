# Security Policy 🔐

## Reporting Security Vulnerabilities

If you discover a security vulnerability, please email security@example.com instead of using the public issue tracker.

Please include:
- Description of vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

We will acknowledge receipt within 24 hours and provide a status update within 72 hours.

## Security Best Practices

### 1. Password Storage

**Current Implementation:**
- Passwords stored in browser localStorage
- No encryption (user responsibility)

**Recommendations for Production:**
```javascript
// Consider encrypting before storage:
import { encrypt } from 'crypto-js';
const encrypted = encrypt(password, 'secret-key');
localStorage.setItem('password', encrypted);
```

### 2. HTTPS in Production

Always use HTTPS in production:

```nginx
# Nginx example
server {
    listen 443 ssl http2;
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    location / {
        proxy_pass http://localhost:3000;
    }
}
```

### 3. Environment Variables

**Never commit sensitive data:**

```bash
# ✓ Good
.env                  # In .gitignore
.env.local           # In .gitignore

# ✗ Bad
.env                 # Committed to git
API_KEY=sk-abc123    # In code
```

### 4. Input Validation

**Backend validation required:**

```javascript
// ✓ Good
app.post('/api/accounts', (req, res) => {
    const { name, dp, username, password } = req.body;
    
    // Validate inputs
    if (!name || name.length > 100) {
        return res.status(400).json({ error: 'Invalid name' });
    }
    if (!dp || isNaN(dp)) {
        return res.status(400).json({ error: 'Invalid DP' });
    }
    
    // Process...
});
```

### 5. API Rate Limiting

**Recommended for production:**

```javascript
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,                  // limit each IP to 100 requests per windowMs
    message: 'Too many requests'
});

app.use('/api/', limiter);
```

### 6. CORS Configuration

**Current:**
```javascript
const cors = require('cors');
app.use(cors());  // Allow all origins
```

**Recommended for production:**
```javascript
app.use(cors({
    origin: 'https://yourdomain.com',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type']
}));
```

### 7. Credential Leaks Prevention

**Don't log sensitive data:**

```javascript
// ✗ Bad
console.log(`Password: ${password}`);
console.log(accountObject);

// ✓ Good
console.log(`Account added: ${accountName}`);
// Don't log passwords, PINs, or sensitive info
```

### 8. Browser Automation Security

**Puppeteer considerations:**

```javascript
// ✓ Good practices
const browser = await puppeteer.launch({
    headless: false,  // Show browser (transparency)
    args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage'  // Reduce memory usage
    ]
});

// Don't store cookies
// Don't cache sensitive data
// Use fresh browser per account
```

## Security Checklist

- [ ] Remove `.env` file from git history: `git filter-branch --tree-filter 'rm -f .env' HEAD`
- [ ] Use `.env.example` as template
- [ ] Enable HTTPS in production
- [ ] Set strong CORS policy
- [ ] Implement rate limiting
- [ ] Validate all inputs
- [ ] Don't log sensitive data
- [ ] Use environment variables for secrets
- [ ] Keep dependencies updated: `npm audit fix`
- [ ] Regularly scan for vulnerabilities: `npm audit`

## Dependency Security

### Regular Updates

```bash
# Check for vulnerabilities
npm audit

# Fix automatically
npm audit fix

# Update packages safely
npm update

# Update to latest versions
npm outdated
```

### Vulnerable Packages to Monitor

- **puppeteer**: Browser automation (check Chromium version)
- **express**: Web framework (keep up-to-date)
- **body-parser**: Request parsing (included in Express 4.16.0+)

## Deployment Security

### Vercel
- ✅ Automatic HTTPS
- ✅ DDoS protection
- ✅ Web Application Firewall
- ✅ Environment variables encrypted
- ⚠️ Serverless functions have memory limits

### Docker
- ✅ Sandboxed container
- ✅ Full control over environment
- ⚠️ Requires secure host setup
- ⚠️ Monitor container logs

### Self-Hosted
- ✅ Complete control
- ⚠️ Requires security expertise
- ⚠️ Must manage SSL/TLS
- ⚠️ Must keep server updated

## Privacy Considerations

### Data Collection
- This app doesn't collect usage data
- No analytics by default
- No cookies (except browser storage)

### User Data
- Account data stored locally in user's browser
- No data sent to third parties
- No backup/recovery system (user responsibility)

### Mero Share Website
- Automation respects website terms
- No data scraping beyond necessary forms
- Complies with API limits

## Incident Response

If a security issue is discovered:

1. **Immediately disable affected features** (if deployed)
2. **Document the vulnerability**
3. **Create security patch** 
4. **Test thoroughly**
5. **Release security update**
6. **Notify users** via README/Discussions
7. **Follow up** with verification

## Legal & Compliance

### Disclaimer
This tool is provided "as-is" without warranties. Users are responsible for:
- Complying with Mero Share terms of service
- Protecting their credentials
- Using tool legally and ethically
- Following applicable laws

### Limitations of Liability
The authors are not responsible for:
- Account lockouts or losses
- Incorrect applications
- Data breaches (user-caused)
- Website changes breaking automation

## Contact

- **Security Issues**: security@example.com
- **General Issues**: [GitHub Issues](https://github.com/yourusername/ipo-bulk-applier/issues)
- **Questions**: [GitHub Discussions](https://github.com/yourusername/ipo-bulk-applier/discussions)

---

**Last Updated**: May 2026

For the latest security practices, always:
- Keep dependencies updated
- Monitor security advisories
- Review code regularly
- Follow OWASP guidelines

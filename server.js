import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { startBulkApplication, getApplicationHistory, verifyIPOStatusLive } from './automation.js';

// Set Chrome binary path for Puppeteer (used by automation.js)
if (!process.env.CHROME_BIN) {
    process.env.CHROME_BIN = '/usr/bin/chromium'; // Alpine Linux path
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(join(__dirname, 'public')));

// In-memory account storage (accounts stored in browser localStorage, synced here for bulk processing)
let accountsStore = {};

// In-memory process tracking
const processStatus = new Map();

// API Endpoints

// Sync accounts from browser (store them in server memory for bulk processing)
app.post('/api/sync-accounts', (req, res) => {
    try {
        const { accounts } = req.body;
        if (accounts && Array.isArray(accounts)) {
            accountsStore = {};
            accounts.forEach(acc => {
                accountsStore[acc.id] = acc;
            });
        }
        res.json({ success: true, synced: Object.keys(accountsStore).length });
    } catch (error) {
        console.error('Error syncing accounts:', error);
        res.status(500).send(error.message);
    }
});

// Get all accounts (from synced memory)
app.get('/api/accounts', (req, res) => {
    try {
        const accounts = Object.values(accountsStore);
        res.json(accounts);
    } catch (error) {
        console.error('Error fetching accounts:', error);
        res.status(500).send(error.message);
    }
});

// Add account (stores in memory, browser manages localStorage)
app.post('/api/accounts', (req, res) => {
    try {
        const { name, dp, username, password, crn_number, pin_1, pin_2 } = req.body;
        
        if (!name || !dp || !username || !password) {
            return res.status(400).send('Missing required fields: name, dp, username, password');
        }
        
        const id = uuidv4();
        accountsStore[id] = {
            id,
            name,
            dp,
            username,
            password,
            crn_number,
            pin_1,
            pin_2,
            created_at: new Date().toISOString()
        };
        
        res.json({ id, message: 'Account added successfully' });
    } catch (error) {
        console.error('Error adding account:', error);
        res.status(500).send(error.message);
    }
});

// Get single account
app.get('/api/accounts/:id', (req, res) => {
    try {
        const account = accountsStore[req.params.id];
        if (!account) {
            return res.status(404).send('Account not found');
        }
        res.json(account);
    } catch (error) {
        console.error('Error fetching account:', error);
        res.status(500).send(error.message);
    }
});

// Update account
app.put('/api/accounts/:id', (req, res) => {
    try {
        const { id } = req.params;
        const { name, dp, username, password, crn_number, pin_1, pin_2 } = req.body;
        
        if (!name || !dp || !username || !password) {
            return res.status(400).send('Missing required fields');
        }
        
        if (!accountsStore[id]) {
            return res.status(404).send('Account not found');
        }
        
        accountsStore[id] = {
            ...accountsStore[id],
            name,
            dp,
            username,
            password,
            crn_number,
            pin_1,
            pin_2,
            updated_at: new Date().toISOString()
        };
        
        res.json({ message: 'Account updated successfully' });
    } catch (error) {
        console.error('Error updating account:', error);
        res.status(500).send(error.message);
    }
});

// Delete account
app.delete('/api/accounts/:id', (req, res) => {
    try {
        const { id } = req.params;
        delete accountsStore[id];
        res.json({ message: 'Account deleted successfully' });
    } catch (error) {
        console.error('Error deleting account:', error);
        res.status(500).send(error.message);
    }
});

// Start bulk IPO application
app.post('/api/apply-ipo', (req, res) => {
    try {
        const { account_ids, quantity } = req.body;
        
        if (!account_ids || account_ids.length === 0) {
            return res.status(400).send('No accounts selected');
        }
        
        // Get selected accounts from stored memory
        const selectedAccounts = account_ids
            .map(id => accountsStore[id])
            .filter(acc => acc !== undefined);
        
        if (selectedAccounts.length === 0) {
            return res.status(400).send('No valid accounts found');
        }
        
        const processId = uuidv4();
        
        // Initialize process status
        processStatus.set(processId, {
            status: 'running',
            total: selectedAccounts.length,
            processed: 0,
            current_account_status: 'Starting...',
            results: []
        });
        
        // Start the automation in background
        startBulkApplication(selectedAccounts, quantity || 10, (update) => {
            const status = processStatus.get(processId);
            if (status) {
                // Update processed count - handle both direct count and increment
                if (update.processed !== undefined) {
                    status.processed = update.processed;
                }
                
                // Update status message
                if (update.status) {
                    status.current_account_status = update.status;
                }
                
                // Store result if provided
                if (update.result) {
                    status.results.push(update.result);
                }
                
                // Check for explicit completion markers
                if (update.final === true || update.status === 'completed' || status.processed >= status.total) {
                    status.status = 'completed';
                }
                
                console.log(`[Status Update] ProcessID: ${processId.substring(0, 8)}... | Processed: ${status.processed}/${status.total} | Status: ${status.status}`);
            }
        }).then(() => {
            const status = processStatus.get(processId);
            if (status) {
                status.status = 'completed';
                console.log(`[Promise Resolved] ProcessID: ${processId.substring(0, 8)}... | Marked as completed`);
            }
        }).catch(error => {
            console.error('Bulk application error:', error);
            const status = processStatus.get(processId);
            if (status) {
                status.status = 'error';
                status.error = error.message;
                console.log(`[Error Caught] ProcessID: ${processId.substring(0, 8)}... | Error: ${error.message}`);
            }
        });
        
        res.json({ process_id: processId, message: 'Bulk application started' });
    } catch (error) {
        console.error('Error starting bulk application:', error);
        res.status(500).send(error.message);
    }
});

// Get bulk application status
app.get('/api/status/:processId', (req, res) => {
    try {
        const { processId } = req.params;
        const status = processStatus.get(processId);
        
        if (!status) {
            return res.status(404).send('Process not found');
        }
        
        res.json(status);
    } catch (error) {
        console.error('Error fetching status:', error);
        res.status(500).send(error.message);
    }
});

// Get application results
app.get('/api/results/:processId', (req, res) => {
    try {
        const { processId } = req.params;
        const status = processStatus.get(processId);
        
        if (!status) {
            return res.status(404).send('Process not found');
        }
        
        res.json({
            status: status.status,
            total: status.total,
            processed: status.processed,
            results: status.results
        });
    } catch (error) {
        console.error('Error fetching results:', error);
        res.status(500).send(error.message);
    }
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
});

// Get application history
app.get('/api/history', (req, res) => {
    try {
        const history = getApplicationHistory();
        res.json(history);
    } catch (error) {
        console.error('Error fetching history:', error);
        res.status(500).send(error.message);
    }
});

// Verify IPO status by visiting the ASBA page (real-time verification)
app.post('/api/verify-ipo-status', async (req, res) => {
    try {
        const { ipoName, accountName } = req.body;
        
        if (!ipoName || !accountName) {
            return res.status(400).send('Missing ipoName or accountName');
        }
        
        // Find the account from synced accounts
        const account = Object.values(accountsStore).find(a => a.name === accountName);
        if (!account) {
            return res.status(404).json({
                success: false,
                error: 'Account not found',
                applied: null,
                buttonState: null
            });
        }
        
        // Verify by actually visiting the website
        console.log(`\n[API] Verifying IPO: ${ipoName} for Account: ${accountName}`);
        const result = await verifyIPOStatusLive(account, ipoName);
        
        res.json(result);
        
    } catch (error) {
        console.error('Error verifying IPO status:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            applied: null,
            buttonState: null
        });
    }
});

// Validate account credentials
app.post('/api/validate-credentials', async (req, res) => {
    try {
        const { name, dp, username, password, crn_number } = req.body;
        
        if (!name || !dp || !username || !password) {
            return res.status(400).json({ 
                success: false, 
                error: 'Missing required fields' 
            });
        }
        
        console.log(`\n[API] Validating credentials for: ${name}`);
        
        // Import Puppeteer for validation
        import('puppeteer').then(async (puppeteer) => {
            let browser;
            try {
                browser = await puppeteer.default.launch({ headless: true });
                const page = await browser.newPage();
                
                // Navigate to login page
                console.log('Navigating to Mero Share...');
                await page.goto('https://meroshare.cdsc.com.np/', { waitUntil: 'networkidle2', timeout: 10000 });
                
                // Wait for DP dropdown
                await page.waitForSelector('select.select2-hidden-accessible', { timeout: 5000 });
                
                // Try to select DP
                try {
                    await page.click('.select2-selection--single');
                    await page.waitForSelector('.select2-results__option', { timeout: 5000 });
                    
                    const optionToClick = await page.evaluate((dpValue) => {
                        const options = Array.from(document.querySelectorAll('.select2-results__option'));
                        const option = options.find(opt => opt.textContent.includes(dpValue));
                        return option ? option.getAttribute('data-select2-id') : null;
                    }, `(${dp})`);
                    
                    if (optionToClick) {
                        await page.click(`[data-select2-id="${optionToClick}"]`);
                    } else {
                        throw new Error('Invalid DP: Not found in dropdown');
                    }
                } catch (dpError) {
                    throw new Error(`DP Error: ${dpError.message}`);
                }
                
                // Wait for dropdown to close
                await new Promise(resolve => setTimeout(resolve, 500));
                
                // Enter username
                await page.type('#username', username, { delay: 50 });
                
                // Enter password
                await page.type('input[name="password"]', password, { delay: 50 });
                
                // Click login button
                await page.waitForSelector('button.sign-in', { timeout: 5000 });
                
                try {
                    await page.click('button.sign-in');
                } catch (e) {
                    await page.focus('button.sign-in');
                    await page.keyboard.press('Enter');
                }
                
                // Wait for navigation
                const navigationSuccess = await Promise.race([
                    page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 })
                        .then(() => true)
                        .catch(() => false),
                    new Promise(resolve => setTimeout(() => resolve(false), 8000))
                ]);
                
                // Check if we're on the dashboard (login successful)
                const currentUrl = page.url();
                const isLoggedIn = currentUrl.includes('#/dashboard') || currentUrl.includes('#/asba') || !currentUrl.includes('login');
                
                await browser.close();
                
                if (isLoggedIn && navigationSuccess) {
                    console.log(`✓ Credentials validated successfully for ${name}`);
                    res.json({ 
                        success: true, 
                        message: 'Credentials are valid' 
                    });
                } else {
                    console.log(`✗ Login failed: Navigation unsuccessful or still on login page`);
                    res.status(401).json({ 
                        success: false, 
                        error: 'Username or password is incorrect' 
                    });
                }
            } catch (error) {
                console.error(`❌ Validation error: ${error.message}`);
                
                if (browser) {
                    try {
                        await browser.close();
                    } catch (e) {
                        // Ignore close error
                    }
                }
                
                // Determine error message
                let errorMessage = error.message;
                if (errorMessage.includes('DP')) {
                    errorMessage = 'Invalid DP number';
                } else if (errorMessage.includes('Username') || errorMessage.includes('password')) {
                    errorMessage = 'Username or password is incorrect';
                } else if (errorMessage.includes('Timeout')) {
                    errorMessage = 'Connection timeout - please check your internet';
                }
                
                res.status(401).json({ 
                    success: false, 
                    error: errorMessage 
                });
            }
        }).catch(err => {
            console.error('Puppeteer import error:', err);
            res.status(500).json({ 
                success: false, 
                error: 'Validation service error' 
            });
        });
        
    } catch (error) {
        console.error('Validation error:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// Serve main page
app.get('/', (req, res) => {
    res.sendFile(join(__dirname, 'public', 'index.html'));
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Server error:', error);
    res.status(500).send('Internal server error');
});

// Start server
app.listen(PORT, () => {
    console.log(`IPO Bulk Applier server running at http://localhost:${PORT}`);
});

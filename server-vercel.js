import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(join(__dirname, 'public')));

// Check if running on Vercel (serverless)
const isVercel = process.env.VERCEL === '1';

if (isVercel) {
    // Serverless mode - disable Puppeteer features
    
    // Status endpoint for health check
    app.get('/api/status', (req, res) => {
        res.json({ 
            status: 'running',
            environment: 'vercel-serverless',
            message: 'Browser automation features are not available in Vercel serverless mode'
        });
    });

    // Verification not available message
    app.post('/api/verify-ipo-status', (req, res) => {
        res.status(503).json({
            success: false,
            error: 'Verification features are not available in Vercel serverless mode. Please run the app locally or on a dedicated server.',
            info: 'For verification to work, deploy on a VPS or run locally with: npm start'
        });
    });

    // Bulk apply not available
    app.post('/api/apply-ipo', (req, res) => {
        res.status(503).json({
            success: false,
            error: 'Bulk IPO application is not available in Vercel serverless mode. Please run the app locally.',
            info: 'This app requires browser automation which requires a full Node.js environment with system libraries.'
        });
    });

} else {
    // Local/VPS mode - load Puppeteer features
    let accountsStore = {};
    const processStatus = new Map();

    // Sync accounts from browser
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

    // Get accounts
    app.get('/api/accounts', (req, res) => {
        try {
            const accounts = Object.values(accountsStore);
            res.json(accounts);
        } catch (error) {
            console.error('Error getting accounts:', error);
            res.status(500).send(error.message);
        }
    });

    // Import Puppeteer features only in local mode
    try {
        const { startBulkApplication, getApplicationHistory, verifyIPOStatusLive } = await import('./automation.js');

        // Apply IPO endpoint
        app.post('/api/apply-ipo', async (req, res) => {
            try {
                const { selectedAccounts, quantity } = req.body;
                
                if (!selectedAccounts || selectedAccounts.length === 0) {
                    return res.status(400).json({ error: 'No accounts selected' });
                }

                const processId = `process_${Date.now()}`;
                
                res.json({ processId, message: 'Bulk application started' });

                // Start async processing
                startBulkApplication(selectedAccounts, quantity, (status) => {
                    processStatus.set(processId, status);
                }).catch(error => {
                    console.error('Error in bulk application:', error);
                    processStatus.set(processId, { status: 'error', error: error.message });
                });

            } catch (error) {
                console.error('Error starting bulk application:', error);
                res.status(500).json({ error: error.message });
            }
        });

        // Get application history
        app.get('/api/history', (req, res) => {
            try {
                const history = getApplicationHistory();
                res.json(history);
            } catch (error) {
                console.error('Error getting history:', error);
                res.status(500).send(error.message);
            }
        });

        // Verify IPO status
        app.post('/api/verify-ipo-status', async (req, res) => {
            try {
                const { ipoName, accountName } = req.body;
                
                if (!accountName || !ipoName) {
                    return res.status(400).json({ error: 'Missing accountName or ipoName' });
                }

                const account = Object.values(accountsStore).find(a => a.name === accountName);
                
                if (!account) {
                    return res.status(404).json({ error: 'Account not found' });
                }

                const result = await verifyIPOStatusLive(account, ipoName);
                res.json(result);

            } catch (error) {
                console.error('Error verifying IPO status:', error);
                res.status(500).json({ error: error.message });
            }
        });

    } catch (error) {
        console.error('Warning: Could not load Puppeteer features:', error);
        console.log('Some features will be unavailable');
    }
}

// Serve main page
app.get('/', (req, res) => {
    res.sendFile(join(__dirname, 'public', 'index.html'));
});

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

// Error handling
app.use((error, req, res, next) => {
    console.error('Server error:', error);
    res.status(500).json({ error: 'Internal server error' });
});

export default app;

// Start server if not in serverless mode
if (!isVercel) {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`🚀 IPO Bulk Applier running at http://localhost:${PORT}`);
        console.log(`Environment: Local/VPS - All features available`);
    });
}

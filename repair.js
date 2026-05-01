import fs from 'fs';
const file = 'd:/Automation/apply_ipo/automation.js';
let content = fs.readFileSync(file, 'utf8');

const searchStr = 'export async function fetchActiveIPOs(account) {';
const index = content.indexOf(searchStr);

if (index !== -1) {
    const jsDocIndex = content.lastIndexOf('/**', index);
    const cutIndex = jsDocIndex !== -1 && jsDocIndex > index - 100 ? jsDocIndex : index;
    content = content.substring(0, cutIndex);
} else {
    // If it's missing, maybe a partial piece is there, let's just find verifyIPOStatusLive end
    const lastFuncEnd = content.lastIndexOf('};\\n    }\\n}\\n');
    if (lastFuncEnd !== -1) {
        content = content.substring(0, lastFuncEnd + 12);
    }
}

// Clean up any trailing broken syntax if we can find verifyIPOStatusLive
const verifyStr = 'export async function verifyIPOStatusLive';
const verifyIndex = content.indexOf(verifyStr);
if (verifyIndex !== -1) {
    const endStr = '        };\\n    }\\n}\\n';
    const endIndex = content.indexOf(endStr, verifyIndex);
    if (endIndex !== -1) {
        content = content.substring(0, endIndex + endStr.length);
    }
}

content += `
/**
 * Fetch list of active IPOs from Meroshare ASBA page
 */
export async function fetchActiveIPOs(account) {
    let browser;
    try {
        console.log(\`\\n🔍 Fetching Active IPOs using account: \${account.name}\`);
        
        const puppeteer = (await import('puppeteer')).default;
        browser = await puppeteer.launch({ 
            headless: true
        });
        
        const page = await browser.newPage();
        
        // ===== LOGIN =====
        console.log(\`Logging in as \${account.name}...\`);
        await page.goto('https://meroshare.cdsc.com.np/', { waitUntil: 'networkidle2', timeout: 10000 });
        
        // Wait for the page to load
        await page.waitForSelector('select.select2-hidden-accessible', { timeout: 5000 });
        
        // Select DP from dropdown (Select2)
        await page.click('.select2-selection--single');
        await page.waitForSelector('.select2-results__option', { timeout: 5000 });
        
        // Click the option with the DP value
        const optionToClick = await page.evaluate((dpValue) => {
            const options = Array.from(document.querySelectorAll('.select2-results__option'));
            const option = options.find(opt => opt.textContent.includes(dpValue));
            return option ? option.getAttribute('data-select2-id') : null;
        }, \`(\${account.dp})\`);
        
        if (optionToClick) {
            await page.click(\`[data-select2-id="\${optionToClick}"]\`);
        }
        
        await new Promise(resolve => setTimeout(resolve, 500));
        await page.type('#username', account.username, { delay: 50 });
        await page.type('input[name="password"]', account.password, { delay: 50 });
        await page.waitForSelector('button.sign-in', { timeout: 5000 });
        
        try {
            await page.click('button.sign-in');
        } catch (error) {
            await page.focus('button.sign-in');
            await page.keyboard.press('Enter');
        }
        
        await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 }).catch(() => console.log('Navigation timeout'));
        
        // ===== NAVIGATE TO ASBA =====
        console.log(\`Navigating to ASBA page...\`);
        await page.goto('https://meroshare.cdsc.com.np/#/asba', { waitUntil: 'networkidle2', timeout: 10000 });
        
        await page.waitForSelector('.company-list', { timeout: 10000 }).catch(() => {
            console.log('No companies found or timeout.');
        });
        
        // Extract all active IPOs
        const activeIPOs = await page.evaluate(() => {
            const companies = document.querySelectorAll('.company-list');
            const ipoNames = [];
            
            for (let company of companies) {
                // Find company name using the correct tooltip attribute or fallback
                const nameElement = company.querySelector('span[tooltip="Company Name"]') || company.querySelector('.company-name');
                
                // Find share type and group
                const shareTypeElement = company.querySelector('span[tooltip="Share Type"]');
                const isinElement = company.querySelector('span[tooltip="Share Group"]');
                
                const isIpo = shareTypeElement && shareTypeElement.innerText.includes('IPO');
                const isOrdinary = isinElement && isinElement.innerText.includes('Ordinary Shares');
                
                if (nameElement && isIpo && isOrdinary) {
                    ipoNames.push(nameElement.innerText.trim());
                }
            }
            return ipoNames;
        });
        
        await browser.close();
        console.log(\`✓ Found \${activeIPOs.length} active IPOs.\`);
        
        return {
            success: true,
            ipos: activeIPOs
        };
        
    } catch (error) {
        console.error(\`❌ Error fetching active IPOs: \${error.message}\`);
        if (browser) {
            try {
                await browser.close();
            } catch (e) {}
        }
        return {
            success: false,
            error: error.message,
            ipos: []
        };
    }
}
`;

fs.writeFileSync(file, content);
console.log('Fixed file.');

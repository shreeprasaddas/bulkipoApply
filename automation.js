import puppeteer from 'puppeteer';

let currentProcess = null;

/**
 * Store application history in memory (will be synced to client localStorage)
 * Format: {
 *   accountName: string,
 *   accountId: string,
 *   ipoName: string,
 *   quantity: number,
 *   appliedAt: ISO timestamp,
 *   status: 'success' | 'failed'
 * }
 */
let applicationHistory = [];

export function getApplicationHistory() {
    return applicationHistory;
}

export function storeApplicationHistory(record) {
    applicationHistory.push({
        ...record,
        id: `${record.accountId}-${record.ipoName}-${Date.now()}`
    });
    console.log(`📝 Stored in history: ${record.accountName} - ${record.ipoName} - ${record.status}`);
}

export async function startBulkApplication(selectedAccounts, quantity = 10, onProgress = null) {
    try {
        console.log(`\n========== STARTING BULK IPO APPLICATION ==========`);
        console.log(`Total accounts to process: ${selectedAccounts.length}`);
        console.log(`IPO Quantity per account: ${quantity}`);
        console.log(`=================================================\n`);
        
        let processedCount = 0;
        
        for (const account of selectedAccounts) {
            processedCount++;
            console.log(`\n[${processedCount}/${selectedAccounts.length}] Processing Account: ${account.name} (DP ${account.dp})`);
            
            if (onProgress) {
                onProgress({
                    processed: processedCount - 1,
                    status: `Processing account: ${account.name}`,
                    account_id: account.id
                });
            }
            
            try {
                // Create a NEW browser for each account (like index.js does)
                const browser = await puppeteer.launch({ 
                    headless: false,
                    defaultViewport: null, 
                    args: ['--start-maximized']
                });
                
                await applyIPOForAccount(browser, account, quantity, processedCount, selectedAccounts.length, onProgress);
                
                await browser.close();
            } catch (error) {
                console.error(`❌ Error processing account ${account.name}:`, error.message);
            }
        }
        
        console.log(`\n========== BULK APPLICATION COMPLETED ==========\n`);
        
        // Send final completion status with explicit marker
        if (onProgress) {
            onProgress({
                processed: processedCount,
                status: 'completed',
                total: selectedAccounts.length,
                final: true
            });
            console.log(`[Final Callback] All ${processedCount} accounts completed.`);
        }
        
        currentProcess = null;
        
    } catch (error) {
        console.error('Bulk application failed:', error);
        currentProcess = null;
        throw error;
    }
}

async function applyIPOForAccount(browser, account, quantity, processedCount, totalAccounts, onProgress) {
    const page = await browser.newPage();
    let accountResults = [];
    
    try {
        // ===== LOGIN =====
        console.log(`\nLogging in as ${account.name}...`);
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
        }, `(${account.dp})`);
        
        if (optionToClick) {
            await page.click(`[data-select2-id="${optionToClick}"]`);
        }
        
        // Wait for dropdown to close
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Enter username
        await page.type('#username', account.username, { delay: 50 });
        
        // Enter password
        await page.type('input[name="password"]', account.password, { delay: 50 });
        
        // Wait for login button to be visible and clickable
        await page.waitForSelector('button.sign-in', { timeout: 5000 });
        
        // Scroll to button if needed
        await page.evaluate(() => {
            const btn = document.querySelector('button.sign-in');
            if (btn) btn.scrollIntoView();
        });
        
        // Wait a bit more for any animations
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // Click login button with retry logic
        try {
            await page.click('button.sign-in');
            console.log('✓ Login button clicked');
        } catch (error) {
            console.log('First click failed, trying with focus and enter...');
            await page.focus('button.sign-in');
            await page.keyboard.press('Enter');
        }
        
        // Wait for navigation to complete
        await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 }).catch(() => console.log('Navigation timeout'));
        
        console.log('✓ Login successful!');
        
        // Navigate to ASBA page
        console.log('Navigating to ASBA page...');
        await page.goto('https://meroshare.cdsc.com.np/#/asba', { waitUntil: 'networkidle2', timeout: 10000 });
        
        // Wait for IPO list to load
        await page.waitForSelector('.company-list', { timeout: 10000 });
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Extract all IPO listings
        const ipoList = await page.evaluate(() => {
            const ipos = [];
            const companyItems = document.querySelectorAll('.company-list');
            
            companyItems.forEach((item, index) => {
                const companyNameElement = item.querySelector('.company-name span');
                const companyName = companyNameElement?.textContent?.trim() || 'N/A';
                
                const companyNameDiv = item.querySelector('.company-name');
                
                const spans = companyNameDiv?.querySelectorAll('span') || [];
                let subGroup = '';
                let shareType = '';
                let isin = '';
                
                spans.forEach((span) => {
                    const text = span.textContent?.trim() || '';
                    const tooltip = span.getAttribute('tooltip') || '';
                    
                    if (tooltip === 'Sub Group') subGroup = text;
                    if (tooltip === 'Share Type') shareType = text;
                    if (tooltip === 'Share Group') isin = text;
                });
                
                const hasApplyButton = item.querySelector('.btn-issue') !== null;
                
                ipos.push({
                    index: index + 1,
                    companyName: companyName,
                    subGroup: subGroup,
                    shareType: shareType,
                    isin: isin,
                    hasApplyButton: hasApplyButton
                });
            });
            
            return ipos;
        });
        
        // Filter IPOs: Only show those with Share Type: IPO, ISIN: Ordinary Shares, and Can Apply: Yes
        const filteredIPOs = ipoList.filter(ipo => 
            ipo.shareType.includes('IPO') && 
            ipo.isin.includes('Ordinary Shares') && 
            ipo.hasApplyButton
        );
        
        console.log(`\nFiltered IPOs (IPO + Ordinary Shares + Applicable): ${filteredIPOs.length}`);
        filteredIPOs.forEach((ipo, index) => {
            console.log(`  [${index + 1}] ${ipo.companyName}`);
        });
        
        // ===== APPLY FOR EACH IPO =====
        for (const ipo of filteredIPOs) {
            console.log(`\n--- Applying for: ${ipo.companyName} ---`);
            let ipoStatus = {
                companyName: ipo.companyName,
                ipo: ipo.companyName,
                status: 'pending',
                quantity: quantity,
                error: null
            };
            
            try {
                // Click Apply button
                console.log('Clicking Apply button...');
                await page.evaluate(() => {
                    const applyButton = document.querySelector('.btn-issue');
                    if (applyButton) {
                        applyButton.click();
                    }
                });
                
                // Wait for form/wizard to load
                console.log('Waiting for application form to load...');
                await new Promise(resolve => setTimeout(resolve, 3000));
                
                // ===== STEP 1: FILL APPLICATION FORM =====
                console.log('=== STEP 1: Filling Application Form ===');
                
                // Scroll down to see all form elements
                await page.evaluate(() => {
                    window.scrollBy(0, 500);
                });
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                // Select Bank
                console.log('Selecting bank...');
                try {
                    const allSelects = await page.$$('select');
                    if (allSelects.length > 0) {
                        const firstSelectValue = await page.evaluate((index) => {
                            const select = document.querySelectorAll('select')[index];
                            if (select && select.options.length > 1) {
                                return select.options[1].value;
                            }
                            return null;
                        }, 0);
                        
                        if (firstSelectValue) {
                            await page.select('select:first-of-type', firstSelectValue);
                            console.log(`  ✓ Bank selected`);
                            await new Promise(resolve => setTimeout(resolve, 1000));
                        }
                    }
                } catch (e) {
                    console.log(`  ✗ Error selecting bank: ${e.message}`);
                }
                
                // Select Account Number
                console.log('Selecting account number...');
                let selectedAccountNumber = null;
                try {
                    const allSelects = await page.$$('select');
                    if (allSelects.length > 1) {
                        const secondSelectValue = await page.evaluate((index) => {
                            const select = document.querySelectorAll('select')[index];
                            if (select && select.options.length > 1) {
                                return select.options[1].value;
                            }
                            return null;
                        }, 1);
                        
                        if (secondSelectValue) {
                            selectedAccountNumber = secondSelectValue; // Capture account number for CRN extraction
                            await page.evaluate((index, value) => {
                                const select = document.querySelectorAll('select')[index];
                                if (select) {
                                    select.value = value;
                                    select.dispatchEvent(new Event('change', { bubbles: true }));
                                }
                            }, 1, secondSelectValue);
                            console.log(`  ✓ Account selected: ${secondSelectValue}`);
                            await new Promise(resolve => setTimeout(resolve, 1000));
                        }
                    }
                } catch (e) {
                    console.log(`  ✗ Error selecting account: ${e.message}`);
                }
                
                // Scroll down more
                await page.evaluate(() => {
                    window.scrollBy(0, 300);
                });
                await new Promise(resolve => setTimeout(resolve, 500));
                
                // Enter Applied Kitta (Quantity)
                console.log(`Entering quantity: ${quantity}`);
                try {
                    const kittaInput = await page.$('input[name="appliedKitta"], input[name="quantity"], input[name="kitta"]');
                    if (kittaInput) {
                        await kittaInput.focus();
                        await page.evaluate(() => {
                            const input = document.querySelector('input[name="appliedKitta"], input[name="quantity"], input[name="kitta"]');
                            if (input) {
                                input.value = '';
                                input.dispatchEvent(new Event('input', { bubbles: true }));
                            }
                        });
                        await page.type('input[name="appliedKitta"], input[name="quantity"], input[name="kitta"]', quantity.toString(), { delay: 50 });
                        console.log(`  ✓ Quantity entered: ${quantity}`);
                        
                        // Wait for amount to auto-calculate
                        console.log('  Waiting for amount to auto-calculate...');
                        await new Promise(resolve => setTimeout(resolve, 1500));
                    }
                } catch (e) {
                    console.log(`  ✗ Error entering quantity: ${e.message}`);
                }
                
                // Scroll down to reveal CRN field
                console.log('Scrolling to CRN field...');
                await page.evaluate(() => {
                    window.scrollBy(0, 400);
                });
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                // Enter CRN Number
                // Extract CRN from the selected account number using substring(6, 14)
                let crn = '';
                if (selectedAccountNumber) {
                    crn = selectedAccountNumber.substring(6, 14);
                    console.log(`Extracted CRN from account number: ${crn}`);
                } else if (account.crn_number) {
                    // Fallback: use stored CRN if account number wasn't captured
                    crn = account.crn_number;
                    if (crn && crn.length === 20) {
                        crn = crn.substring(6, 14);
                    }
                    console.log(`Using stored CRN: ${crn}`);
                }
                
                console.log(`Entering CRN number: ${crn}`);
                try {
                    const crnInput = await page.$('input[name="crnNumber"], input[name="crn"], input[name="crn_no"]');
                    if (crnInput) {
                        await crnInput.focus();
                        await page.evaluate(() => {
                            const input = document.querySelector('input[name="crnNumber"], input[name="crn"], input[name="crn_no"]');
                            if (input) {
                                input.value = '';
                                input.dispatchEvent(new Event('input', { bubbles: true }));
                            }
                        });
                        await page.type('input[name="crnNumber"], input[name="crn"], input[name="crn_no"]', crn, { delay: 50 });
                        console.log(`✓ CRN entered: ${crn}`);
                    } else {
                        console.log('CRN input not found');
                        throw new Error('CRN input field not found');
                    }
                } catch (e) {
                    console.log(`Error entering CRN: ${e.message}`);
                    ipoStatus.status = 'failed';
                    ipoStatus.error = `CRN entry failed: ${e.message}`;
                    accountResults.push(ipoStatus);
                    
                    // Return to ASBA page for next IPO
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    await page.goto('https://meroshare.cdsc.com.np/#/asba', { waitUntil: 'networkidle2', timeout: 10000 });
                    await page.waitForSelector('.company-list', { timeout: 10000 });
                    continue;
                }
                
                // Check Declaration Checkbox
                console.log('Checking declaration checkbox...');
                try {
                    const declarationChecked = await page.evaluate(() => {
                        const checkboxes = Array.from(document.querySelectorAll('input[type="checkbox"]'));
                        const declarationCheckbox = checkboxes.find(cb => {
                            const label = cb.parentElement?.textContent || cb.nextElementSibling?.textContent || '';
                            return label.includes('declaration') || label.includes('Declaration') || label.includes('I agree') || label.includes('I hereby');
                        });
                        if (declarationCheckbox && !declarationCheckbox.checked) {
                            declarationCheckbox.checked = true;
                            declarationCheckbox.dispatchEvent(new Event('change', { bubbles: true }));
                            return true;
                        }
                        return declarationCheckbox?.checked || false;
                    });
                    
                    if (declarationChecked) {
                        console.log('  ✓ Declaration checkbox checked');
                    }
                } catch (e) {
                    console.log(`  ✗ Error checking declaration: ${e.message}`);
                }
                
                // Click Proceed Button
                console.log('Clicking proceed button...');
                try {
                    await page.evaluate(() => {
                        const buttons = Array.from(document.querySelectorAll('button'));
                        const proceedBtn = buttons.find(btn => {
                            const text = btn.textContent.trim();
                            return text.includes('Proceed') || text.includes('Next') || text.includes('NEXT') || text.includes('PROCEED');
                        });
                        if (proceedBtn) {
                            proceedBtn.click();
                        }
                    });
                    console.log('  ✓ Proceed button clicked');
                    
                    // Wait for PIN step
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    
                    // ===== STEP 2: PIN VERIFICATION =====
                    console.log('\n=== STEP 2: PIN VERIFICATION ===');
                    console.log('Verifying PIN...');
                    
                    const pins = [];
                    if (account.pin_1) pins.push(account.pin_1);
                    if (account.pin_2) pins.push(account.pin_2);
                    
                    if (pins.length === 0) {
                        console.log('  ✗ No PINs configured for this account');
                        ipoStatus.status = 'failed';
                        ipoStatus.error = 'No PINs configured';
                    } else {
                        let pinEntered = false;
                        
                        for (const pin of pins) {
                            console.log(`  Trying PIN: ${pin}`);
                            
                            try {
                                // Find and focus PIN input
                                const pinInput = await page.$('input[name="pin"], input[name="otp"], input[type="password"]');
                                if (pinInput) {
                                    await pinInput.focus();
                                    await page.evaluate(() => {
                                        const input = document.querySelector('input[name="pin"], input[name="otp"], input[type="password"]');
                                        if (input) {
                                            input.value = '';
                                            input.dispatchEvent(new Event('input', { bubbles: true }));
                                        }
                                    });
                                    
                                    await page.type('input[name="pin"], input[name="otp"], input[type="password"]', pin, { delay: 50 });
                                    console.log(`  ✓ PIN entered`);
                                    
                                    // Click Apply/Submit button
                                    await page.evaluate(() => {
                                        const buttons = Array.from(document.querySelectorAll('button'));
                                        const applyBtn = buttons.find(btn => {
                                            const text = btn.textContent.trim();
                                            return text.includes('Apply') || text.includes('APPLY') || text.includes('Submit') || text.includes('SUBMIT');
                                        });
                                        if (applyBtn) applyBtn.click();
                                    });
                                    console.log('  ✓ Apply button clicked');
                                    
                                    // Wait for response
                                    await new Promise(resolve => setTimeout(resolve, 2000));
                                    
                                    // Check for error messages
                                    const result = await page.evaluate(() => {
                                        // Check for toast-error messages
                                        const toastErrors = document.querySelectorAll('.toast-error');
                                        if (toastErrors.length > 0) {
                                            const toastMessage = toastErrors[0].querySelector('.toast-message');
                                            const ariaLabel = toastMessage?.getAttribute('aria-label');
                                            if (ariaLabel) return { hasError: true, message: ariaLabel.trim() };
                                        }
                                        
                                        // Check for success
                                        const successElements = document.querySelectorAll('[class*="success"], [class*="Success"]');
                                        const errorElements = document.querySelectorAll('[class*="error"], [class*="Error"], [class*="danger"]');
                                        
                                        return {
                                            hasSuccess: successElements.length > 0,
                                            hasError: errorElements.length > 0,
                                            message: null
                                        };
                                    });
                                    
                                    if (result.hasError) {
                                        const errorMsg = result.message || 'Unknown error';
                                        console.log(`  ✗ Error: ${errorMsg}`);
                                        
                                        // If it's a wrong PIN error, try next PIN
                                        if (errorMsg.includes('wrong transaction PIN') || errorMsg.includes('wrong PIN') || errorMsg.includes('Invalid PIN')) {
                                            console.log(`  Retrying with next PIN...`);
                                            continue; // Try next PIN
                                        } else {
                                            // Other errors should fail immediately
                                            ipoStatus.status = 'failed';
                                            ipoStatus.error = errorMsg;
                                            break;
                                        }
                                    } else {
                                        // No error detected, navigate back to ASBA to verify if "Apply" button changed to "Edit"
                                        console.log('  Verifying application success by checking Apply/Edit button...');
                                        await page.goto('https://meroshare.cdsc.com.np/#/asba', { waitUntil: 'networkidle2', timeout: 10000 });
                                        await page.waitForSelector('.company-list', { timeout: 10000 });
                                        await new Promise(resolve => setTimeout(resolve, 1000));
                                        
                                        // Check if Apply button changed to Edit for this company
                                        const applicationSuccess = await page.evaluate((companyName) => {
                                            const companies = Array.from(document.querySelectorAll('.company-list'));
                                            for (const company of companies) {
                                                const nameElement = company.querySelector('.company-name span');
                                                if (nameElement && nameElement.textContent.includes(companyName)) {
                                                    // Found the company, check button text
                                                    const button = company.querySelector('.action-buttons button, .btn-issue');
                                                    if (button) {
                                                        const buttonText = button.textContent.trim().toLowerCase();
                                                        console.log(`Button text for ${companyName}: ${buttonText}`);
                                                        // If button shows "Edit" or "View", it was successful
                                                        return buttonText.includes('edit') || buttonText.includes('view');
                                                    }
                                                }
                                            }
                                            return false;
                                        }, ipo.companyName);
                                        
                                        if (applicationSuccess) {
                                            console.log(`✓✓✓ Successfully applied for: ${ipo.companyName} ✓✓✓`);
                                            ipoStatus.status = 'success';
                                            
                                            // Store in application history
                                            storeApplicationHistory({
                                                accountName: account.name,
                                                accountId: account.id,
                                                ipoName: ipo.companyName,
                                                quantity: quantity,
                                                appliedAt: new Date().toISOString(),
                                                status: 'success'
                                            });
                                            
                                            pinEntered = true;
                                            break;
                                        } else {
                                            // Apply button still exists, try next PIN
                                            console.log(`  Apply button still present, retrying with next PIN...`);
                                            continue;
                                        }
                                    }
                                } else {
                                    console.log('  PIN input not found');
                                }
                            } catch (e) {
                                console.log(`  ✗ Error with PIN: ${e.message}`);
                            }
                        }
                        
                        if (!pinEntered && ipoStatus.status === 'pending') {
                            console.log(`✗ Could not apply for ${ipo.companyName} - PIN verification failed`);
                            ipoStatus.status = 'failed';
                            ipoStatus.error = 'PIN verification failed - all PINs exhausted';
                        }
                    }
                } catch (error) {
                    console.error(`  ✗ Error during PIN verification: ${error.message}`);
                    ipoStatus.status = 'failed';
                    ipoStatus.error = error.message;
                }
                
                // Add result to account results
                accountResults.push(ipoStatus);
                
                // Return to ASBA page for next IPO
                await new Promise(resolve => setTimeout(resolve, 2000));
                console.log('Returning to ASBA page...');
                await page.goto('https://meroshare.cdsc.com.np/#/asba', { waitUntil: 'networkidle2', timeout: 10000 });
                await page.waitForSelector('.company-list', { timeout: 10000 });
                await new Promise(resolve => setTimeout(resolve, 500));
                
            } catch (error) {
                console.error(`Error applying for ${ipo.companyName}: ${error.message}`);
                ipoStatus.status = 'failed';
                ipoStatus.error = error.message;
                accountResults.push(ipoStatus);
            }
        }
        
        console.log(`\n✓ Completed all applications for account: ${account.name}`);
        console.log(`Results: ${accountResults.filter(r => r.status === 'success').length} successful, ${accountResults.filter(r => r.status === 'failed').length} failed`);
        
        // Send results callback
        const successCount = accountResults.filter(r => r.status === 'success').length;
        const failedCount = accountResults.filter(r => r.status === 'failed').length;
        
        if (onProgress) {
            onProgress({
                processed: processedCount,
                status: `Completed account: ${account.name}`,
                account_id: account.id,
                result: {
                    account_name: account.name,
                    account_id: account.id,
                    total_ipos: accountResults.length,
                    successful: successCount,
                    failed: failedCount,
                    ipo_results: accountResults
                }
            });
            
            console.log(`[Callback Sent] Account ${processedCount}/${totalAccounts}: ${successCount} success, ${failedCount} failed`);
        }
        
    } catch (error) {
        console.error(`Error processing account ${account.name}:`, error.message);
        
        // Send error result even on failure
        if (onProgress && accountResults.length > 0) {
            const successCount = accountResults.filter(r => r.status === 'success').length;
            const failedCount = accountResults.filter(r => r.status === 'failed').length;
            
            onProgress({
                processed: processedCount,
                status: `Completed account (with error): ${account.name}`,
                account_id: account.id,
                result: {
                    account_name: account.name,
                    account_id: account.id,
                    total_ipos: accountResults.length,
                    successful: successCount,
                    failed: failedCount,
                    ipo_results: accountResults
                }
            });
            
            console.log(`[Callback Sent - Error Recovery] Account ${processedCount}/${totalAccounts}: ${successCount} success, ${failedCount} failed`);
        }
        
    } finally {
        await page.close();
    }
}

export function getApplicationStatus() {
    return currentProcess;
}

/**
 * Verify IPO status by visiting the ASBA page in real-time
 * Checks if the button shows "Edit" (already applied) or "Apply" (not applied)
 */
export async function verifyIPOStatusLive(account, ipoName) {
    let browser;
    const page = null;
    
    try {
        console.log(`\n📱 Real-time Verification: ${account.name} - ${ipoName}`);
        
        browser = await puppeteer.launch({ 
            headless: false,
            defaultViewport: null, 
            args: ['--start-maximized']
        });
        
        const page = await browser.newPage();
        
        // ===== LOGIN =====
        console.log(`Logging in as ${account.name}...`);
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
        }, `(${account.dp})`);
        
        if (optionToClick) {
            await page.click(`[data-select2-id="${optionToClick}"]`);
        }
        
        // Wait for dropdown to close
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Enter username
        await page.type('#username', account.username, { delay: 50 });
        
        // Enter password
        await page.type('input[name="password"]', account.password, { delay: 50 });
        
        // Wait for login button to be visible and clickable
        await page.waitForSelector('button.sign-in', { timeout: 5000 });
        
        // Scroll to button if needed
        await page.evaluate(() => {
            const btn = document.querySelector('button.sign-in');
            if (btn) btn.scrollIntoView();
        });
        
        // Wait a bit more for any animations
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // Click login button with retry logic
        try {
            await page.click('button.sign-in');
            console.log('✓ Login button clicked');
        } catch (error) {
            console.log('First click failed, trying with focus and enter...');
            await page.focus('button.sign-in');
            await page.keyboard.press('Enter');
        }
        
        // Wait for navigation to complete
        await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 }).catch(() => console.log('Navigation timeout'));
        
        console.log('✓ Login successful!');
        
        // ===== NAVIGATE TO ASBA =====
        console.log(`Navigating to ASBA page...`);
        await page.goto('https://meroshare.cdsc.com.np/#/asba', { waitUntil: 'networkidle2', timeout: 10000 });
        
        // Wait for company list to load
        await page.waitForSelector('.company-list', { timeout: 5000 });
        
        // Find the company with matching name
        console.log(`Searching for IPO: ${ipoName}`);
        
        const companyInfo = await page.evaluate((targetIpoName) => {
            const companies = document.querySelectorAll('.company-list');
            
            for (let company of companies) {
                const nameElement = company.querySelector('.company-name');
                if (nameElement) {
                    const fullText = nameElement.innerText;
                    
                    // Check if this company contains the IPO name
                    if (fullText.includes(targetIpoName)) {
                        // Find the button in this company
                        const actionButtons = company.querySelector('.action-buttons');
                        if (actionButtons) {
                            const buttons = actionButtons.querySelectorAll('button');
                            let buttonText = '';
                            
                            for (let btn of buttons) {
                                const text = btn.innerText.trim().toLowerCase();
                                if (text === 'edit' || text === 'apply') {
                                    buttonText = text;
                                    break;
                                }
                            }
                            
                            return {
                                found: true,
                                ipoName: fullText.trim(),
                                buttonState: buttonText,
                                applied: buttonText === 'edit'
                            };
                        }
                    }
                }
            }
            
            return {
                found: false,
                ipoName: null,
                buttonState: null,
                applied: null
            };
        }, ipoName);
        
        await browser.close();
        
        if (companyInfo.found) {
            console.log(`✓ Found IPO: ${companyInfo.ipoName}`);
            console.log(`  Button State: ${companyInfo.buttonState.toUpperCase()}`);
            console.log(`  Applied: ${companyInfo.applied ? 'YES ✓' : 'NO ✗'}`);
            
            return {
                success: true,
                applied: companyInfo.applied,
                buttonState: companyInfo.buttonState.charAt(0).toUpperCase() + companyInfo.buttonState.slice(1),
                ipoName: companyInfo.ipoName,
                verified_at: new Date().toISOString()
            };
        } else {
            console.log(`✗ IPO not found: ${ipoName}`);
            return {
                success: false,
                applied: null,
                buttonState: null,
                ipoName: ipoName,
                error: 'IPO not found on ASBA page',
                verified_at: new Date().toISOString()
            };
        }
        
    } catch (error) {
        console.error(`❌ Verification error: ${error.message}`);
        
        if (browser) {
            try {
                await browser.close();
            } catch (e) {
                console.error('Error closing browser:', e.message);
            }
        }
        
        return {
            success: false,
            applied: null,
            buttonState: null,
            error: error.message,
            verified_at: new Date().toISOString()
        };
    }
}

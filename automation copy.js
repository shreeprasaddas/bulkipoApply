import puppeteer from 'puppeteer';

let currentProcess = null;

export async function startBulkApplication(selectedAccounts, quantity = 10, onProgress = null) {
    try {
        const browser = await puppeteer.launch({ 
            headless: false,
            defaultViewport: null, 
            args: ['--start-maximized']
        });
        
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
                await applyIPOForAccount(browser, account, quantity, processedCount, selectedAccounts.length, onProgress);
            } catch (error) {
                console.error(`❌ Error processing account ${account.name}:`, error.message);
            }
        }
        
        await browser.close();
        console.log(`\n========== BULK APPLICATION COMPLETED ==========\n`);
        
        // Send final completion status with explicit marker
        if (onProgress) {
            onProgress({
                processed: processedCount,
                status: 'completed',
                total: selectedAccounts.length,
                final: true  // Explicit completion marker
            });
            console.log(`[Final Callback] All ${processedCount} accounts completed. Marking as finished.`);
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
        
        // ===== NAVIGATE TO ASBA PAGE =====
        console.log('Navigating to ASBA page...');
        await page.goto('https://meroshare.cdsc.com.np/#/asba', { waitUntil: 'networkidle2', timeout: 10000 });
        
        // Wait for IPO list to load
        await page.waitForSelector('.company-list', { timeout: 10000 });
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // ===== EXTRACT IPO LISTINGS =====
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
        
        // Track results for this account
        const accountResults = [];
        
        // ===== APPLY FOR EACH IPO =====
        for (const ipo of filteredIPOs) {
            console.log(`\n--- Applying for: ${ipo.companyName} ---`);
            let ipoStatus = {
                companyName: ipo.companyName,
                status: 'pending',
                error: null
            };
            
            try {
                // Click Apply button
                await page.evaluate(() => {
                    const applyButton = document.querySelector('.btn-issue');
                    if (applyButton) {
                        applyButton.click();
                    }
                });
                
                // Wait for form/wizard to load
                await new Promise(resolve => setTimeout(resolve, 3000));
                
                // ===== STEP 1: FILL APPLICATION FORM =====
                console.log('Filling application form...');
                
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
                            await page.evaluate((index, value) => {
                                const select = document.querySelectorAll('select')[index];
                                if (select) {
                                    select.value = value;
                                    select.dispatchEvent(new Event('change', { bubbles: true }));
                                }
                            }, 1, secondSelectValue);
                            console.log(`  ✓ Account selected`);
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
                
                // Scroll down to reveal CRN field (skip amount field as it auto-calculates)
                console.log('Scrolling to CRN field...');
                await page.evaluate(() => {
                    window.scrollBy(0, 400);
                });
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                // IMPORTANT: Enter CRN Number on the APPLY FORM PAGE (Step 1)
                // This MUST be done BEFORE clicking Proceed button
                const crn = account.crn_number.substring(6, 14);
                console.log(`\n=== ENTERING CRN ON APPLY FORM PAGE ===`);
                console.log(`Full CRN Number: ${account.crn_number}`);
                console.log(`Extracted CRN (chars 6-14): ${crn}`);
                console.log(`CRN Length: ${crn.length}`);
                console.log(`CRN to enter: ${crn}`);
                try {
                    // Find CRN field using multiple selector strategies
                    let crnSelector = null;
                    const possibleSelectors = [
                        'input#crnNumber',
                        'input[name="crnNumber"]',
                        'input[name="crn_number"]',
                        'input[placeholder*="CRN"]',
                        'input[placeholder*="crn"]',
                        'input[id*="crn"]',
                        'input[name*="crn"]',
                        'input[name="crn"]'
                    ];
                    
                    console.log('Searching for CRN field with multiple selectors...');
                    const foundField = await page.evaluate((selectors) => {
                        for (const selector of selectors) {
                            const field = document.querySelector(selector);
                            if (field && field.offsetParent !== null) {
                                return {
                                    selector: selector,
                                    id: field.id,
                                    name: field.name,
                                    placeholder: field.placeholder,
                                    type: field.type,
                                    value: field.value
                                };
                            }
                        }
                        
                        // Fallback: Search by label text or nearby text
                        const labels = Array.from(document.querySelectorAll('label'));
                        for (const label of labels) {
                            if (label.textContent.includes('CRN') || label.textContent.includes('crn')) {
                                const input = label.nextElementSibling?.tagName === 'INPUT' 
                                    ? label.nextElementSibling 
                                    : label.querySelector('input');
                                if (input && input.offsetParent !== null) {
                                    return {
                                        selector: `input[name="${input.name}"]`,
                                        id: input.id,
                                        name: input.name,
                                        placeholder: input.placeholder,
                                        type: input.type,
                                        value: input.value,
                                        foundVia: 'label'
                                    };
                                }
                            }
                        }
                        
                        return null;
                    }, possibleSelectors);
                    
                    if (foundField) {
                        crnSelector = foundField.selector;
                        console.log(`✓ CRN field found: ${foundField.selector}${foundField.foundVia ? ' (via ' + foundField.foundVia + ')' : ''}`);
                        console.log(`  ID: ${foundField.id}, Name: ${foundField.name}, Placeholder: ${foundField.placeholder}`);
                        console.log(`  Current value: '${foundField.value}'`);
                    } else {
                        console.log('  ✗ CRN field NOT found with any selector');
                        console.log('  Listing all text input fields on page:');
                        const allFields = await page.evaluate(() => {
                            return Array.from(document.querySelectorAll('input[type="text"], input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"]):not([type="button"]):not([type="submit"])'))
                                .map((inp, idx) => ({
                                    index: idx,
                                    id: inp.id,
                                    name: inp.name,
                                    type: inp.type,
                                    placeholder: inp.placeholder,
                                    value: inp.value,
                                    visible: inp.offsetParent !== null,
                                    nearbyLabel: inp.previousElementSibling?.textContent || inp.parentElement?.textContent || 'N/A'
                                }))
                                .filter(f => f.visible);
                        });
                        console.table(allFields);
                        throw new Error('CRN field not found on page');
                    }
                    
                    // Scroll to CRN field
                    await page.evaluate((selector) => {
                        const field = document.querySelector(selector);
                        if (field) {
                            field.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }
                    }, crnSelector);
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    
                    // Clear the CRN field completely
                    console.log('Clearing CRN field...');
                    await page.evaluate((selector) => {
                        const field = document.querySelector(selector);
                        if (field) {
                            field.value = '';
                            field.dispatchEvent(new Event('blur', { bubbles: true }));
                            field.dispatchEvent(new Event('focus', { bubbles: true }));
                            field.dispatchEvent(new Event('input', { bubbles: true }));
                            field.dispatchEvent(new Event('change', { bubbles: true }));
                        }
                    }, crnSelector);
                    
                    await new Promise(resolve => setTimeout(resolve, 800));
                    
                    // Method 1: Try direct DOM value setting (for framework-based forms)
                    console.log('Method 1: Direct DOM value setting...');
                    let entrySuccess = false;
                    try {
                        await page.evaluate((selector, value) => {
                            const field = document.querySelector(selector);
                            if (field) {
                                field.value = value;
                                field.dispatchEvent(new Event('blur', { bubbles: true }));
                                field.dispatchEvent(new Event('focus', { bubbles: true }));
                                field.dispatchEvent(new Event('input', { bubbles: true }));
                                field.dispatchEvent(new Event('change', { bubbles: true }));
                            }
                        }, crnSelector, crn);
                        
                        const verifyValue = await page.evaluate((selector) => {
                            return document.querySelector(selector)?.value || '';
                        }, crnSelector);
                        
                        if (verifyValue === crn) {
                            console.log('  ✓ Method 1 successful!');
                            entrySuccess = true;
                        } else {
                            console.log(`  ✗ Method 1 failed: expected '${crn}', got '${verifyValue}'`);
                        }
                    } catch (e) {
                        console.log(`  ✗ Method 1 error: ${e.message}`);
                    }
                    
                    // Method 2: Try page.type() with moderate delay
                    if (!entrySuccess) {
                        console.log('Method 2: page.type() with delay...');
                        try {
                            await page.focus(crnSelector);
                            await new Promise(resolve => setTimeout(resolve, 300));
                            await page.type(crnSelector, crn, { delay: 100 });
                            
                            const verifyValue = await page.evaluate((selector) => {
                                return document.querySelector(selector)?.value || '';
                            }, crnSelector);
                            
                            if (verifyValue === crn) {
                                console.log('  ✓ Method 2 successful!');
                                entrySuccess = true;
                            } else {
                                console.log(`  ✗ Method 2 failed: expected '${crn}', got '${verifyValue}'`);
                            }
                        } catch (e) {
                            console.log(`  ✗ Method 2 error: ${e.message}`);
                        }
                    }
                    
                    // Method 3: Character-by-character keyboard input
                    if (!entrySuccess) {
                        console.log('Method 3: Character-by-character keyboard input...');
                        try {
                            await page.focus(crnSelector);
                            await new Promise(resolve => setTimeout(resolve, 300));
                            
                            for (let i = 0; i < crn.length; i++) {
                                await page.keyboard.type(crn[i]);
                                await new Promise(resolve => setTimeout(resolve, 150));
                            }
                            
                            const verifyValue = await page.evaluate((selector) => {
                                return document.querySelector(selector)?.value || '';
                            }, crnSelector);
                            
                            if (verifyValue === crn) {
                                console.log('  ✓ Method 3 successful!');
                                entrySuccess = true;
                            } else {
                                console.log(`  ✗ Method 3 failed: expected '${crn}', got '${verifyValue}'`);
                            }
                        } catch (e) {
                            console.log(`  ✗ Method 3 error: ${e.message}`);
                        }
                    }
                    
                    // Wait for field update
                    await new Promise(resolve => setTimeout(resolve, 800));
                    
                    // Final verification
                    const finalValue = await page.evaluate((selector) => {
                        const field = document.querySelector(selector);
                        return field?.value || '';
                    }, crnSelector);
                    
                    console.log(`\n✓ CRN Entry Complete`);
                    console.log(`  Expected: ${crn}`);
                    console.log(`  Actual:   ${finalValue}`);
                    console.log(`  Match:    ${finalValue === crn ? '✓ YES' : '✗ NO'}`);
                    
                    if (finalValue !== crn) {
                        console.log(`  ⚠ WARNING: CRN mismatch! Expected '${crn}' but got '${finalValue}'`);
                        // Don't continue if CRN entry failed
                        throw new Error(`CRN entry failed: expected '${crn}', got '${finalValue}'`);
                    }
                    
                } catch (e) {
                    console.log(`  ✗ CRITICAL ERROR entering CRN: ${e.message}`);
                    console.log('  STOPPING - Cannot continue without valid CRN');
                    // Store error and skip this IPO
                    result.status = 'failed';
                    result.error = `CRN entry failed: ${e.message}`;
                    break;
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
                    console.log('\n=== PIN VERIFICATION STEP ===');
                    console.log('Verifying PIN...');
                    
                    const pins = [];
                    if (account.pin_1) pins.push(account.pin_1);
                    if (account.pin_2) pins.push(account.pin_2);
                    
                    if (pins.length === 0) {
                        console.log('  ✗ No PINs configured for this account');
                    } else {
                        let pinEntered = false;
                        
                        for (const pin of pins) {
                            console.log(`  Trying PIN...`);
                            
                            try {
                                // Use specific selector for PIN field - transactionPIN ID
                                const pinInput = await page.$('input#transactionPIN') || 
                                                 await page.$('input[name="transactionPIN"]');
                                
                                if (pinInput) {
                                    // Clear and focus PIN field
                                    await page.evaluate(() => {
                                        const field = document.querySelector('input#transactionPIN') || 
                                                     document.querySelector('input[name="transactionPIN"]');
                                        if (field) {
                                            field.value = '';
                                            field.dispatchEvent(new Event('blur', { bubbles: true }));
                                            field.dispatchEvent(new Event('focus', { bubbles: true }));
                                            field.dispatchEvent(new Event('input', { bubbles: true }));
                                        }
                                    });
                                    
                                    await page.focus('input#transactionPIN');
                                    await new Promise(resolve => setTimeout(resolve, 300));
                                    
                                    // Enter PIN
                                    await page.type('input#transactionPIN', pin, { delay: 100 });
                                    
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
                                    
                                    // Check for specific error messages
                                    const result = await page.evaluate(() => {
                                        let errorMessage = '';
                                        let hasSuccess = false;
                                        
                                        // PRIMARY: Check for toast-error messages (new format)
                                        const toastErrors = document.querySelectorAll('.toast-error');
                                        if (toastErrors.length > 0) {
                                            // Look for toast-message inside toast-error
                                            const toastMessage = toastErrors[0].querySelector('.toast-message');
                                            if (toastMessage) {
                                                // Get text from aria-label first (most reliable)
                                                const ariaLabel = toastMessage.getAttribute('aria-label');
                                                if (ariaLabel) {
                                                    errorMessage = ariaLabel.trim();
                                                } else {
                                                    // Fallback to text content
                                                    errorMessage = toastMessage.textContent.trim();
                                                }
                                            }
                                        }
                                        
                                        // SECONDARY: Check for standalone toast-message divs (if not already found)
                                        if (!errorMessage) {
                                            const toastMessages = document.querySelectorAll('.toast-message');
                                            if (toastMessages.length > 0) {
                                                const ariaLabel = toastMessages[0].getAttribute('aria-label');
                                                if (ariaLabel) {
                                                    errorMessage = ariaLabel.trim();
                                                } else {
                                                    errorMessage = toastMessages[0].textContent.trim();
                                                }
                                            }
                                        }
                                        
                                        // TERTIARY: Check for alert divs (legacy format)
                                        if (!errorMessage) {
                                            const alertElements = document.querySelectorAll('[class*="alert"]');
                                            for (const alert of alertElements) {
                                                const text = alert.textContent.trim();
                                                if (text.includes('You have entered wrong transaction PIN')) {
                                                    errorMessage = 'Wrong transaction PIN';
                                                    break;
                                                } else if (text.includes('Invalid CRN')) {
                                                    errorMessage = 'Invalid CRN provided';
                                                    break;
                                                }
                                            }
                                        }
                                        
                                        // Check for success indicators
                                        if (!errorMessage) {
                                            const successElements = document.querySelectorAll('[class*="success"], [class*="Success"]');
                                            if (successElements.length > 0) hasSuccess = true;
                                        }
                                        
                                        return {
                                            errorMessage: errorMessage,
                                            hasSuccess: hasSuccess,
                                            pageTitle: document.title
                                        };
                                    });
                                    
                                    if (result.errorMessage) {
                                        console.log(`  ✗ Error: ${result.errorMessage}`);
                                        ipoStatus.error = result.errorMessage;
                                        // If it's a PIN error, continue to next PIN, otherwise mark as failed and break
                                        if (result.errorMessage === 'Wrong transaction PIN') {
                                            console.log(`  Trying next PIN...`);
                                        } else {
                                            console.log(`  ✗ Application failed for ${ipo.companyName}: ${result.errorMessage}`);
                                            ipoStatus.status = 'failed';
                                            pinEntered = false;
                                            break;
                                        }
                                    } else if (result.hasSuccess) {
                                        console.log(`✓✓✓ Successfully applied for: ${ipo.companyName} ✓✓✓`);
                                        ipoStatus.status = 'success';
                                        pinEntered = true;
                                        break;
                                    } else {
                                        console.log(`✓✓✓ Application submitted for: ${ipo.companyName} ✓✓✓`);
                                        ipoStatus.status = 'success';
                                        pinEntered = true;
                                        break;
                                    }
                                }
                            } catch (e) {
                                console.log(`  ✗ Error with PIN: ${e.message}`);
                            }
                        }
                        
                        if (!pinEntered) {
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
        
        // Always send results callback, even on partial errors
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

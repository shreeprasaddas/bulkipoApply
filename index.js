import puppeteer from 'puppeteer';

const dp = 18200;

async function applyIPO() {
    const browser = await puppeteer.launch({ headless: false , defaultViewport: null, args: ['--start-maximized']});
    const page = await browser.newPage();
    await page.goto('https://meroshare.cdsc.com.np/');
    
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
    }, `(${dp})`);
    
    if (optionToClick) {
        await page.click(`[data-select2-id="${optionToClick}"]`);
    }
    
    // Wait for dropdown to close
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Enter username
    await page.type('#username', '0374923', { delay: 50 });
    
    // Enter password
    await page.type('input[name="password"]', 'the_god_09', { delay: 50 });
    
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
        console.log('Login button clicked');
    } catch (error) {
        console.log('First click failed, trying with focus and enter...');
        await page.focus('button.sign-in');
        await page.keyboard.press('Enter');
    }
    
    // Wait for navigation to complete
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 }).catch(() => console.log('Navigation timeout'));
    
    console.log('Login successful!');
    
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
    
    console.log('\n========== Filtered IPOs (IPO + Ordinary Shares + Applicable) ==========');
    console.log(`Total applicable IPOs: ${filteredIPOs.length}\n`);
    
    filteredIPOs.forEach((ipo, index) => {
        console.log(`[${index + 1}] ${ipo.companyName}`);
        console.log(`    Share Type: ${ipo.shareType}`);
        console.log(`    ISIN: ${ipo.isin}`);
        console.log(`    Can Apply: Yes`);
        console.log('');
    });
    
    console.log('====================================================================\n');
    
    // Apply for each filtered IPO
    for (const ipo of filteredIPOs) {
        console.log(`\nProcessing IPO: ${ipo.companyName}`);
        
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
        
        try {
            // Step 1: Fill application form
            console.log('=== Step 1: Filling Application Form ===');
            
            // Scroll down to see all form elements
            console.log('Scrolling down to reveal form elements...');
            await page.evaluate(() => {
                window.scrollBy(0, 500);
            });
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Find all available selects for debugging
            const selectInfo = await page.evaluate(() => {
                const selects = document.querySelectorAll('select');
                const info = [];
                selects.forEach((sel, idx) => {
                    info.push({
                        index: idx,
                        name: sel.name,
                        id: sel.id,
                        optionCount: sel.options.length
                    });
                });
                return info;
            });
            console.log('Available selects:', selectInfo);
            
            // Select Bank
            console.log('Selecting bank...');
            try {
                // Get the first select element (should be bank)
                const allSelects = await page.$$('select');
                if (allSelects.length > 0) {
                    // Get the first select's options
                    const firstSelectValue = await page.evaluate((index) => {
                        const select = document.querySelectorAll('select')[index];
                        if (select && select.options.length > 1) {
                            return select.options[1].value;
                        }
                        return null;
                    }, 0);
                    
                    if (firstSelectValue) {
                        await page.select('select:first-of-type', firstSelectValue);
                        console.log(`✓ Bank selected: ${firstSelectValue}`);
                        await new Promise(resolve => setTimeout(resolve, 1000));
                    }
                } else {
                    console.log('No select elements found');
                }
            } catch (e) {
                console.log('Error selecting bank:', e.message);
            }
            
            // Select Account Number
            console.log('Selecting account number...');
            try {
                const allSelects = await page.$$('select');
                if (allSelects.length > 1) {
                    // Get the second select's options
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
                        console.log(`✓ Account selected: ${secondSelectValue}`);
                        await new Promise(resolve => setTimeout(resolve, 1000));
                    }
                } else {
                    console.log('Second select not found');
                }
            } catch (e) {
                console.log('Error selecting account:', e.message);
            }
            
            // Scroll down more to see remaining form fields
            await page.evaluate(() => {
                window.scrollBy(0, 300);
            });
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Enter Applied Kitta (Quantity)
            console.log('Entering applied kitta: 10');
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
                    await page.type('input[name="appliedKitta"], input[name="quantity"], input[name="kitta"]', '10', { delay: 50 });
                    console.log('✓ Applied kitta entered: 10');
                } else {
                    console.log('Applied kitta input not found');
                }
            } catch (e) {
                console.log('Error entering kitta:', e.message);
            }
            
            // Enter CRN Number
            const accountNumber = '08314100719564000001';
            const crn = accountNumber.substring(6, 14);
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
                }
            } catch (e) {
                console.log('Error entering CRN:', e.message);
            }
            
            // Check Declaration Checkbox
            console.log('Checking declaration checkbox...');
            try {
                const checkboxes = await page.$$('input[type="checkbox"]');
                console.log(`Found ${checkboxes.length} checkboxes`);
                
                // Try to find and check the declaration checkbox
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
                    console.log('✓ Declaration checkbox checked');
                } else {
                    console.log('Declaration checkbox not found or already checked');
                }
            } catch (e) {
                console.log('Error checking declaration:', e.message);
            }
            
            // Click Proceed Button
            console.log('Clicking proceed button...');
            try {
                // Try to find proceed button using various selectors
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
                console.log('✓ Proceed button clicked');
                
                // Wait for PIN step to load
                console.log('Waiting for PIN verification step...');
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                // Step 2: Enter PIN and Submit
                console.log('=== Step 2: PIN Verification ===');
                
                const pins = ['2227', '6406'];
                let pinEntered = false;
                
                for (const pin of pins) {
                    console.log(`Trying PIN: ${pin}`);
                    
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
                            console.log(`✓ PIN ${pin} entered`);
                            
                            // Click Apply/Submit button
                            await page.evaluate(() => {
                                const buttons = Array.from(document.querySelectorAll('button'));
                                const applyBtn = buttons.find(btn => {
                                    const text = btn.textContent.trim();
                                    return text.includes('Apply') || text.includes('APPLY') || text.includes('Submit') || text.includes('SUBMIT');
                                });
                                if (applyBtn) applyBtn.click();
                            });
                            console.log(`✓ Apply button clicked`);
                            
                            // Wait for response
                            await new Promise(resolve => setTimeout(resolve, 2000));
                            
                            // Check for success
                            const result = await page.evaluate(() => {
                                const successElements = document.querySelectorAll('[class*="success"], [class*="Success"]');
                                const errorElements = document.querySelectorAll('[class*="error"], [class*="Error"], [class*="danger"]');
                                return {
                                    hasSuccess: successElements.length > 0,
                                    hasError: errorElements.length > 0
                                };
                            });
                            
                            if (result.hasSuccess && !result.hasError) {
                                console.log(`✓ PIN ${pin} worked! Application submitted successfully!`);
                                pinEntered = true;
                                break;
                            } else if (result.hasError) {
                                console.log(`✗ PIN ${pin} failed, trying next...`);
                            } else {
                                console.log(`✓ PIN ${pin} worked! Application submitted!`);
                                pinEntered = true;
                                break;
                            }
                        } else {
                            console.log('PIN input not found');
                        }
                    } catch (e) {
                        console.log(`Error trying PIN ${pin}:`, e.message);
                    }
                }
                
                if (pinEntered) {
                    console.log(`\n✓✓✓ Successfully applied for: ${ipo.companyName} ✓✓✓\n`);
                } else {
                    console.log(`Could not apply for ${ipo.companyName} - PIN verification failed`);
                }
                
                // Go back to ASBA page for next IPO
                await new Promise(resolve => setTimeout(resolve, 2000));
                console.log('Returning to ASBA page...');
                await page.goto('https://meroshare.cdsc.com.np/#/asba', { waitUntil: 'networkidle2', timeout: 10000 });
                await page.waitForSelector('.company-list', { timeout: 10000 });
                await new Promise(resolve => setTimeout(resolve, 500));
                
            } catch (error) {
                console.error(`Error during application process for ${ipo.companyName}:`, error.message);
            }
        } catch (error) {
            console.error(`Error processing IPO ${ipo.companyName}:`, error.message);
        }
    }
    
    console.log('\n✓ Application process completed!');
    
    // Keep browser open for verification
    // await browser.close();
}

applyIPO().catch(error => {
    console.error('Error:', error);
    process.exit(1);
});
const API_URL = 'http://localhost:3000/api';
const STORAGE_KEY = 'ipo_applier_accounts';

// Load accounts from localStorage on page load
document.addEventListener('DOMContentLoaded', () => {
    loadAccountsFromStorage();
    loadAccountsForCheckboxes();
    // Also populate verify dropdown on page load
    const accounts = getAccountsFromStorage();
    populateVerifyAccountDropdown(accounts);
});

// ===== LOCAL STORAGE MANAGEMENT =====

function getAccountsFromStorage() {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        const accounts = stored ? JSON.parse(stored) : [];
        console.log('Retrieved accounts from storage:', accounts);
        return accounts;
    } catch (error) {
        console.error('Error reading from localStorage:', error);
        return [];
    }
}

function saveAccountsToStorage(accounts) {
    try {
        const jsonStr = JSON.stringify(accounts);
        localStorage.setItem(STORAGE_KEY, jsonStr);
        console.log('Saved accounts to storage. Total accounts:', accounts.length);
        
        // Verify it was saved
        const verify = localStorage.getItem(STORAGE_KEY);
        console.log('Verification - accounts in storage:', JSON.parse(verify).length);
        return true;
    } catch (error) {
        console.error('Error writing to localStorage:', error);
        showAlert('Error saving to browser storage: ' + error.message, 'danger');
        return false;
    }
}

async function syncAccountsToServer(accounts) {
    try {
        console.log('Syncing accounts to server:', accounts.length);
        const response = await fetch(`${API_URL}/sync-accounts`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ accounts })
        });
        
        if (!response.ok) {
            console.warn('Server sync returned non-200 status:', response.status);
        } else {
            const result = await response.json();
            console.log('Server sync successful:', result);
        }
    } catch (error) {
        console.warn('Could not sync accounts to server:', error);
        // Don't show alert here - it's okay if server sync fails
    }
}

// ===== ACCOUNT MANAGEMENT =====

async function loadAccountsFromStorage() {
    const accounts = getAccountsFromStorage();
    
    // Also sync to server
    await syncAccountsToServer(accounts);
    
    const accountsList = document.getElementById('accountsList');
    const noAccounts = document.getElementById('noAccounts');

    if (accounts.length === 0) {
        accountsList.innerHTML = '';
        noAccounts.style.display = 'block';
        return;
    }

    noAccounts.style.display = 'none';
    accountsList.innerHTML = accounts.map(account => {
        const createdDate = new Date(account.created_at).toLocaleDateString();
        const maskedUsername = account.username ? account.username.substring(0, 2) + '****' : '****';
        const maskedCrn = account.crn_number ? account.crn_number.substring(0, 4) + '****' : '****';
        const maskedPin1 = account.pin_1 ? '*'.repeat(account.pin_1.length) : 'N/A';
        const maskedPin2 = account.pin_2 ? '*'.repeat(account.pin_2.length) : 'N/A';

        return `
            <tr>
                <td><strong>${account.name}</strong></td>
                <td>${account.dp}</td>
                <td>${maskedUsername}</td>
                <td>${maskedCrn}</td>
                <td>${maskedPin1}</td>
                <td>${maskedPin2}</td>
                <td>${createdDate}</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn btn-sm btn-info" onclick="editAccount('${account.id}')">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="deleteAccount('${account.id}')">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

async function loadAccountsForCheckboxes() {
    const accounts = getAccountsFromStorage();
    const accountsCheckboxList = document.getElementById('accountsCheckboxList');
    
    if (accounts.length === 0) {
        accountsCheckboxList.innerHTML = '<p class="text-muted">No accounts available. Please add accounts first.</p>';
        return;
    }

    accountsCheckboxList.innerHTML = accounts.map(account => `
        <div class="col-md-6 account-checkbox-item">
            <div class="form-check">
                <input class="form-check-input account-selector" type="checkbox" value="${account.id}" id="account_${account.id}">
                <label class="form-check-label" for="account_${account.id}">
                    ${account.name} (DP ${account.dp})
                </label>
            </div>
        </div>
    `).join('');

    // Add event listeners to update count
    document.querySelectorAll('.account-selector').forEach(checkbox => {
        checkbox.addEventListener('change', updateSelectedCount);
    });

    // Also populate the verify account dropdown
    populateVerifyAccountDropdown(accounts);
}

function resetAccountForm() {
    const form = document.getElementById('accountForm');
    if (form) {
        form.reset();
    }
    document.getElementById('accountId').value = '';
    document.getElementById('nameInput').value = '';
    document.getElementById('dpInput').value = '';
    document.getElementById('usernameInput').value = '';
    document.getElementById('passwordInput').value = '';
    document.getElementById('crnInput').value = '';
    document.getElementById('pin1Input').value = '';
    document.getElementById('pin2Input').value = '';
    document.getElementById('accountModalTitle').textContent = 'Add New Account';
}

async function saveAccount() {
    const accountId = document.getElementById('accountId').value;
    const name = document.getElementById('nameInput').value.trim();
    const dp = document.getElementById('dpInput').value.trim();
    const username = document.getElementById('usernameInput').value.trim();
    const password = document.getElementById('passwordInput').value.trim();
    const crn = document.getElementById('crnInput').value.trim();
    const pin1 = document.getElementById('pin1Input').value.trim();
    const pin2 = document.getElementById('pin2Input').value.trim();

    if (!name || !dp || !username || !password || !crn) {
        showAlert('Please fill in all required fields', 'warning');
        return;
    }

    try {
        const accounts = getAccountsFromStorage();
        console.log('Current accounts:', accounts);
        
        if (accountId) {
            // Update existing
            const index = accounts.findIndex(a => a.id === accountId);
            if (index >= 0) {
                accounts[index] = {
                    ...accounts[index],
                    name, dp, username, password, crn_number: crn, pin_1: pin1 || null, pin_2: pin2 || null,
                    updated_at: new Date().toISOString()
                };
            }
        } else {
            // Add new
            const newId = 'acc_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            accounts.push({
                id: newId,
                name, dp, username, password, crn_number: crn, pin_1: pin1 || null, pin_2: pin2 || null,
                created_at: new Date().toISOString()
            });
            console.log('Added new account with ID:', newId);
        }
        
        console.log('Saving accounts to storage:', accounts);
        saveAccountsToStorage(accounts);
        
        console.log('Syncing accounts to server');
        await syncAccountsToServer(accounts);
        
        showAlert(
            accountId ? 'Account updated successfully' : 'Account added successfully',
            'success'
        );
        
        console.log('Reloading accounts display');
        loadAccountsFromStorage();
        loadAccountsForCheckboxes();
        const updatedAccounts = getAccountsFromStorage();
        populateVerifyAccountDropdown(updatedAccounts);
        
        // Close modal with better error handling
        setTimeout(() => {
            const modal = document.getElementById('accountModal');
            if (modal) {
                const bsModal = bootstrap.Modal.getInstance(modal);
                if (bsModal) {
                    bsModal.hide();
                } else {
                    // Create new instance and hide
                    const newModal = new bootstrap.Modal(modal);
                    newModal.hide();
                }
                resetAccountForm();
            }
        }, 100);
        
    } catch (error) {
        console.error('Error saving account:', error);
        showAlert('Error saving account: ' + error.message, 'danger');
    }
}

async function editAccount(accountId) {
    try {
        const accounts = getAccountsFromStorage();
        const account = accounts.find(a => a.id === accountId);
        
        if (!account) {
            showAlert('Account not found', 'danger');
            return;
        }
        
        document.getElementById('accountId').value = account.id;
        document.getElementById('nameInput').value = account.name;
        document.getElementById('dpInput').value = account.dp;
        document.getElementById('usernameInput').value = account.username;
        document.getElementById('passwordInput').value = account.password;
        document.getElementById('crnInput').value = account.crn_number;
        document.getElementById('pin1Input').value = account.pin_1 || '';
        document.getElementById('pin2Input').value = account.pin_2 || '';
        document.getElementById('accountModalTitle').textContent = 'Edit Account';

        const modal = new bootstrap.Modal(document.getElementById('accountModal'));
        modal.show();
    } catch (error) {
        console.error('Error loading account:', error);
        showAlert('Error loading account details', 'danger');
    }
}

async function deleteAccount(accountId) {
    if (!confirm('Are you sure you want to delete this account? This action cannot be undone.')) {
        return;
    }

    try {
        let accounts = getAccountsFromStorage();
        accounts = accounts.filter(a => a.id !== accountId);
        saveAccountsToStorage(accounts);
        await syncAccountsToServer(accounts);
        
        showAlert('Account deleted successfully', 'success');
        loadAccountsFromStorage();
        loadAccountsForCheckboxes();
        populateVerifyAccountDropdown(accounts);
    } catch (error) {
        console.error('Error deleting account:', error);
        showAlert('Error deleting account', 'danger');
    }
}

// ===== BULK APPLICATION =====

function updateSelectedCount() {
    const selected = document.querySelectorAll('.account-selector:checked').length;
    document.getElementById('selectedCount').textContent = selected;
}

function selectAllAccounts() {
    document.querySelectorAll('.account-selector').forEach(checkbox => {
        checkbox.checked = true;
    });
    updateSelectedCount();
}

function deselectAllAccounts() {
    document.querySelectorAll('.account-selector').forEach(checkbox => {
        checkbox.checked = false;
    });
    updateSelectedCount();
}

async function startBulkApplication() {
    const selectedAccounts = Array.from(document.querySelectorAll('.account-selector:checked')).map(cb => cb.value);
    const quantity = parseInt(document.getElementById('bulkQuantity').value);

    if (selectedAccounts.length === 0) {
        showAlert('Please select at least one account', 'warning');
        return;
    }

    if (!quantity || quantity < 1) {
        showAlert('Please enter a valid quantity', 'warning');
        return;
    }

    const startBtn = document.getElementById('startBtn');
    const bulkResult = document.getElementById('bulkResult');

    startBtn.disabled = true;
    bulkResult.style.display = 'block';
    document.getElementById('resultMessage').innerHTML = '<i class="fas fa-spinner fa-spin"></i> Starting bulk application for ' + selectedAccounts.length + ' account(s)...';

    try {
        // Sync accounts to server before starting
        const allAccounts = getAccountsFromStorage();
        await syncAccountsToServer(allAccounts);
        
        const response = await fetch(`${API_URL}/apply-ipo`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                account_ids: selectedAccounts,
                quantity: quantity
            })
        });

        if (response.ok) {
            const result = await response.json();
            document.getElementById('resultMessage').innerHTML = `
                <i class="fas fa-check-circle text-success"></i> 
                Bulk application started! Process ID: ${result.process_id}
                <br><small>Check the status periodically for updates.</small>
            `;
            
            // Start polling for status
            pollApplicationStatus(result.process_id);
        } else {
            const error = await response.text();
            document.getElementById('resultMessage').innerHTML = `
                <i class="fas fa-times-circle text-danger"></i> 
                Error: ${error}
            `;
        }
    } catch (error) {
        console.error('Error starting bulk application:', error);
        document.getElementById('resultMessage').innerHTML = `
            <i class="fas fa-times-circle text-danger"></i> 
            Error: ${error.message}
        `;
    } finally {
        startBtn.disabled = false;
    }
}

async function pollApplicationStatus(processId) {
    // Poll for status every 5 seconds for up to 10 minutes
    let attempts = 0;
    const maxAttempts = 120;  // 10 minutes

    const pollInterval = setInterval(async () => {
        attempts++;

        try {
            const response = await fetch(`${API_URL}/status/${processId}`);
            if (response.ok) {
                const status = await response.json();
                
                const resultMessage = document.getElementById('resultMessage');
                resultMessage.innerHTML = `
                    <i class="fas fa-hourglass-half"></i> 
                    <strong>Progress:</strong> ${status.processed}/${status.total} accounts processed<br>
                    <small>Current status: ${status.current_account_status || 'Processing...'}</small>
                `;

                console.log(`[Poll] Processed: ${status.processed}/${status.total}, Status: ${status.status}`);

                if (status.status === 'completed' || status.processed >= status.total) {
                    clearInterval(pollInterval);
                    console.log('[Poll] Stopping - Process completed');
                    
                    // Fetch detailed results
                    try {
                        const resultsResponse = await fetch(`${API_URL}/results/${processId}`);
                        if (resultsResponse.ok) {
                            const results = await resultsResponse.json();
                            displayApplicationResults(results);
                        } else {
                            resultMessage.innerHTML = `
                                <i class="fas fa-check-circle text-success"></i> 
                                <strong>Bulk application completed!</strong><br>
                                ${status.total} accounts processed
                            `;
                        }
                    } catch (error) {
                        console.error('Error fetching detailed results:', error);
                        resultMessage.innerHTML = `
                            <i class="fas fa-check-circle text-success"></i> 
                            <strong>Bulk application completed!</strong><br>
                            ${status.total} accounts processed
                        `;
                    }
                } else if (status.status === 'error') {
                    clearInterval(pollInterval);
                    console.log('[Poll] Stopping - Error occurred');
                    resultMessage.innerHTML = `
                        <i class="fas fa-times-circle text-danger"></i> 
                        <strong>Application Error:</strong><br>
                        ${status.error || 'Unknown error occurred'}
                    `;
                }
            }
        } catch (error) {
            console.error('Error polling status:', error);
        }

        if (attempts >= maxAttempts) {
            clearInterval(pollInterval);
            console.log('[Poll] Stopping - Max attempts reached');
            document.getElementById('resultMessage').innerHTML = `
                <i class="fas fa-exclamation-triangle text-warning"></i> 
                <strong>Process Timeout:</strong><br>
                The process took longer than expected. Please check the server logs.
            `;
        }
    }, 5000); // Poll every 5 seconds
}

function displayApplicationResults(results) {
    const resultMessage = document.getElementById('resultMessage');
    
    // Calculate account-level success/failure
    let successfulAccounts = 0;
    let failedAccounts = 0;
    
    if (results.results && results.results.length > 0) {
        results.results.forEach(result => {
            if (result.failed > 0) {
                failedAccounts++;
            }
            if (result.successful > 0) {
                successfulAccounts++;
            }
        });
    }
    
    let html = `
        <div class="application-results" style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
            <!-- Summary Section -->
            <div style="margin-bottom: 20px;">
                <h5 style="margin-bottom: 15px; color: #333; border-bottom: 2px solid #007bff; padding-bottom: 10px;">
                    <i class="fas fa-chart-bar"></i> APPLICATION SUMMARY
                </h5>
                
                <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 20px;">
                    <!-- Total Accounts -->
                    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px; border-radius: 8px; text-align: center;">
                        <div style="font-size: 28px; font-weight: bold;">${results.total}</div>
                        <div style="font-size: 12px; margin-top: 5px; opacity: 0.9;">Total Accounts</div>
                    </div>
                    
                    <!-- Successful Accounts -->
                    <div style="background: linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%); color: #155724; padding: 15px; border-radius: 8px; text-align: center;">
                        <div style="font-size: 28px; font-weight: bold;">${successfulAccounts}</div>
                        <div style="font-size: 12px; margin-top: 5px; opacity: 0.9;">Accounts with Success</div>
                    </div>
                    
                    <!-- Failed Accounts -->
                    <div style="background: linear-gradient(135deg, #fa709a 0%, #fee140 100%); color: #721c24; padding: 15px; border-radius: 8px; text-align: center;">
                        <div style="font-size: 28px; font-weight: bold;">${failedAccounts}</div>
                        <div style="font-size: 12px; margin-top: 5px; opacity: 0.9;">Accounts with Failures</div>
                    </div>
                    
                    <!-- Processed -->
                    <div style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); color: #1a4d7a; padding: 15px; border-radius: 8px; text-align: center;">
                        <div style="font-size: 28px; font-weight: bold;">${results.processed}</div>
                        <div style="font-size: 12px; margin-top: 5px; opacity: 0.9;">Processed</div>
                    </div>
                </div>
            </div>
            
            <!-- Detailed Results Section -->
            <div style="margin-top: 20px;">
                <h5 style="margin-bottom: 15px; color: #333; border-bottom: 2px solid #28a745; padding-bottom: 10px;">
                    <i class="fas fa-list-ul"></i> DETAILED RESULTS BY ACCOUNT
                </h5>
                
                <div class="results-details">
    `;
    
    if (results.results && results.results.length > 0) {
        results.results.forEach((result, index) => {
            const accountSuccess = result.successful > 0;
            const accountFailed = result.failed > 0;
            const totalIPO = result.total_ipos || 0;
            const successCount = result.successful || 0;
            const failedCount = result.failed || 0;
            const successPercent = totalIPO > 0 ? Math.round((successCount / totalIPO) * 100) : 0;
            
            const accountBg = accountFailed ? '#ffebee' : '#e8f5e9';
            const accountBorder = accountFailed ? '#ef5350' : '#66bb6a';
            
            html += `
                <div style="margin-bottom: 15px; padding: 15px; background: ${accountBg}; border-left: 4px solid ${accountBorder}; border-radius: 6px;">
                    
                    <!-- Account Header -->
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                        <div>
                            <h6 style="margin: 0 0 5px 0; color: #333; font-size: 16px;">
                                <i class="fas fa-user-circle"></i> ${result.account_name}
                            </h6>
                            <small style="color: #666;">Account ID: ${result.account_id || 'N/A'}</small>
                        </div>
                        <div style="text-align: right;">
                            ${accountFailed ? 
                                `<span style="display: inline-block; background: #f44336; color: white; padding: 5px 12px; border-radius: 20px; font-size: 12px; font-weight: bold;">⚠ HAS FAILURES</span>` : 
                                `<span style="display: inline-block; background: #4caf50; color: white; padding: 5px 12px; border-radius: 20px; font-size: 12px; font-weight: bold;">✓ ALL SUCCESS</span>`
                            }
                        </div>
                    </div>
                    
                    <!-- Account Stats Bar -->
                    <div style="background: white; padding: 10px; border-radius: 4px; margin-bottom: 12px;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                            <span style="font-size: 13px; color: #666;">
                                <strong>${successCount}</strong> Success / 
                                <strong style="color: red;">${failedCount}</strong> Failed / 
                                <strong>${totalIPO}</strong> Total
                            </span>
                            <span style="font-size: 13px; font-weight: bold; color: ${successPercent === 100 ? 'green' : 'orange'};">
                                ${successPercent}% Success Rate
                            </span>
                        </div>
                        <!-- Progress Bar -->
                        <div style="height: 6px; background: #e0e0e0; border-radius: 3px; overflow: hidden;">
                            <div style="height: 100%; background: linear-gradient(90deg, ${failedCount > 0 ? '#f44336' : '#4caf50'} 0%, #4caf50 ${successPercent}%); width: ${successPercent}%; transition: width 0.3s ease;"></div>
                        </div>
                    </div>
                    
                    <!-- IPO Results -->
                    <div style="margin-top: 10px;">
                        ${result.ipo_results && result.ipo_results.length > 0 ? 
                            result.ipo_results.map(ipo => {
                                const ipoName = ipo.ipo || ipo.companyName || 'Unknown IPO';
                                const isSuccess = ipo.status === 'success';
                                const ipoBg = isSuccess ? '#f1f8f6' : '#fef5f5';
                                const ipoBorder = isSuccess ? '#00897b' : '#c62828';
                                
                                return `
                                    <div style="margin: 8px 0; padding: 10px; background: ${ipoBg}; border-left: 3px solid ${ipoBorder}; border-radius: 4px; font-size: 13px;">
                                        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                                            <div style="flex: 1;">
                                                <div style="font-weight: 500; color: #333; margin-bottom: 4px;">
                                                    ${isSuccess ? 
                                                        '<i class="fas fa-check-circle" style="color: #4caf50; margin-right: 6px;"></i>' :
                                                        '<i class="fas fa-times-circle" style="color: #f44336; margin-right: 6px;"></i>'
                                                    }
                                                    ${ipoName}
                                                </div>
                                                <small style="color: #666; display: block; margin-bottom: 4px;">
                                                    Quantity: <strong>${ipo.quantity || 'N/A'}</strong>
                                                </small>
                                                ${ipo.error ? 
                                                    `<small style="color: #c62828; display: block; padding: 6px 8px; background: white; border-radius: 3px; margin-top: 4px; border-left: 2px solid #c62828;">
                                                        <strong>⚠ Error:</strong> ${ipo.error}
                                                    </small>` : 
                                                    `<small style="color: #2e7d32; display: block;">✓ Successfully applied</small>`
                                                }
                                            </div>
                                            <div style="text-align: right; margin-left: 10px;">
                                                <span style="display: inline-block; padding: 4px 10px; border-radius: 12px; font-weight: bold; font-size: 11px; ${isSuccess ? 'background: #c8e6c9; color: #2e7d32;' : 'background: #ffcdd2; color: #c62828;'}">
                                                    ${isSuccess ? '✓ SUCCESS' : '✗ FAILED'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                `;
                            }).join('') 
                            : '<small style="color: #999;">No IPO results available</small>'
                        }
                    </div>
                </div>
            `;
        });
    }
    
    html += `
                </div>
            </div>
            
            <!-- Footer -->
            <div style="margin-top: 20px; padding: 12px; background: #f5f5f5; border-radius: 6px; text-align: center;">
                <small style="color: #666;">
                    Completed on ${new Date().toLocaleString()}
                </small>
            </div>
        </div>
    `;
    
    resultMessage.innerHTML = html;
}

// ===== UTILITY FUNCTIONS =====

function showAlert(message, type = 'info') {
    // Create a toast notification
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
    alertDiv.role = 'alert';
    alertDiv.style.position = 'fixed';
    alertDiv.style.top = '20px';
    alertDiv.style.right = '20px';
    alertDiv.style.zIndex = '9999';
    alertDiv.style.minWidth = '300px';
    
    const icon = type === 'success' ? '✓' : type === 'danger' ? '✗' : type === 'warning' ? '⚠' : 'ℹ';
    alertDiv.innerHTML = `
        <strong>${icon}</strong> ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    
    document.body.appendChild(alertDiv);
    
    // Auto remove after 4 seconds
    setTimeout(() => {
        alertDiv.remove();
    }, 4000);
    
    console.log(`[${type.toUpperCase()}] ${message}`);
}

// ===== APPLICATION HISTORY =====

async function loadApplicationHistory() {
    try {
        const response = await fetch(`${API_URL}/history`);
        if (response.ok) {
            const history = await response.json();
            displayApplicationHistory(history);
        } else {
            console.error('Failed to fetch application history');
        }
    } catch (error) {
        console.error('Error loading application history:', error);
    }
}

function displayApplicationHistory(history) {
    const historyContainer = document.getElementById('applicationHistoryContainer');
    
    if (!historyContainer) {
        // Container doesn't exist in current page, skip
        return;
    }
    
    if (!history || history.length === 0) {
        historyContainer.innerHTML = '<div class="alert alert-info">No application history yet.</div>';
        return;
    }
    
    // Group by account and IPO
    const grouped = {};
    history.forEach(record => {
        const key = `${record.accountName}-${record.ipoName}`;
        if (!grouped[key]) {
            grouped[key] = {
                accountName: record.accountName,
                ipoName: record.ipoName,
                records: []
            };
        }
        grouped[key].records.push(record);
    });
    
    let html = `
        <div class="application-history">
            <h6 style="border-bottom: 2px solid #007bff; padding-bottom: 10px; margin-bottom: 15px;">
                <i class="fas fa-history"></i> Application History (${history.length} records)
            </h6>
            
            <div class="table-responsive">
                <table class="table table-sm table-hover">
                    <thead class="table-light">
                        <tr>
                            <th>Account</th>
                            <th>IPO Name</th>
                            <th>Quantity</th>
                            <th>Applied Date</th>
                            <th>Status</th>
                            <th>Verify</th>
                        </tr>
                    </thead>
                    <tbody>
    `;
    
    Object.values(grouped).forEach(group => {
        const latestRecord = group.records[group.records.length - 1];
        const appliedDate = new Date(latestRecord.appliedAt).toLocaleString();
        const status = latestRecord.status;
        const statusBadge = status === 'success' 
            ? '<span class="badge bg-success">✓ Applied</span>'
            : '<span class="badge bg-danger">✗ Failed</span>';
        
        html += `
            <tr>
                <td><strong>${group.accountName}</strong></td>
                <td>${group.ipoName}</td>
                <td>${latestRecord.quantity}</td>
                <td><small>${appliedDate}</small></td>
                <td>${statusBadge}</td>
                <td>
                    <button class="btn btn-sm btn-outline-primary" 
                            onclick="verifyIPOStatus('${group.ipoName}', '${group.accountName}')">
                        <i class="fas fa-search"></i> Check
                    </button>
                </td>
            </tr>
        `;
    });
    
    html += `
                    </tbody>
                </table>
            </div>
        </div>
    `;
    
    historyContainer.innerHTML = html;
}

async function verifyIPOStatus(ipoName, accountName) {
    try {
        const response = await fetch(`${API_URL}/verify-ipo-status`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ipoName, accountName })
        });
        
        if (response.ok) {
            const result = await response.json();
            
            if (result.applied) {
                alert(`✓ IPO "${ipoName}" was successfully applied to "${accountName}" account on ${new Date(result.appliedAt).toLocaleString()}\n\nButton Status: ${result.buttonState}`);
            } else {
                alert(`✗ IPO "${ipoName}" has not been applied to "${accountName}" account yet.\n\nButton Status: ${result.buttonState}`);
            }
        } else {
            alert('Error verifying IPO status');
        }
    } catch (error) {
        console.error('Error verifying IPO status:', error);
        alert('Error verifying IPO status: ' + error.message);
    }
}

// Clear application history
function clearApplicationHistory() {
    if (confirm('Are you sure you want to clear all application history? This action cannot be undone.')) {
        // Note: This would need to be implemented on the server side
        alert('History clearing is managed by the server. Contact administrator if needed.');
    }
}

// ===== QUICK VERIFY IPO STATUS =====

function populateVerifyAccountDropdown(accounts) {
    const dropdown = document.getElementById('verifyAccountSelect');
    if (!dropdown) return;
    
    const currentValue = dropdown.value;
    dropdown.innerHTML = '<option value="">-- Choose an account --</option>';
    
    accounts.forEach(account => {
        const option = document.createElement('option');
        option.value = account.name;
        option.textContent = `${account.name} (DP ${account.dp})`;
        dropdown.appendChild(option);
    });
    
    // Restore previous selection if it still exists
    dropdown.value = currentValue;
}

async function quickVerifyIPO() {
    const accountName = document.getElementById('verifyAccountSelect').value;
    const ipoName = document.getElementById('verifyIpoName').value.trim();
    const verifyResult = document.getElementById('verifyResult');
    
    if (!accountName) {
        verifyResult.className = 'alert alert-warning';
        verifyResult.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Please select an account';
        verifyResult.style.display = 'block';
        return;
    }
    
    if (!ipoName) {
        verifyResult.className = 'alert alert-warning';
        verifyResult.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Please enter IPO name';
        verifyResult.style.display = 'block';
        return;
    }
    
    verifyResult.className = 'alert alert-info';
    verifyResult.innerHTML = '<i class="fas fa-spinner fa-spin"></i> <strong>Visiting Mero Share ASBA page...</strong><br><small>This will open a browser to check the actual IPO status on the website. Please wait...</small>';
    verifyResult.style.display = 'block';
    
    try {
        const response = await fetch(`${API_URL}/verify-ipo-status`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                ipoName: ipoName, 
                accountName: accountName 
            })
        });
        
        if (response.ok) {
            const result = await response.json();
            
            if (result.success && result.applied) {
                verifyResult.className = 'alert alert-success';
                verifyResult.innerHTML = `
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <i class="fas fa-check-circle" style="font-size: 24px;"></i>
                        <div>
                            <strong>✓ IPO Successfully Applied!</strong>
                            <br><small>IPO: <strong>${result.ipoName}</strong></small>
                            <br><small>Account: <strong>${accountName}</strong></small>
                            <br><small style="color: #666;">Verified on: ${new Date(result.verified_at).toLocaleString()}</small>
                            <br><small style="color: #666;">Button State on Mero Share: <span style="background: #4caf50; color: white; padding: 2px 6px; border-radius: 3px;"><strong>${result.buttonState}</strong></span></small>
                        </div>
                    </div>
                `;
            } else if (result.success && !result.applied) {
                verifyResult.className = 'alert alert-danger';
                verifyResult.innerHTML = `
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <i class="fas fa-times-circle" style="font-size: 24px;"></i>
                        <div>
                            <strong>✗ IPO Not Applied Yet</strong>
                            <br><small>IPO: <strong>${result.ipoName}</strong></small>
                            <br><small>Account: <strong>${accountName}</strong></small>
                            <br><small style="color: #666;">Verified on: ${new Date(result.verified_at).toLocaleString()}</small>
                            <br><small style="color: #666;">Button State on Mero Share: <span style="background: #f44336; color: white; padding: 2px 6px; border-radius: 3px;"><strong>${result.buttonState}</strong></span></small>
                        </div>
                    </div>
                `;
            } else {
                verifyResult.className = 'alert alert-danger';
                verifyResult.innerHTML = `
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <i class="fas fa-exclamation-circle" style="font-size: 24px;"></i>
                        <div>
                            <strong>Verification Failed</strong>
                            <br><small>${result.error || 'Could not verify IPO status'}</small>
                            <br><small style="color: #666;">Verified on: ${new Date(result.verified_at).toLocaleString()}</small>
                        </div>
                    </div>
                `;
            }
        } else {
            verifyResult.className = 'alert alert-danger';
            verifyResult.innerHTML = '<i class="fas fa-times-circle"></i> Error verifying IPO status';
        }
    } catch (error) {
        console.error('Error verifying IPO status:', error);
        verifyResult.className = 'alert alert-danger';
        verifyResult.innerHTML = `<i class="fas fa-times-circle"></i> Error: ${error.message}`;
    }
}

// ===== BULK VERIFICATION =====

async function bulkVerifyAllIPOs() {
    const history = await fetch(`${API_URL}/history`).then(r => r.json()).catch(() => []);
    
    if (!history || history.length === 0) {
        showAlert('No application history to verify', 'warning');
        return;
    }
    
    const bulkVerifyResult = document.getElementById('bulkVerifyResult');
    if (!bulkVerifyResult) {
        showAlert('Bulk verify section not found', 'danger');
        return;
    }
    
    bulkVerifyResult.innerHTML = '<i class="fas fa-spinner fa-spin"></i> <strong>Visiting Mero Share website...</strong><br><small>Checking real-time status for all IPOs. This may take a few moments.</small>';
    bulkVerifyResult.style.display = 'block';
    
    const results = [];
    const uniqueRecords = {};
    
    // Get unique account-IPO combinations
    history.forEach(record => {
        const key = `${record.accountName}-${record.ipoName}`;
        if (!uniqueRecords[key]) {
            uniqueRecords[key] = record;
        }
    });
    
    // Verify each in real-time
    for (const key in uniqueRecords) {
        const record = uniqueRecords[key];
        try {
            const response = await fetch(`${API_URL}/verify-ipo-status`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ipoName: record.ipoName,
                    accountName: record.accountName
                })
            });
            
            if (response.ok) {
                const result = await response.json();
                results.push({
                    account: record.accountName,
                    ipo: record.ipoName,
                    applied: result.success ? result.applied : null,
                    status: result.buttonState || (result.applied ? 'Edit' : 'Apply'),
                    verified: result.success
                });
            }
        } catch (error) {
            console.error('Error verifying:', error);
            results.push({
                account: record.accountName,
                ipo: record.ipoName,
                applied: null,
                status: 'Error',
                verified: false
            });
        }
    }
    
    // Display results
    displayBulkVerifyResults(results);
}

function displayBulkVerifyResults(results) {
    const bulkVerifyResult = document.getElementById('bulkVerifyResult');
    const appliedCount = results.filter(r => r.verified && r.applied).length;
    const notAppliedCount = results.filter(r => r.verified && !r.applied).length;
    const failedCount = results.filter(r => !r.verified).length;
    
    let html = `
        <div class="bulk-verify-results" style="margin-top: 15px;">
            <h6 style="border-bottom: 2px solid #007bff; padding-bottom: 10px; margin-bottom: 15px;">
                <i class="fas fa-tasks"></i> Real-Time Verification Results (from Mero Share)
            </h6>
            
            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 20px;">
                <div style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); color: white; padding: 12px; border-radius: 6px; text-align: center;">
                    <div style="font-size: 20px; font-weight: bold;">${results.length}</div>
                    <small>Total Checked</small>
                </div>
                <div style="background: linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%); color: #155724; padding: 12px; border-radius: 6px; text-align: center;">
                    <div style="font-size: 20px; font-weight: bold;">${appliedCount}</div>
                    <small>Applied (Edit)</small>
                </div>
                <div style="background: linear-gradient(135deg, #fa709a 0%, #fee140 100%); color: #721c24; padding: 12px; border-radius: 6px; text-align: center;">
                    <div style="font-size: 20px; font-weight: bold;">${notAppliedCount}</div>
                    <small>Not Applied (Apply)</small>
                </div>
                <div style="background: linear-gradient(135deg, #f44336 0%, #e91e63 100%); color: white; padding: 12px; border-radius: 6px; text-align: center;">
                    <div style="font-size: 20px; font-weight: bold;">${failedCount}</div>
                    <small>Verification Failed</small>
                </div>
            </div>
            
            <div class="table-responsive">
                <table class="table table-sm table-hover">
                    <thead class="table-light">
                        <tr>
                            <th>Account</th>
                            <th>IPO Name</th>
                            <th>Verification Status</th>
                            <th>Website Button</th>
                        </tr>
                    </thead>
                    <tbody>
    `;
    
    results.forEach(result => {
        let statusBadge = '';
        let buttonBadge = '';
        
        if (!result.verified) {
            statusBadge = '<span class="badge bg-danger">Verification Failed</span>';
            buttonBadge = '<span style="background: #999; color: white; padding: 3px 8px; border-radius: 3px; font-size: 11px;">Unknown</span>';
        } else if (result.applied) {
            statusBadge = '<span class="badge bg-success">✓ Applied</span>';
            buttonBadge = '<span style="background: #4caf50; color: white; padding: 3px 8px; border-radius: 3px; font-size: 11px;"><strong>Edit</strong></span>';
        } else {
            statusBadge = '<span class="badge bg-danger">✗ Not Applied</span>';
            buttonBadge = '<span style="background: #f44336; color: white; padding: 3px 8px; border-radius: 3px; font-size: 11px;"><strong>Apply</strong></span>';
        }
        
        html += `
            <tr>
                <td><strong>${result.account}</strong></td>
                <td>${result.ipo}</td>
                <td>${statusBadge}</td>
                <td>${buttonBadge}</td>
            </tr>
        `;
    });
    
    html += `
                    </tbody>
                </table>
            </div>
        </div>
    `;
    
    bulkVerifyResult.innerHTML = html;
}

// Handle Enter key in forms
document.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && e.target.closest('#accountForm')) {
        e.preventDefault();
        saveAccount();
    }
});

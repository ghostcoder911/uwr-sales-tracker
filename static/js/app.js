// UNIQUE WORLD ROBOTICS - Sales Tracker Frontend
// Real-time multi-user dashboard

// Global state
let allLeads = [];

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    loadLeads();
    loadStats();
    setInterval(loadStats, 30000); // Update stats every 30 seconds
    setInterval(loadLeads, 60000); // Refresh leads every minute
    
    // Set default user name from localStorage
    const savedUser = localStorage.getItem('username');
    if (savedUser) {
        document.getElementById('added_by').value = savedUser;
    }
});

// Tab switching
function showTab(tabId) {
    // Hide all tab contents
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Deactivate all tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Show selected tab
    document.getElementById(tabId).classList.add('active');
    
    // Activate corresponding button
    event.target.classList.add('active');
    
    // Refresh data when switching to view leads tab
    if (tabId === 'view-leads') {
        loadLeads();
    }
}

// Load statistics
async function loadStats() {
    try {
        const response = await fetch('/api/stats');
        const stats = await response.json();
        
        document.getElementById('total-calls').textContent = stats.total_calls;
        document.getElementById('active-leads').textContent = stats.active_leads;
        document.getElementById('important-leads').textContent = stats.important_leads || 0;
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

// Load leads
async function loadLeads() {
    try {
        const response = await fetch('/api/leads');
        const result = await response.json();
        
        if (result.success) {
            allLeads = result.data;
            displayLeads(allLeads);
        }
    } catch (error) {
        console.error('Error loading leads:', error);
        showToast('Error loading leads', 'error');
    }
}

// Display leads in table
function displayLeads(leads) {
    const tbody = document.getElementById('leads-tbody');
    
    if (leads.length === 0) {
        tbody.innerHTML = '<tr><td colspan="12" style="text-align: center; padding: 40px;">No leads found. Add your first lead!</td></tr>';
        return;
    }
    
    tbody.innerHTML = leads.map((lead, index) => {
        const rowNum = index + 1;
        const statusClass = getStatusClass(lead.Status);
        
        return `
            <tr data-row="${rowNum}" id="row-${rowNum}">
                <td class="star-cell" onclick="toggleStar(${rowNum})">
                    ${lead.Important || ''}
                </td>
                <td data-field="Institution"><strong>${escapeHtml(lead.Institution)}</strong></td>
                <td data-field="Contact Person">${escapeHtml(lead['Contact Person'])}</td>
                <td data-field="Phone">${escapeHtml(lead.Phone)}</td>
                <td data-field="Email">${escapeHtml(lead.Email || '-')}</td>
                <td data-field="Status"><span class="status-badge ${statusClass}">${lead.Status}</span></td>
                <td data-field="Follow-up Date">${lead['Follow-up Date'] || '-'}</td>
                <td data-field="Requirements">${truncate(lead.Requirements, 50)}</td>
                <td data-field="Proposal Shared">${truncate(lead['Proposal Shared'], 40)}</td>
                <td data-field="Remarks">${truncate(lead.Remarks, 50)}</td>
                <td data-field="Added By"><em>${escapeHtml(lead['Added By'] || 'Unknown')}</em></td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-edit" onclick="enableInlineEdit(${rowNum})" id="edit-btn-${rowNum}">
                            ✏️ Edit
                        </button>
                        <button class="btn btn-save" onclick="saveInlineEdit(${rowNum})" id="save-btn-${rowNum}" style="display:none;">
                            💾 Save
                        </button>
                        <button class="btn-cancel" onclick="cancelInlineEdit(${rowNum})" id="cancel-btn-${rowNum}" style="display:none;">
                            ❌
                        </button>
                        <button class="btn btn-danger btn-small" onclick="deleteLead(${rowNum})" id="delete-btn-${rowNum}">
                            🗑️
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// Get status class for badge
function getStatusClass(status) {
    const statusMap = {
        'New Lead': 'status-new',
        'Contacted': 'status-contacted',
        'Interested': 'status-interested',
        'Proposal Sent': 'status-proposal',
        'Negotiating': 'status-negotiating',
        'Closed Won': 'status-won',
        'Closed Lost': 'status-lost'
    };
    return statusMap[status] || 'status-new';
}

// Filter table
function filterTable() {
    const searchTerm = document.getElementById('search').value.toLowerCase();
    
    if (!searchTerm) {
        displayLeads(allLeads);
        return;
    }
    
    const filtered = allLeads.filter(lead => {
        return Object.values(lead).some(value => 
            String(value).toLowerCase().includes(searchTerm)
        );
    });
    
    displayLeads(filtered);
}

// Add lead
document.getElementById('add-lead-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const formData = new FormData(this);
    
    // Save username to localStorage
    const username = formData.get('added_by');
    if (username) {
        localStorage.setItem('username', username);
    }
    
    try {
        const response = await fetch('/api/leads', {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        if (result.success) {
            showToast('✅ Lead added successfully!');
            clearForm();
            loadLeads();
            loadStats();
        } else {
            showToast('❌ Error adding lead', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showToast('❌ Error adding lead', 'error');
    }
});

// Clear form
function clearForm() {
    document.getElementById('add-lead-form').reset();
    
    // Restore username
    const savedUser = localStorage.getItem('username');
    if (savedUser) {
        document.getElementById('added_by').value = savedUser;
    }
}

// Toggle star
async function toggleStar(rowNum) {
    try {
        const response = await fetch(`/api/leads/${rowNum}/toggle-star`, {
            method: 'POST'
        });
        
        const result = await response.json();
        
        if (result.success) {
            loadLeads();
            loadStats();
        }
    } catch (error) {
        console.error('Error toggling star:', error);
    }
}

// Delete lead
async function deleteLead(rowNum) {
    if (!confirm('Are you sure you want to delete this lead?')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/leads/${rowNum}`, {
            method: 'DELETE'
        });
        
        const result = await response.json();
        
        if (result.success) {
            showToast('Lead deleted successfully');
            loadLeads();
            loadStats();
        } else {
            showToast('Error deleting lead', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showToast('Error deleting lead', 'error');
    }
}

// Refresh data
function refreshData() {
    showToast('🔄 Refreshing data...');
    loadLeads();
    loadStats();
}

// Show toast notification
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type} show`;
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Store original row data for cancel functionality
let originalRowData = {};

// Enable inline editing for a row
async function enableInlineEdit(rowNum) {
    const row = document.getElementById(`row-${rowNum}`);
    const cells = row.querySelectorAll('td[data-field]');
    
    // Store original data for cancel
    originalRowData[rowNum] = {};
    
    cells.forEach(cell => {
        const field = cell.getAttribute('data-field');
        const currentValue = cell.textContent.trim();
        originalRowData[rowNum][field] = currentValue;
        
        // Create appropriate input based on field
        let input;
        
        if (field === 'Status') {
            input = document.createElement('select');
            input.className = 'inline-edit-select';
            const options = ['New Lead', 'Contacted', 'Interested', 'Proposal Sent', 'Negotiating', 'Closed Won', 'Closed Lost'];
            options.forEach(opt => {
                const option = document.createElement('option');
                option.value = opt;
                option.textContent = opt;
                if (currentValue === opt) option.selected = true;
                input.appendChild(option);
            });
        } else if (field === 'Follow-up Date') {
            input = document.createElement('input');
            input.type = 'date';
            input.className = 'inline-edit-input';
            input.value = currentValue !== '-' ? currentValue : '';
        } else if (field === 'Requirements' || field === 'Proposal Shared' || field === 'Remarks') {
            input = document.createElement('textarea');
            input.className = 'inline-edit-textarea';
            input.value = currentValue !== '-' ? currentValue : '';
            input.rows = 2;
        } else {
            input = document.createElement('input');
            input.type = 'text';
            input.className = 'inline-edit-input';
            input.value = currentValue !== '-' ? currentValue : '';
        }
        
        cell.innerHTML = '';
        cell.appendChild(input);
    });
    
    // Toggle buttons
    document.getElementById(`edit-btn-${rowNum}`).style.display = 'none';
    document.getElementById(`save-btn-${rowNum}`).style.display = 'inline-block';
    document.getElementById(`cancel-btn-${rowNum}`).style.display = 'inline-block';
    document.getElementById(`delete-btn-${rowNum}`).style.display = 'none';
    
    // Highlight row
    row.classList.add('editing-row');
}

// Save inline edit
async function saveInlineEdit(rowNum) {
    const row = document.getElementById(`row-${rowNum}`);
    const cells = row.querySelectorAll('td[data-field]');
    
    // Collect data
    const formData = new FormData();
    
    cells.forEach(cell => {
        const field = cell.getAttribute('data-field');
        const input = cell.querySelector('input, select, textarea');
        const value = input ? input.value : '';
        
        // Map field names to API parameters
        const fieldMap = {
            'Institution': 'institution',
            'Contact Person': 'contact_person',
            'Phone': 'phone',
            'Email': 'email',
            'Status': 'status',
            'Follow-up Date': 'followup_date',
            'Requirements': 'requirements',
            'Proposal Shared': 'proposal_shared',
            'Remarks': 'remarks',
            'Added By': 'added_by'
        };
        
        formData.append(fieldMap[field], value);
    });
    
    try {
        const response = await fetch(`/api/leads/${rowNum}`, {
            method: 'PUT',
            body: formData
        });
        
        const result = await response.json();
        
        if (result.success) {
            showToast('✅ Lead updated successfully!');
            loadLeads();
            loadStats();
        } else {
            showToast('❌ Error updating lead', 'error');
            cancelInlineEdit(rowNum);
        }
    } catch (error) {
        console.error('Error:', error);
        showToast('❌ Error updating lead', 'error');
        cancelInlineEdit(rowNum);
    }
}

// Cancel inline edit
function cancelInlineEdit(rowNum) {
    // Just reload the data to restore original view
    loadLeads();
    delete originalRowData[rowNum];
}

// Utility functions
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function truncate(text, length) {
    if (!text) return '-';
    text = String(text);
    return text.length > length ? text.substring(0, length) + '...' : text;
}


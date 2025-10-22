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
            <tr data-row="${rowNum}">
                <td class="star-cell" onclick="toggleStar(${rowNum})">
                    ${lead.Important || ''}
                </td>
                <td><strong>${escapeHtml(lead.Institution)}</strong></td>
                <td>${escapeHtml(lead['Contact Person'])}</td>
                <td>${escapeHtml(lead.Phone)}</td>
                <td>${escapeHtml(lead.Email || '-')}</td>
                <td><span class="status-badge ${statusClass}">${lead.Status}</span></td>
                <td>${lead['Follow-up Date'] || '-'}</td>
                <td>${truncate(lead.Requirements, 50)}</td>
                <td>${truncate(lead['Proposal Shared'], 40)}</td>
                <td>${truncate(lead.Remarks, 50)}</td>
                <td><em>${escapeHtml(lead['Added By'] || 'Unknown')}</em></td>
                <td>
                    <button class="btn btn-danger btn-small" onclick="deleteLead(${rowNum})">
                        🗑️ Delete
                    </button>
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


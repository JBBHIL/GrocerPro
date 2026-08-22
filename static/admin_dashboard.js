let clients = [];
let products = [];
let customers = [];
let activeTab = 'clients';

// Elements
const clientsTableBody = document.getElementById('clientsTableBody');
const productsTableBody = document.getElementById('productsTableBody');
const customersTableBody = document.getElementById('customersTableBody');
const clientModal = document.getElementById('clientModal');
const clientForm = document.getElementById('clientForm');

// Tab switcher
function switchTab(tabName) {
    activeTab = tabName;
    
    // Toggle active link classes
    document.getElementById('tabClients').classList.toggle('active-tab', tabName === 'clients');
    document.getElementById('tabProducts').classList.toggle('active-tab', tabName === 'products');
    document.getElementById('tabCustomers').classList.toggle('active-tab', tabName === 'customers');
    
    // Toggle panel displays
    document.getElementById('panelClients').style.display = tabName === 'clients' ? 'block' : 'none';
    document.getElementById('panelProducts').style.display = tabName === 'products' ? 'block' : 'none';
    document.getElementById('panelCustomers').style.display = tabName === 'customers' ? 'block' : 'none';

    // Update page title
    const titles = {
        'clients': 'Clients Accounts Manager',
        'products': 'Master Products Directory',
        'customers': 'Master Customers Directory'
    };
    document.getElementById('pageTitle').innerText = titles[tabName];
}

// Load Data
async function loadData() {
    try {
        const clientsRes = await fetch('/api/admin/clients');
        const clientsData = await clientsRes.json();
        if (clientsData.success) clients = clientsData.clients;

        const productsRes = await fetch('/api/admin/products');
        const productsData = await productsRes.json();
        if (productsData.success) products = productsData.products;

        const customersRes = await fetch('/api/admin/customers');
        const customersData = await customersRes.json();
        if (customersData.success) customers = customersData.customers;

        updateWidgets();
        renderClientsTable();
        renderProductsTable();
        renderCustomersTable();
    } catch (err) {
        console.error("Failed to load admin data:", err);
    }
}

// Update Widgets Stats
function updateWidgets() {
    document.getElementById('totalClients').innerText = clients.length;
    document.getElementById('totalProducts').innerText = products.length;
    document.getElementById('totalCustomers').innerText = customers.length;
}

// Render Clients
function renderClientsTable() {
    if (!clientsTableBody) return;
    clientsTableBody.innerHTML = '';
    
    if (clients.length === 0) {
        clientsTableBody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:var(--text-secondary); padding:20px;">No registered clients found.</td></tr>`;
        return;
    }

    clients.forEach(client => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${client.name}</strong></td>
            <td><code>${client.username}</code></td>
            <td><span class="status-badge status-instock" style="background:rgba(168,85,247,0.1); color:#a855f7; border-color:rgba(168,85,247,0.2);">${client.client_id}</span></td>
            <td>${client.email}</td>
            <td><code>${client.password}</code></td>
            <td>
                <div class="action-btns">
                    <button class="action-btn edit-btn" onclick="openClientModal('edit', ${client.id})"><i class="fa-solid fa-pen"></i></button>
                    <button class="action-btn delete-btn" onclick="deleteClient(${client.id})"><i class="fa-solid fa-trash"></i></button>
                </div>
            </td>
        `;
        clientsTableBody.appendChild(tr);
    });
}

// Render Products
function renderProductsTable() {
    if (!productsTableBody) return;
    productsTableBody.innerHTML = '';
    
    if (products.length === 0) {
        productsTableBody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:var(--text-secondary); padding:20px;">No products found in system.</td></tr>`;
        return;
    }

    products.forEach(product => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><code>${product.client_id}</code></td>
            <td>
                <div class="item-name-cell">
                    <img src="${product.icon}" class="item-img" style="object-fit:cover;">
                    <span>${product.name}</span>
                </div>
            </td>
            <td>${product.category}</td>
            <td>₹${parseFloat(product.price).toFixed(2)}</td>
            <td><strong>${product.stock}</strong> units</td>
            <td>
                <div class="action-btns">
                    <button class="action-btn delete-btn" onclick="deleteProduct(${product.id})"><i class="fa-solid fa-trash"></i></button>
                </div>
            </td>
        `;
        productsTableBody.appendChild(tr);
    });
}

// Render Customers
function renderCustomersTable() {
    if (!customersTableBody) return;
    customersTableBody.innerHTML = '';
    
    if (customers.length === 0) {
        customersTableBody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:var(--text-secondary); padding:20px;">No registered customers found in system.</td></tr>`;
        return;
    }

    customers.forEach(cust => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><code>${cust.client_id}</code></td>
            <td><strong>${cust.name}</strong></td>
            <td>
                <div style="display:flex; flex-direction:column; gap:2px;">
                    <span><i class="fa-solid fa-phone" style="font-size:10px; color:var(--text-secondary);"></i> ${cust.mobile}</span>
                    <span style="font-size:11px; color:var(--text-secondary);">${cust.email || 'No Email'}</span>
                </div>
            </td>
            <td>${cust.address || 'No Address'}</td>
            <td><span class="status-badge status-instock">${cust.discount}</span></td>
            <td>
                <div class="action-btns">
                    <button class="action-btn delete-btn" onclick="deleteCustomer(${cust.id})"><i class="fa-solid fa-trash"></i></button>
                </div>
            </td>
        `;
        customersTableBody.appendChild(tr);
    });
}

// Modal actions
function openClientModal(action, id = null) {
    document.getElementById('actionType').value = action;
    if (action === 'add') {
        document.getElementById('clientModalTitle').innerText = 'Create Client Account';
        document.getElementById('clientRowId').value = '';
        clientForm.reset();
    } else {
        const client = clients.find(c => c.id === id);
        document.getElementById('clientModalTitle').innerText = `Update: ${client.name}`;
        document.getElementById('clientRowId').value = client.id;
        document.getElementById('clientName').value = client.name;
        document.getElementById('clientUsername').value = client.username;
        document.getElementById('clientId').value = client.client_id;
        document.getElementById('clientEmail').value = client.email;
        document.getElementById('clientPassword').value = client.password;
    }
    if (clientModal) clientModal.classList.add('show');
}

function closeClientModal() {
    if (clientModal) clientModal.classList.remove('show');
}

// Form Submit
if (clientForm) {
    clientForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const action = document.getElementById('actionType').value;
        const idVal = document.getElementById('clientRowId').value;
        
        const payload = {
            name: document.getElementById('clientName').value,
            username: document.getElementById('clientUsername').value,
            client_id: document.getElementById('clientId').value,
            email: document.getElementById('clientEmail').value,
            password: document.getElementById('clientPassword').value
        };
        
        if (idVal) {
            payload.id = parseInt(idVal);
        }

        try {
            const res = await fetch('/api/admin/clients', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (data.success) {
                showToast('success', 'Saved Successfully', data.message);
                closeClientModal();
                await loadData();
            } else {
                showToast('error', 'Failed to Save', data.message);
            }
        } catch (err) {
            showToast('error', 'Error', 'Failed to connect to backend database.');
        }
    });
}

// Deletes
async function deleteClient(id) {
    if (confirm("Are you sure you want to delete this client account? This will prevent them from logging in.")) {
        try {
            const res = await fetch(`/api/admin/clients/${id}`, { method: 'DELETE' });
            const data = await res.json();
            if (data.success) {
                showToast('warning', 'Deleted Account', data.message);
                await loadData();
            } else {
                showToast('error', 'Error', data.message);
            }
        } catch (err) {
            showToast('error', 'Error', 'Failed to connect to database.');
        }
    }
}

async function deleteProduct(id) {
    if (confirm("Are you sure you want to permanently delete this product from global database?")) {
        try {
            const res = await fetch(`/api/products/${id}`, { method: 'DELETE' });
            const data = await res.json();
            if (data.success) {
                showToast('warning', 'Product Removed', data.message);
                await loadData();
            } else {
                showToast('error', 'Error', data.message);
            }
        } catch (err) {
            showToast('error', 'Error', 'Failed to delete product.');
        }
    }
}

async function deleteCustomer(id) {
    if (confirm("Are you sure you want to permanently delete this customer profile?")) {
        try {
            const res = await fetch(`/api/customers/${id}`, { method: 'DELETE' });
            const data = await res.json();
            if (data.success) {
                showToast('warning', 'Customer Removed', data.message);
                await loadData();
            } else {
                showToast('error', 'Error', data.message);
            }
        } catch (err) {
            showToast('error', 'Error', 'Failed to delete customer.');
        }
    }
}

// Toast Notification
function showToast(type, title, message) {
    document.querySelectorAll('.toast').forEach(t => t.remove());
    const toast = document.createElement('div');
    toast.className = `toast ${type === 'error' ? 'error' : (type === 'warning' ? 'warning' : '')}`;
    
    let icon = 'fa-circle-check';
    let color = '#10b981';
    if(type === 'error') { icon = 'fa-circle-exclamation'; color = '#ef4444'; }
    if(type === 'warning') { icon = 'fa-triangle-exclamation'; color = '#f59e0b'; }
    
    toast.innerHTML = `
        <i class="fa-solid ${icon}" style="color: ${color}"></i>
        <div>
            <div class="toast-title">${title}</div>
            <div class="toast-desc">${message}</div>
        </div>
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 100);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 500);
    }, 4000);
}

// Load on start
loadData();

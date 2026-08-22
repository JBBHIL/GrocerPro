// Initial Mock Data for Customers
const defaultCustomers = [
    { id: 1, name: "Rahul Sharma", mobile: "+91 98765 43210", email: "rahul@example.com", address: "A-12, Green Park, South Delhi", discount: "5% Off" },
    { id: 2, name: "Priya Patel", mobile: "+91 87654 32109", email: "priya.p@example.com", address: "405, Shivam Heights, Ahmedabad", discount: "Free Delivery" },
    { id: 3, name: "Amit Kumar", mobile: "+91 76543 21098", email: "", address: "B-22/3, Sector 62, Noida", discount: "None" },
    { id: 4, name: "Sneha Desai", mobile: "+91 65432 10987", email: "sneha.d@exam.com", address: "Flat 101, Sea View Apts, Mumbai", discount: "10% Off" },
    { id: 5, name: "Vikram Singh", mobile: "+91 99887 76655", email: "vikram@mail.in", address: "H.No 45, Phase 2, Chandigarh", discount: "None" }
];

let customers = [];

// Load customers from backend SQLite
async function loadCustomersFromServer() {
    try {
        const res = await fetch('/api/customers');
        const data = await res.json();
        if (data.success) {
            customers = data.customers;
        }
    } catch (err) {
        console.error('Failed to load customers:', err);
    }
}

// Utility functions
const saveCustomers = () => {}; // No-op now as database manages persistence
const generateId = () => customers.length > 0 ? Math.max(...customers.map(c => c.id)) + 1 : 1;
const getAvatar = (name) => `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&color=fff&rounded=true`;

// Elements
const custTableBody = document.getElementById('customersTableBody');
const custSearchInput = document.getElementById('searchInput');
const custDiscountFilter = document.getElementById('discountFilter');
const custModal = document.getElementById('customerModal');
const custForm = document.getElementById('customerForm');

let activeFilter = 'today';
const todaysBuyerNames = new Set();
const pastBuyerNames = new Set();

// Initialize Dashboard
async function initCustomers() {
    await loadCustomersFromServer();
    
    // Set up card click handlers
    const cardTodays = document.getElementById('cardTodays');
    const cardPast = document.getElementById('cardPast');
    
    if (cardTodays) {
        cardTodays.addEventListener('click', () => {
            activeFilter = 'today';
            document.getElementById('directoryTitle').innerText = "Today's Customers";
            cardTodays.style.background = 'rgba(16, 185, 129, 0.05)';
            cardPast.style.background = 'transparent';
            renderCustomersTable();
        });
    }
    
    if (cardPast) {
        cardPast.addEventListener('click', () => {
            activeFilter = 'past';
            document.getElementById('directoryTitle').innerText = "Past Customers";
            cardPast.style.background = 'rgba(245, 158, 11, 0.05)';
            cardTodays.style.background = 'transparent';
            renderCustomersTable();
        });
    }
    
    // Highlight today card initially
    if (cardTodays) cardTodays.style.background = 'rgba(16, 185, 129, 0.05)';

    await updateCustomerStats();
    if (custTableBody) renderCustomersTable();
}

// Render Table
function renderCustomersTable() {
    if (!custTableBody) return;
    const searchTerm = custSearchInput ? custSearchInput.value.toLowerCase() : '';
    const discountMatch = custDiscountFilter ? custDiscountFilter.value : 'All';
    
    // Filter logic
    const filteredCustomers = customers.filter(c => {
        const matchesSearch = c.name.toLowerCase().includes(searchTerm) || c.mobile.includes(searchTerm);
        const matchesDiscount = discountMatch === 'All' || c.discount === discountMatch;
        
        let matchesTime = false;
        const nameKey = (c.name || '').trim().toLowerCase();
        if (activeFilter === 'today') {
            matchesTime = todaysBuyerNames.has(nameKey);
        } else {
            matchesTime = pastBuyerNames.has(nameKey);
        }
        
        return matchesSearch && matchesDiscount && matchesTime;
    });

    custTableBody.innerHTML = '';
    
    if (filteredCustomers.length === 0) {
        custTableBody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-secondary); padding: 20px;">No customers found matching this view.</td></tr>`;
        return;
    }

    filteredCustomers.forEach(customer => {
        let discountBadgeClass = 'status-instock'; // green default

        if (customer.discount === 'None') {
            discountBadgeClass = 'status-low'; // orange/gray feeling
        } else if (customer.discount === '10% Off') {
            discountBadgeClass = 'status-out'; // red/premium
        }

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>
                <div class="item-name-cell">
                    <img src="${getAvatar(customer.name)}" alt="${customer.name}" style="width: 40px; border-radius: 50%;">
                    <span><strong>${customer.name}</strong></span>
                </div>
            </td>
            <td>
                <div style="display:flex; flex-direction:column; gap:4px;">
                    <span><i class="fa-solid fa-phone" style="font-size:12px; color:#94a3b8;"></i> ${customer.mobile}</span>
                    <span style="font-size:12px; color:#94a3b8;">${customer.email || 'No email provided'}</span>
                </div>
            </td>
            <td style="max-width: 250px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${customer.address}">
                ${customer.address}
            </td>
            <td><span class="status-badge ${discountBadgeClass}">${customer.discount}</span></td>
            <td>
                <div class="action-btns">
                    <button class="action-btn" onclick="viewCustomerHistory(${customer.id})" title="View Purchase History"><i class="fa-solid fa-clock-rotate-left"></i></button>
                    <button class="action-btn edit-btn" onclick="openModal('edit', ${customer.id})" title="Edit Details & Discount"><i class="fa-solid fa-pen"></i></button>
                </div>
            </td>
        `;
        custTableBody.appendChild(tr);
    });
}

// Update Dashboard Statistics
async function updateCustomerStats() {
    let orders = [];
    try {
        const res = await fetch('/api/orders');
        const data = await res.json();
        if (data.success) {
            orders = data.orders;
        }
    } catch (err) {
        console.error('Failed to load orders for stats:', err);
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    todaysBuyerNames.clear();
    pastBuyerNames.clear();

    orders.forEach(order => {
        const customerNameKey = (order.customerName || '').trim().toLowerCase();
        if (!customerNameKey) return;
        // Only count stats for active/registered customers
        const customerExists = customers.some(c => (c.name || '').trim().toLowerCase() === customerNameKey);
        if (!customerExists) return;

        const orderDate = new Date(order.date);
        if (orderDate >= today) {
            todaysBuyerNames.add(customerNameKey);
        } else {
            pastBuyerNames.add(customerNameKey);
        }
    });

    if (document.getElementById('todaysCustomersCount')) {
        document.getElementById('todaysCustomersCount').innerText = todaysBuyerNames.size;
    }
    if (document.getElementById('pastCustomersCount')) {
        document.getElementById('pastCustomersCount').innerText = pastBuyerNames.size;
    }
}

// Modal Logic
function openModal(action, id = null) {
    document.getElementById('actionType').value = action;
    
    if (action === 'add') {
        document.getElementById('modalTitle').innerText = 'Register New Customer';
        document.getElementById('customerId').value = '';
        customerForm.reset();
        document.getElementById('customerDiscount').value = 'None';
        
    } else if (action === 'edit') {
        const customer = customers.find(c => c.id == id);
        document.getElementById('modalTitle').innerText = `Update: ${customer.name}`;
        document.getElementById('customerId').value = customer.id;
        document.getElementById('customerName').value = customer.name;
        document.getElementById('customerMobile').value = customer.mobile;
        document.getElementById('customerEmail').value = customer.email;
        document.getElementById('customerAddress').value = customer.address;
        document.getElementById('customerDiscount').value = customer.discount;
    }
    
    if (custModal) custModal.classList.add('show');
}

function closeModal() {
    if (custModal) custModal.classList.remove('show');
}

// Handle Form Submission
customerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const action = document.getElementById('actionType').value;
    const id = parseInt(document.getElementById('customerId').value);
    
    const name = document.getElementById('customerName').value;
    const mobile = document.getElementById('customerMobile').value;
    const email = document.getElementById('customerEmail').value;
    const address = document.getElementById('customerAddress').value;
    const discount = document.getElementById('customerDiscount').value;
    
    let payload = { name, mobile, email, address, discount };
    if (action === 'edit') {
        payload.id = id;
    }
    
    try {
        const res = await fetch('/api/customers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.success) {
            showToast('success', 'Saved Successfully', data.message);
        } else {
            showToast('error', 'Error', data.message);
        }
    } catch (err) {
        console.error(err);
        showToast('error', 'Network Error', 'Failed to save customer to database.');
    }
    
    closeModal();
    await initCustomers(); // Refresh UI
});



// History Modal Logic
const historyModal = document.getElementById('historyModal');

async function viewCustomerHistory(id) {
    const customer = customers.find(c => c.id === id);
    if (!customer) return;

    document.getElementById('historyModalTitle').innerText = `${customer.name}'s History`;

    let allOrders = [];
    try {
        const res = await fetch('/api/orders');
        const data = await res.json();
        if (data.success) {
            allOrders = data.orders;
        }
    } catch (err) {
        console.error('Failed to load orders history:', err);
    }
    
    const customerOrders = allOrders.filter(o => o.customerName.toLowerCase() === customer.name.toLowerCase());

    let lifetimeValue = 0;
    const historyTableBody = document.getElementById('historyTableBody');
    historyTableBody.innerHTML = '';

    if (customerOrders.length === 0) {
        historyTableBody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding: 20px; color: var(--text-secondary);">No previous orders found for this customer.</td></tr>`;
    } else {
        customerOrders.reverse().forEach(o => {
            lifetimeValue += o.totalAmount;
            
            // Format items
            let itemsStr = o.items.map(i => `<span style="display:bl;">${i.qty}x ${i.name}</span>`).join('<br>');
            
            // Color badging for payment
            let badgeClass = 'status-low';
            if (o.paymentMethod === 'Card') badgeClass = 'status-instock';
            if (o.paymentMethod === 'UPI') badgeClass = 'status-out';

            historyTableBody.innerHTML += `
                <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
                    <td style="padding: 12px 10px; font-size: 12px; color: var(--text-secondary);">${new Date(o.date).toLocaleDateString()}</td>
                    <td style="padding: 12px 10px; font-size: 13px;">${itemsStr}</td>
                    <td style="padding: 12px 10px; font-weight: 600;">${formatCurrency(o.totalAmount)}</td>
                    <td style="padding: 12px 10px;"><span class="status-badge ${badgeClass}" style="font-size: 11px;">${o.paymentMethod}</span></td>
                </tr>
            `;
        });
    }

    document.getElementById('historyTotalOrders').innerText = customerOrders.length;
    document.getElementById('historyLifetimeValue').innerText = formatCurrency(lifetimeValue);

    historyModal.classList.add('show');
}

function closeHistoryModal() {
    historyModal.classList.remove('show');
}

// Notifications toggle (Matches dashboard logic)
function toggleNotifications() {
    document.getElementById('notificationDropdown').classList.toggle('active');
}

window.addEventListener('click', (e) => {
    if(!e.target.closest('.notification-icon')) {
        const drop = document.getElementById('notificationDropdown');
        if(drop) drop.classList.remove('active');
    }
});

// Filters
if (custSearchInput) custSearchInput.addEventListener('input', renderCustomersTable);
if (custDiscountFilter) custDiscountFilter.addEventListener('change', renderCustomersTable);

// We won't redeclare showToast here since dashboard.js already has it and they are in the same scope.
// But we need to make sure we don't crash if dashboard.js hasn't defined it, though it will since it loads first.

// Run on load
initCustomers();

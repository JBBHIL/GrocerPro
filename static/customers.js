// Initial Mock Data for Customers
const defaultCustomers = [
    { id: 1, name: "Rahul Sharma", mobile: "+91 98765 43210", email: "rahul@example.com", address: "A-12, Green Park, South Delhi", discount: "5% Off" },
    { id: 2, name: "Priya Patel", mobile: "+91 87654 32109", email: "priya.p@example.com", address: "405, Shivam Heights, Ahmedabad", discount: "Free Delivery" },
    { id: 3, name: "Amit Kumar", mobile: "+91 76543 21098", email: "", address: "B-22/3, Sector 62, Noida", discount: "None" },
    { id: 4, name: "Sneha Desai", mobile: "+91 65432 10987", email: "sneha.d@exam.com", address: "Flat 101, Sea View Apts, Mumbai", discount: "10% Off" },
    { id: 5, name: "Vikram Singh", mobile: "+91 99887 76655", email: "vikram@mail.in", address: "H.No 45, Phase 2, Chandigarh", discount: "None" }
];

let customers = JSON.parse(localStorage.getItem('grocery_customers')) || defaultCustomers;

// Utility functions
const saveCustomers = () => localStorage.setItem('grocery_customers', JSON.stringify(customers));
const generateId = () => customers.length > 0 ? Math.max(...customers.map(c => c.id)) + 1 : 1;
const getAvatar = (name) => `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&color=fff&rounded=true`;

// Elements
const custTableBody = document.getElementById('customersTableBody');
const custSearchInput = document.getElementById('searchCustomerInput'); // changed ID to prevent collision if needed, but lets just use unique var
const custDiscountFilter = document.getElementById('discountFilter');
const custModal = document.getElementById('customerModal');
const custForm = document.getElementById('customerForm');

// Initialize Dashboard
function initCustomers() {
    if (custTableBody) renderCustomersTable();
    if (document.getElementById('totalCustomersCount')) updateCustomerStats();
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
        return matchesSearch && matchesDiscount;
    });

    custTableBody.innerHTML = '';
    
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
                    <button class="action-btn delete-btn" onclick="deleteCustomer(${customer.id})" title="Delete"><i class="fa-solid fa-trash"></i></button>
                </div>
            </td>
        `;
        custTableBody.appendChild(tr);
    });
}

// Update Dashboard Statistics
function updateCustomerStats() {
    document.getElementById('totalCustomersCount').innerText = customers.length;

    const orders = JSON.parse(localStorage.getItem('grocery_orders')) || [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayNames = new Set();
    const pastNames = new Set();

    orders.forEach(order => {
        const orderDate = new Date(order.date);
        if (orderDate >= today) {
            todayNames.add(order.customerName.toLowerCase());
        } else {
            pastNames.add(order.customerName.toLowerCase());
        }
    });

    if (document.getElementById('pastCustomersCount')) {
        document.getElementById('pastCustomersCount').innerText = pastNames.size;
    }
    if (document.getElementById('todayCustomersCount')) {
        document.getElementById('todayCustomersCount').innerText = todayNames.size;
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
        const customer = customers.find(c => c.id === id);
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

function closeCustomerModal() {
    if (custModal) custModal.classList.remove('show');
}

// Handle Form Submission
customerForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const action = document.getElementById('actionType').value;
    const id = parseInt(document.getElementById('customerId').value);
    
    const name = document.getElementById('customerName').value;
    const mobile = document.getElementById('customerMobile').value;
    const email = document.getElementById('customerEmail').value;
    const address = document.getElementById('customerAddress').value;
    const discount = document.getElementById('customerDiscount').value;
    
    if (action === 'add') {
        customers.unshift({
            id: generateId(),
            name, mobile, email, address, discount
        });
        showToast('success', 'Customer Added', `${name} successfully added to database.`);
        
    } else if (action === 'edit') {
        const index = customers.findIndex(c => c.id === id);
        customers[index] = { id, name, mobile, email, address, discount };
        showToast('success', 'Profile Updated', `${name}'s discount preference is now set to ${discount}.`);
    }
    
    saveCustomers(); // Persist DB
    closeCustomerModal();
    initCustomers(); // Refresh UI
});

// Delete Customer
function deleteCustomer(id) {
    if(confirm("Are you sure you want to permanently delete this customer's profile?")) {
        const customer = customers.find(c => c.id === id);
        customers = customers.filter(c => c.id !== id);
        saveCustomers(); // Persist DB
        showToast('warning', 'Customer Removed', `${customer.name} deleted successfully.`);
        initCustomers();
    }
}

// History Modal Logic
const historyModal = document.getElementById('historyModal');

function viewCustomerHistory(id) {
    const customer = customers.find(c => c.id === id);
    if (!customer) return;

    document.getElementById('historyModalTitle').innerText = `${customer.name}'s History`;

    const allOrders = JSON.parse(localStorage.getItem('grocery_orders')) || [];
    
    // In our rudimentary "DB", we identify the same customer by their exact name.
    // In a production SQL DB, this would map directly to customer_id foreign keys,
    // but here we just filter the order history objects based on their stored customerName.
    const customerOrders = allOrders.filter(o => o.customerName === customer.name);

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

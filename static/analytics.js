// Get global order history 
let orders = JSON.parse(localStorage.getItem('grocery_orders')) || [];

// Elements
const analyticsTableBody = document.getElementById('analyticsTableBody');
const analyticsSearch = document.getElementById('analyticsSearch');
const paymentFilter = document.getElementById('paymentFilter');

function initAnalytics() {
    renderAnalyticsTable();
    updateAnalyticsStats();
}

function renderAnalyticsTable() {
    if(!analyticsTableBody) return;
    
    const searchTerm = analyticsSearch.value.toLowerCase();
    const payFilter = paymentFilter.value;

    const filteredOrders = orders.filter(o => {
        const matchesSearch = o.customerName.toLowerCase().includes(searchTerm) || o.orderId.toLowerCase().includes(searchTerm);
        const matchesPay = payFilter === 'All' || o.paymentMethod === payFilter;
        return matchesSearch && matchesPay;
    });

    analyticsTableBody.innerHTML = '';

    if (filteredOrders.length === 0) {
        analyticsTableBody.innerHTML = `<tr><td colspan="6" style="text-align:center; color: var(--text-secondary); padding: 30px;">No purchase history found.</td></tr>`;
        return;
    }

    // Sort by newest first
    filteredOrders.reverse().forEach(order => {
        
        let paymentBadge = 'status-low';
        if (order.paymentMethod === 'Card') paymentBadge = 'status-instock';
        if (order.paymentMethod === 'UPI') paymentBadge = 'status-out';

        // Format items string beautifully
        let itemsHtml = `<div style="display:flex; flex-direction:column; gap:4px;">`;
        order.items.forEach(item => {
            itemsHtml += `<span><strong style="color:var(--accent-color);">${item.qty}x</strong> ${item.name}</span>`;
        });
        itemsHtml += `</div>`;

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="font-family: monospace; color: var(--info);">#${order.orderId}</td>
            <td style="font-size: 13px; color: var(--text-secondary);">${new Date(order.date).toLocaleString()}</td>
            <td><strong>${order.customerName}</strong></td>
            <td>${itemsHtml}</td>
            <td style="font-weight: 600;">${formatCurrency(order.totalAmount)}</td>
            <td><span class="status-badge ${paymentBadge}">${order.paymentMethod}</span></td>
        `;
        analyticsTableBody.appendChild(tr);
    });
}

function updateAnalyticsStats() {
    if(!document.getElementById('totalOrdersCount')) return;
    
    document.getElementById('totalOrdersCount').innerText = orders.length;

    const revenue = orders.reduce((sum, o) => sum + o.totalAmount, 0);
    document.getElementById('totalRevenue').innerText = formatCurrency(revenue);

    const itemsSold = orders.reduce((sum, o) => {
        const orderItemsCount = o.items.reduce((itemSum, item) => itemSum + item.qty, 0);
        return sum + orderItemsCount;
    }, 0);
    document.getElementById('totalItemsSold').innerText = itemsSold;
}

if (analyticsSearch) analyticsSearch.addEventListener('input', renderAnalyticsTable);
if (paymentFilter) paymentFilter.addEventListener('change', renderAnalyticsTable);

// Run 
initAnalytics();

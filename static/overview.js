// Utility format helper
const formatCurrency = (amount) => `₹${parseFloat(amount).toFixed(2)}`;

let isInitialLoad = true;

async function refreshOverviewData() {
    // Calculate Today's Stats from Analytics
    let orders = [];
    try {
        const res = await fetch('/api/orders');
        const data = await res.json();
        if (data.success) orders = data.orders;
    } catch (err) {
        console.error('Failed to load orders:', err);
    }
    
    // Get start of today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let customersTodayCount = 0;
    let revenueToday = 0;
    
    // Array to track unique customers today just in case one bought multiple times today
    let uniqueCustomersToday = [];

    orders.forEach(order => {
        const orderDate = new Date(order.date);
        
        // If the order happened today
        if (orderDate >= today) {
            revenueToday += order.totalAmount;
            
            // Count distinct names:
            if (!uniqueCustomersToday.includes(order.customerName)) {
                uniqueCustomersToday.push(order.customerName);
            }
        }
    });

    customersTodayCount = uniqueCustomersToday.length;

    // Animate numbers for visual flair only on initial load
    if (isInitialLoad) {
        animateValue("todayCustomers", 0, customersTodayCount, 1500);
        isInitialLoad = false;
    } else {
        const custEl = document.getElementById('todayCustomers');
        if (custEl) custEl.innerText = customersTodayCount;
    }
    
    // Formatting currency
    const revEl = document.getElementById('todayRevenue');
    if (revEl) {
        revEl.innerText = `₹${parseFloat(revenueToday).toFixed(2)}`;
    }

    // Render historical customer orders and billings list
    await renderPastOrders(orders);
}

document.addEventListener('DOMContentLoaded', async () => {
    // Show current date beautifully
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const dateEl = document.getElementById('currentDateDisplay');
    if (dateEl) {
        dateEl.innerText = new Date().toLocaleDateString('en-IN', options);
    }

    await refreshOverviewData();
});

// Periodic background refresh every 5 seconds for overview page (runs only if tab is visible)
setInterval(async () => {
    if (document.hidden) return;
    await refreshOverviewData();
}, 5000);

// Render historical orders
async function renderPastOrders(orders) {
    const pastOrdersTableBody = document.getElementById('pastOrdersTableBody');
    if (!pastOrdersTableBody) return;

    let customers = [];
    try {
        const res = await fetch('/api/customers');
        const data = await res.json();
        if (data.success) customers = data.customers;
    } catch (err) {
        console.error('Failed to load customer profiles:', err);
    }

    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const todayStr = `${yyyy}-${mm}-${dd}`;

    // Filter to only today's orders
    const todayOrders = orders.filter(order => order.date.startsWith(todayStr));

    // Sort orders descending by date (newest first)
    const sortedOrders = [...todayOrders].sort((a, b) => new Date(b.date) - new Date(a.date));

    pastOrdersTableBody.innerHTML = '';

    if (sortedOrders.length === 0) {
        pastOrdersTableBody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; color: var(--text-secondary); padding: 30px;">
                    No sales recorded today.
                </td>
            </tr>
        `;
        return;
    }

    sortedOrders.forEach(order => {
        // Find customer details from registry
        const custInfo = customers.find(c => c.name.toLowerCase() === order.customerName.toLowerCase()) || {
            mobile: 'N/A',
            address: 'Walk-in Customer'
        };

        const dateStr = new Date(order.date).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
        const timeStr = new Date(order.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        // Generate items list display
        const itemsHtml = order.items.map(item => `
            <div class="sales-item-badge" style="margin-right: 4px; margin-bottom: 4px;">
                <span>${item.name}</span>
                <strong style="color: var(--accent-color)">x${item.qty}</strong>
                <span style="color: var(--text-secondary)">(${formatCurrency(item.price)})</span>
            </div>
        `).join('');

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>
                <strong>#${order.orderId}</strong>
                <div style="font-size: 12px; color: var(--text-secondary); margin-top: 4px;">${dateStr} ${timeStr}</div>
            </td>
            <td>
                <div class="sales-customer-info">
                    <strong>${order.customerName}</strong>
                    <span class="phone"><i class="fa-solid fa-phone" style="font-size: 10px; margin-right: 4px;"></i>${custInfo.mobile}</span>
                    <span class="address"><i class="fa-solid fa-location-dot" style="font-size: 10px; margin-right: 4px;"></i>${custInfo.address || 'No Address'}</span>
                </div>
            </td>
            <td>
                <div class="sales-items-list" style="flex-flow: wrap; flex-direction: row;">
                    ${itemsHtml}
                </div>
            </td>
            <td>
                <span class="status-badge status-instock">${order.paymentMethod || 'Cash'}</span>
            </td>
            <td>
                <strong style="color: var(--text-primary); font-size: 16px;">${formatCurrency(order.totalAmount)}</strong>
            </td>
        `;
        pastOrdersTableBody.appendChild(tr);
    });
}

// Helper for beautiful number counting animation
function animateValue(id, start, end, duration) {
    if (start === end) return;
    const obj = document.getElementById(id);
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        obj.innerHTML = Math.floor(progress * (end - start) + start);
        if (progress < 1) {
            window.requestAnimationFrame(step);
        }
    };
    window.requestAnimationFrame(step);
}

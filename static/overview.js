// Utility format helper
const formatCurrency = (amount) => `₹${parseFloat(amount).toFixed(2)}`;

document.addEventListener('DOMContentLoaded', () => {
    // Show current date beautifully
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    document.getElementById('currentDateDisplay').innerText = new Date().toLocaleDateString('en-IN', options);

    // Calculate Today's Stats from Analytics
    const orders = JSON.parse(localStorage.getItem('grocery_orders')) || [];
    
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
            
            // Optional: Count unique customers only, or count every transaction as a "customer". 
            // The prompt says "how many customer come today", usually interpreted as transactions or distinct names.
            // We'll count distinct names:
            if (!uniqueCustomersToday.includes(order.customerName)) {
                uniqueCustomersToday.push(order.customerName);
            }
        }
    });

    customersTodayCount = uniqueCustomersToday.length;

    // Animate numbers for visual flair
    animateValue("todayCustomers", 0, customersTodayCount, 1500);
    
    // Formatting currency and animating
    document.getElementById('todayRevenue').innerText = `₹${parseFloat(revenueToday).toFixed(2)}`;

    // Render historical customer orders and billings list
    renderPastOrders(orders);
});

// Render historical orders
function renderPastOrders(orders) {
    const pastOrdersTableBody = document.getElementById('pastOrdersTableBody');
    if (!pastOrdersTableBody) return;

    const customers = JSON.parse(localStorage.getItem('grocery_customers')) || [];

    // Sort orders descending by date (newest first)
    const sortedOrders = [...orders].sort((a, b) => new Date(b.date) - new Date(a.date));

    pastOrdersTableBody.innerHTML = '';

    if (sortedOrders.length === 0) {
        pastOrdersTableBody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; color: var(--text-secondary); padding: 30px;">
                    No past sales found.
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

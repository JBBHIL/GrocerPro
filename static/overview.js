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
});

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

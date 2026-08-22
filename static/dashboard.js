// In-memory products array synced with database
let products = [];

// Load products from backend SQLite
async function loadProductsFromServer() {
    try {
        const res = await fetch('/api/products');
        const data = await res.json();
        if (data.success) {
            products = data.products;
        }
    } catch (err) {
        console.error('Failed to load products from server:', err);
    }
}

// Utility functions
const saveProducts = () => {}; // No-op now as database manages persistence
const formatCurrency = (amount) => `₹${parseFloat(amount).toFixed(2)}`;
const generateId = () => products.length > 0 ? Math.max(...products.map(p => p.id)) + 1 : 1;

// Elements
const tableBody = document.getElementById('tableBody');
const gridContainer = document.getElementById('gridContainer');
const searchInput = document.getElementById('searchInput');
const categoryFilter = document.getElementById('categoryFilter');
const modal = document.getElementById('productModal');
const productForm = document.getElementById('productForm');

// File Upload Elements
const imageBtn = document.getElementById('productImage');
const fileNameDisplay = document.getElementById('fileNameDisplay');
const hiddenImageData = document.getElementById('productImageData');

let currentView = 'table'; // Track active view state
let activeCardFilter = 'all'; // 'all', 'low_stock', 'sold_today'

// Initialize Dashboard
let lastNotifiedStocks = {};
let listenersSetup = false;

async function init() {
    setupCardListeners();
    await loadProductsFromServer();
    
    // Initialize stock levels without showing toasts
    products.forEach(p => {
        lastNotifiedStocks[p.id] = p.stock;
    });

    if (tableBody) renderDashboardView();
    if (document.getElementById('totalProductsCount')) await updateDashboardStats();
    if (document.getElementById('notificationBadge')) checkStockAlerts(true);
}

function setupCardListeners() {
    if (listenersSetup) return;
    listenersSetup = true;
    const cardTotal = document.getElementById('cardTotalProducts');
    const cardLow = document.getElementById('cardLowStock');
    const cardSold = document.getElementById('cardItemsSoldToday');

    if (cardTotal) {
        cardTotal.addEventListener('click', () => setActiveCard('all'));
    }
    if (cardLow) {
        cardLow.addEventListener('click', () => setActiveCard('low_stock'));
    }
    if (cardSold) {
        cardSold.addEventListener('click', () => setActiveCard('sold_today'));
    }
}

function setActiveCard(filter) {
    activeCardFilter = filter;
    
    // Toggle active classes on cards
    const cardTotal = document.getElementById('cardTotalProducts');
    const cardLow = document.getElementById('cardLowStock');
    const cardSold = document.getElementById('cardItemsSoldToday');
    
    if (cardTotal) cardTotal.classList.toggle('active', filter === 'all');
    if (cardLow) cardLow.classList.toggle('active', filter === 'low_stock');
    if (cardSold) cardSold.classList.toggle('active', filter === 'sold_today');
    
    renderDashboardView();
}

async function renderDashboardView() {
    const titleEl = document.getElementById('sectionTitle');
    const actionsEl = document.getElementById('inventoryActions');
    const invTableContainer = document.getElementById('inventoryTableContainer');
    const salesTableContainer = document.getElementById('salesTableContainer');
    
    if (activeCardFilter === 'sold_today') {
        if (titleEl) titleEl.innerText = "Today's Customer Orders & Bills";
        if (actionsEl) actionsEl.style.display = 'none';
        if (invTableContainer) invTableContainer.style.display = 'none';
        if (gridContainer) gridContainer.style.display = 'none';
        if (salesTableContainer) salesTableContainer.style.display = 'block';
        await renderSalesTable();
    } else {
        if (titleEl) {
            titleEl.innerText = activeCardFilter === 'low_stock' ? "Inventory Management - Low Stock" : "Inventory Management";
        }
        if (actionsEl) actionsEl.style.display = 'flex';
        
        if (currentView === 'table') {
            if (invTableContainer) invTableContainer.style.display = 'block';
            if (gridContainer) gridContainer.style.display = 'none';
        } else {
            if (invTableContainer) invTableContainer.style.display = 'none';
            if (gridContainer) gridContainer.style.display = 'grid';
        }
        if (salesTableContainer) salesTableContainer.style.display = 'none';
        renderTable();
    }
}

async function renderSalesTable() {
    const salesTableBody = document.getElementById('salesTableBody');
    if (!salesTableBody) return;
    
    let orders = [];
    let customers = [];
    
    try {
        const ordersRes = await fetch('/api/orders');
        const ordersData = await ordersRes.json();
        if (ordersData.success) orders = ordersData.orders;

        const customersRes = await fetch('/api/customers');
        const customersData = await customersRes.json();
        if (customersData.success) customers = customersData.customers;
    } catch (err) {
        console.error('Failed to load sales data:', err);
    }
    
    const today = new Date().toLocaleDateString();
    const todayOrders = orders.filter(order => {
        return new Date(order.date).toLocaleDateString() === today;
    });

    salesTableBody.innerHTML = '';

    if (todayOrders.length === 0) {
        salesTableBody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; color: var(--text-secondary); padding: 30px;">
                    No items sold today.
                </td>
            </tr>
        `;
        return;
    }

    todayOrders.forEach(order => {
        // Find customer details from registry
        const custInfo = customers.find(c => c.name.toLowerCase() === order.customerName.toLowerCase()) || {
            mobile: 'N/A',
            address: 'Walk-in Customer'
        };

        const timeStr = new Date(order.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        // Generate items list display
        const itemsHtml = order.items.map(item => `
            <div class="sales-item-badge">
                <span>${item.name}</span>
                <strong style="color: var(--accent-color)">x${item.qty}</strong>
                <span style="color: var(--text-secondary)">(${formatCurrency(item.price)})</span>
            </div>
        `).join('');

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>
                <strong>#${order.orderId}</strong>
                <div style="font-size: 12px; color: var(--text-secondary); margin-top: 4px;">${timeStr}</div>
            </td>
            <td>
                <div class="sales-customer-info">
                    <strong>${order.customerName}</strong>
                    <span class="phone"><i class="fa-solid fa-phone" style="font-size: 10px; margin-right: 4px;"></i>${custInfo.mobile}</span>
                    <span class="address"><i class="fa-solid fa-location-dot" style="font-size: 10px; margin-right: 4px;"></i>${custInfo.address || 'No Address'}</span>
                </div>
            </td>
            <td>
                <div class="sales-items-list">
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
        salesTableBody.appendChild(tr);
    });
}

// Render Table
function renderTable() {
    const searchTerm = searchInput.value.toLowerCase();
    const category = categoryFilter.value;
    
    // Filter logic
    const filteredProducts = products.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(searchTerm);
        const matchesCategory = category === 'All' || p.category === category;
        const matchesStockFilter = activeCardFilter !== 'low_stock' || (p.stock > 0 && p.stock <= 5);
        return matchesSearch && matchesCategory && matchesStockFilter;
    });

    tableBody.innerHTML = '';
    
    filteredProducts.forEach(product => {
        let statusClass = 'status-instock';
        let statusText = 'In Stock';
        
        if (product.stock === 0) {
            statusClass = 'status-out';
            statusText = 'Out of Stock';
        } else if (product.stock <= 5) {
            statusClass = 'status-low';
            statusText = 'Low Stock';
        }

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>
                <div class="item-name-cell">
                    <img src="${product.icon}" class="item-img" style="object-fit:cover;">
                    <span>${product.name}</span>
                </div>
            </td>
            <td>${product.category}</td>
            <td>${formatCurrency(product.price)}</td>
            <td><strong>${product.stock}</strong> units</td>
            <td><span class="status-badge ${statusClass}">${statusText}</span></td>
            <td>
                <div class="action-btns">
                    <button class="action-btn stock-btn" onclick="openModal('stock', ${product.id})" title="Add Stock"><i class="fa-solid fa-plus"></i></button>
                    <button class="action-btn edit-btn" onclick="openModal('edit', ${product.id})" title="Edit Item"><i class="fa-solid fa-pen"></i></button>
                    <button class="action-btn delete-btn" onclick="deleteProduct(${product.id})" title="Delete"><i class="fa-solid fa-trash"></i></button>
                </div>
            </td>
        `;
        tableBody.appendChild(tr);
    });

    // Render Grid simultaneously 
    renderGrid(filteredProducts);
}

// Render Grid View
function renderGrid(filteredProducts) {
    gridContainer.innerHTML = '';
    
    filteredProducts.forEach(product => {
        let statusClass = 'status-instock';
        let statusText = 'In Stock';
        
        if (product.stock === 0) {
            statusClass = 'status-out';
            statusText = 'Out of Stock';
        } else if (product.stock <= 5) {
            statusClass = 'status-low';
            statusText = 'Low Stock';
        }

        const card = document.createElement('div');
        card.className = 'product-card';
        card.innerHTML = `
            <img src="${product.icon}" class="product-img" alt="${product.name}">
            <div class="product-details">
                <div class="product-header">
                    <div class="product-title">${product.name}</div>
                    <div class="product-category">${product.category}</div>
                </div>
                <div class="product-price">${formatCurrency(product.price)}</div>
                
                <div class="product-stock">
                    <span>${product.stock} units remaining</span>
                    <span class="status-badge ${statusClass}">${statusText}</span>
                </div>
                
                <div class="product-actions">
                    <button class="action-btn stock-btn" onclick="openModal('stock', ${product.id})" title="Add Stock"><i class="fa-solid fa-plus"></i> Stock</button>
                    <button class="action-btn edit-btn" onclick="openModal('edit', ${product.id})" title="Edit Item"><i class="fa-solid fa-pen"></i> Edit</button>
                </div>
            </div>
        `;
        gridContainer.appendChild(card);
    });
}

// Toggle View Functionality
function switchView(view) {
    currentView = view;
    document.getElementById('tableViewBtn').classList.toggle('active', view === 'table');
    document.getElementById('gridViewBtn').classList.toggle('active', view === 'grid');
    renderDashboardView();
}

// Update Dashboard Statistics
async function updateDashboardStats() {
    // Total Products
    if(document.getElementById('totalProductsCount')) {
        document.getElementById('totalProductsCount').innerText = products.length;
    }
    
    // Low Stock Count
    if(document.getElementById('lowStockCount')) {
        const lowStock = products.filter(p => p.stock > 0 && p.stock <= 5).length;
        document.getElementById('lowStockCount').innerText = lowStock;
    }

    try {
        const res = await fetch('/api/orders');
        const data = await res.json();
        if (data.success) {
            const orders = data.orders;
            const today = new Date().toLocaleDateString();
            
            const todayOrders = orders.filter(order => {
                return new Date(order.date).toLocaleDateString() === today;
            });

            // Items Sold Today
            if(document.getElementById('itemsSoldToday')) {
                const totalItemsSold = todayOrders.reduce((sum, order) => {
                    return sum + order.items.reduce((itemSum, item) => itemSum + item.qty, 0);
                }, 0);
                document.getElementById('itemsSoldToday').innerText = totalItemsSold;
            }


            // Total Payment Today (Revenue Today)
            if(document.getElementById('totalPaymentToday')) {
                const totalRevenue = todayOrders.reduce((sum, order) => sum + order.totalAmount, 0);
                document.getElementById('totalPaymentToday').innerText = formatCurrency(totalRevenue);
            }
        }
    } catch (err) {
        console.error('Failed to load order statistics:', err);
    }
}

// Notification System for Out of Stock and Low Stock
function checkStockAlerts(suppressToast = false) {
    const alertsItems = products.filter(p => p.stock <= 5);
    const badge = document.getElementById('notificationBadge');
    const notifList = document.getElementById('notificationList');
    
    if (badge) {
        badge.innerText = alertsItems.length;
        badge.style.display = alertsItems.length > 0 ? 'flex' : 'none';
    }
    
    if (notifList) {
        notifList.innerHTML = '';
    }
    
    if (alertsItems.length === 0) {
        if (notifList) {
            notifList.innerHTML = '<div style="padding:20px; text-align:center; color: #94a3b8;">No alerts right now.</div>';
        }
    } else {
        alertsItems.forEach(item => {
            const isAdminNotified = item.stock === 0 ? "completely out of stock" : "running low on stock";
            const isCritical = item.stock === 0;

            // Encode WhatsApp message
            const adminPhone = "919714569280"; // Admin's actual phone number
            const msg = encodeURIComponent(`🚨 ALERT: "${item.name}" is ${isAdminNotified} (${item.stock} remaining) and requires immediate attention!`);
            const waLink = `https://wa.me/${adminPhone}?text=${msg}`;

            if (notifList) {
                notifList.innerHTML += `
                    <div class="notif-item">
                        <div class="notif-icon"><i class="fa-solid fa-box-open"></i></div>
                        <div class="notif-content">
                            <h4>${isCritical ? 'Out of Stock' : 'Low Stock'} Alert</h4>
                            <p style="margin-bottom: 8px;"><strong>${item.name}</strong> has ${item.stock} units left.</p>
                            <a href="${waLink}" target="_blank" class="wa-btn">
                                <i class="fa-brands fa-whatsapp"></i> Notify via WhatsApp
                            </a>
                        </div>
                    </div>
                `;
            }
            
            // Trigger visual toast for out of stock on load/update
            const prevStock = lastNotifiedStocks[item.id];
            if (!suppressToast) {
                if (prevStock === undefined || prevStock > item.stock) {
                    if (isCritical) {
                        showToast('error', 'Out of Stock Alert', `${item.name} is entirely out of stock.`);
                    } else if (prevStock === undefined || prevStock > 5) {
                        showToast('warning', 'Low Stock Alert', `${item.name} is running low (${item.stock} left).`);
                    }
                }
            }
            lastNotifiedStocks[item.id] = item.stock;
        });
    }

    // Cleanup removed products
    Object.keys(lastNotifiedStocks).forEach(id => {
        if (!products.find(p => p.id == id)) {
            delete lastNotifiedStocks[id];
        }
    });
}

// Periodic background refresh every 5 seconds for dashboard (runs only if tab is visible)
setInterval(async () => {
    if (document.hidden) return;
    if (typeof loadProductsFromServer === 'function') {
        await loadProductsFromServer();
        if (tableBody) renderDashboardView();
        if (document.getElementById('totalProductsCount')) await updateDashboardStats();
        if (document.getElementById('notificationBadge')) checkStockAlerts(false);
    }
}, 5000);

// Modal Logic
function openModal(action, id = null) {
    document.getElementById('actionType').value = action;
    const nameGroup = document.getElementById('nameGroup');
    const catGroup = document.getElementById('categoryGroup');
    const imageGroup = document.getElementById('imageGroup');
    const priceInput = document.getElementById('productPrice');
    
    // Reset file input display
    imageBtn.value = '';
    fileNameDisplay.innerText = 'No file chosen';
    hiddenImageData.value = '';

    if (action === 'add') {
        document.getElementById('modalTitle').innerText = 'Add New Product';
        document.getElementById('productId').value = '';
        document.getElementById('productName').value = '';
        document.getElementById('productCategory').value = 'Fruits';
        document.getElementById('productPrice').value = '';
        document.getElementById('productStock').value = '';
        
        nameGroup.style.display = 'block';
        catGroup.style.display = 'block';
        imageGroup.style.display = 'block';
        priceInput.disabled = false;
        
    } else if (action === 'edit' || action === 'stock') {
        const product = products.find(p => p.id === id);
        document.getElementById('productId').value = product.id;
        document.getElementById('productName').value = product.name;
        document.getElementById('productCategory').value = product.category;
        document.getElementById('productPrice').value = product.price;
        hiddenImageData.value = product.icon; // keep existing image by default
        
        if (action === 'edit') {
            document.getElementById('modalTitle').innerText = `Edit: ${product.name}`;
            document.getElementById('productStock').value = product.stock;
            nameGroup.style.display = 'block';
            catGroup.style.display = 'block';
            imageGroup.style.display = 'block';
            fileNameDisplay.innerText = '(Keep current image)';
            priceInput.disabled = false;
        } else if (action === 'stock') {
            document.getElementById('modalTitle').innerText = `Add Stock: ${product.name}`;
            document.getElementById('productStock').value = ''; // clean input for adding to stock
            document.getElementById('productStock').placeholder = `Current stock: ${product.stock}`;
            nameGroup.style.display = 'none';
            catGroup.style.display = 'none';
            imageGroup.style.display = 'none';
            priceInput.disabled = false; // allow price update while adding stock
        }
    }
    
    modal.classList.add('show');
}

function closeModal() {
    modal.classList.remove('show');
}

// File Upload Handler (Convert to Base64)
if (imageBtn) {
    imageBtn.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            fileNameDisplay.innerText = file.name;
            const reader = new FileReader();
            reader.onload = function(event) {
                hiddenImageData.value = event.target.result; // Data URL (base64)
            };
            reader.readAsDataURL(file);
        } else {
            fileNameDisplay.innerText = 'No file chosen';
            hiddenImageData.value = '';
        }
    });
}

// Handle Form Submission
if (productForm) {
    productForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const action = document.getElementById('actionType').value;
        const id = parseInt(document.getElementById('productId').value);
        
        const name = document.getElementById('productName').value;
        const category = document.getElementById('productCategory').value;
        const price = parseFloat(document.getElementById('productPrice').value);
        const stockInput = parseInt(document.getElementById('productStock').value);
        
        // Get image, fallback to a placeholder if none uploaded
        let uploadedIcon = hiddenImageData.value;
        if (!uploadedIcon) {
            uploadedIcon = "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=200"; 
        }
        
        let payload = { name, category, price, stock: stockInput, icon: uploadedIcon };
        if (action === 'edit' || action === 'stock') {
            payload.id = id;
            if (action === 'stock') {
                const product = products.find(p => p.id === id);
                const addedStock = isNaN(stockInput) ? 0 : stockInput;
                payload.stock = product.stock + addedStock;
            }
        }
        
        try {
            const res = await fetch('/api/products', {
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
            showToast('error', 'Network Error', 'Failed to save product to backend database.');
        }
        
        closeModal();
        await init(); // Refresh UI
    });
}

// Delete Product
async function deleteProduct(id) {
    if(confirm("Are you sure you want to remove this product from inventory?")) {
        const product = products.find(p => p.id === id);
        try {
            const res = await fetch(`/api/products/${id}`, {
                method: 'DELETE'
            });
            const data = await res.json();
            if (data.success) {
                showToast('warning', 'Product Removed', `${product.name} deleted successfully.`);
            } else {
                showToast('error', 'Error', data.message);
            }
        } catch (err) {
            console.error(err);
            showToast('error', 'Network Error', 'Failed to remove product.');
        }
        await init();
    }
}

// Notifications toggle
function toggleNotifications() {
    document.getElementById('notificationDropdown').classList.toggle('active');
}

const clearNotifs = document.getElementById('clearNotifications');
if (clearNotifs) {
    clearNotifs.addEventListener('click', (e) => {
        e.stopPropagation();
        document.getElementById('notificationList').innerHTML = '<div style="padding:20px; text-align:center; color: #94a3b8;">Notifications cleared.</div>';
        document.getElementById('notificationBadge').style.display = 'none';
    });
}

// Close dropdown when clicking outside
window.addEventListener('click', (e) => {
    if(!e.target.closest('.notification-icon')) {
        const drop = document.getElementById('notificationDropdown');
        if (drop) drop.classList.remove('active');
    }
});

// Filters
if (searchInput) searchInput.addEventListener('input', renderTable);
if (categoryFilter) categoryFilter.addEventListener('change', renderTable);

// Toast Component
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

// Run on load
init();

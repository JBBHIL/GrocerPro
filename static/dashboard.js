// Initial Mock Data Fallback
const defaultProducts = [
    { id: 1, name: "Organic Avocados", category: "Fruits", price: 299, stock: 45, icon: "https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?auto=format&fit=crop&q=80&w=200" },
    { id: 2, name: "Whole Milk 1L", category: "Dairy", price: 65, stock: 12, icon: "https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&q=80&w=200" },
    { id: 3, name: "Farm Fresh Eggs (12)", category: "Dairy", price: 80, stock: 3, icon: "https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?auto=format&fit=crop&q=80&w=200" },
    { id: 4, name: "Sourdough Bread", category: "Bakery", price: 120, stock: 0, icon: "https://images.unsplash.com/photo-1585445422617-30198a2eb8fb?auto=format&fit=crop&q=80&w=200" },
    { id: 5, name: "Premium Beef Steak", category: "Meat", price: 599, stock: 8, icon: "https://images.unsplash.com/photo-1603048297172-c92544798d5e?auto=format&fit=crop&q=80&w=200" },
    { id: 6, name: "Fresh Spinach", category: "Vegetables", price: 40, stock: 25, icon: "https://images.unsplash.com/photo-1576045057995-568f588f82fb?auto=format&fit=crop&q=80&w=200" }
];

let products = JSON.parse(localStorage.getItem('grocery_products')) || defaultProducts;

// Utility functions
const saveProducts = () => localStorage.setItem('grocery_products', JSON.stringify(products));
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

// Initialize Dashboard
function init() {
    if (tableBody) renderTable();
    if (document.getElementById('totalProductsCount')) updateDashboardStats();
    if (document.getElementById('notificationBadge')) checkStockAlerts();
}

// Render Table
function renderTable() {
    const searchTerm = searchInput.value.toLowerCase();
    const category = categoryFilter.value;
    
    // Filter logic
    const filteredProducts = products.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(searchTerm);
        const matchesCategory = category === 'All' || p.category === category;
        return matchesSearch && matchesCategory;
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
    
    if (view === 'table') {
        document.querySelector('.table-container').style.display = 'block';
        gridContainer.style.display = 'none';
    } else {
        document.querySelector('.table-container').style.display = 'none';
        gridContainer.style.display = 'grid';
    }
}

// Update Dashboard Statistics
function updateDashboardStats() {
    // Total Products
    if(document.getElementById('totalProductsCount')) {
        document.getElementById('totalProductsCount').innerText = products.length;
    }
    
    // Low Stock Count
    if(document.getElementById('lowStockCount')) {
        const lowStock = products.filter(p => p.stock > 0 && p.stock <= 5).length;
        document.getElementById('lowStockCount').innerText = lowStock;
    }

    // Today's Sales Calculations
    const orders = JSON.parse(localStorage.getItem('grocery_orders')) || [];
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

// Notification System for Out of Stock and Low Stock
function checkStockAlerts() {
    const alertsItems = products.filter(p => p.stock <= 5);
    const badge = document.getElementById('notificationBadge');
    const notifList = document.getElementById('notificationList');
    
    badge.innerText = alertsItems.length;
    badge.style.display = alertsItems.length > 0 ? 'flex' : 'none';
    
    notifList.innerHTML = '';
    
    if (alertsItems.length === 0) {
        notifList.innerHTML = '<div style="padding:20px; text-align:center; color: #94a3b8;">No alerts right now.</div>';
    } else {
        alertsItems.forEach(item => {
            const isAdminNotified = item.stock === 0 ? "completely out of stock" : "running low on stock";
            const isCritical = item.stock === 0;

            // Encode WhatsApp message
            const adminPhone = "919714569280"; // Admin's actual phone number
            const msg = encodeURIComponent(`🚨 ALERT: "${item.name}" is ${isAdminNotified} (${item.stock} remaining) and requires immediate attention!`);
            const waLink = `https://wa.me/${adminPhone}?text=${msg}`;

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
            // Trigger visual toast for out of stock on load/update
            if(isCritical) {
              showToast('error', 'Out of Stock Alert', `${item.name} is entirely out of stock.`);
            } else {
              showToast('warning', 'Low Stock Alert', `${item.name} is running low (${item.stock} left).`);
            }
        });
    }
}

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
    productForm.addEventListener('submit', (e) => {
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
        
        if (action === 'add') {
            products.unshift({
                id: generateId(),
                name,
                category,
                price,
                stock: stockInput,
                icon: uploadedIcon
            });
            showToast('success', 'Product Added', `${name} added to inventory.`);
            
        } else if (action === 'edit') {
            const index = products.findIndex(p => p.id === id);
            products[index] = { ...products[index], name, category, price, stock: stockInput, icon: uploadedIcon };
            showToast('success', 'Product Updated', `${name} details updated.`);
            
        } else if (action === 'stock') {
            const index = products.findIndex(p => p.id === id);
            const addedStock = isNaN(stockInput) ? 0 : stockInput;
            products[index].stock += addedStock;
            products[index].price = price; // Update price as well
            showToast('success', 'Stock Added', `Added ${addedStock} units to ${products[index].name}. Price updated to ₹${price}.`);
        }
        
        saveProducts(); // Save DB changes
        closeModal();
        init(); // Refresh UI
    });
}

// Delete Product
function deleteProduct(id) {
    if(confirm("Are you sure you want to remove this product from inventory?")) {
        const product = products.find(p => p.id === id);
        products = products.filter(p => p.id !== id);
        saveProducts(); // Save DB changes
        showToast('warning', 'Product Removed', `${product.name} deleted successfully.`);
        init();
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

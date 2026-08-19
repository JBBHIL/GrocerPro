// Global Data (Fallback onto dashboard.js products data)
let cart = [];
let paymentMethod = 'Cash';

// Elements
const posGrid = document.getElementById('posProductGrid');
const cartItemsContainer = document.getElementById('cartItems');

// Inputs
const nameInput = document.getElementById('manualCustName');
const mobileInput = document.getElementById('manualCustMobile');
const addrInput = document.getElementById('manualCustAddress');
const posSearch = document.getElementById('posSearch');
const posCategory = document.getElementById('posCategory');
const confirmBtn = document.getElementById('confirmOrderBtn');

function initPOS() {
    renderPOSGrid();
    updateCartUI();
}

// Render Products Grid
function renderPOSGrid() {
    const searchTerm = posSearch.value.toLowerCase();
    const category = posCategory.value;
    
    // Filter logic
    const filteredProducts = products.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(searchTerm);
        const matchesCategory = category === 'All' || p.category === category;
        return matchesSearch && matchesCategory;
    });

    posGrid.innerHTML = '';
    
    filteredProducts.forEach(product => {
        const isOutOfStock = product.stock === 0;
        const cardClass = isOutOfStock ? 'pos-item-card disabled' : 'pos-item-card';
        
        const card = document.createElement('div');
        card.className = cardClass;
        
        if(!isOutOfStock) {
            card.onclick = () => addToCart(product.id);
        }

        card.innerHTML = `
            <img src="${product.icon}" class="pos-item-img" alt="${product.name}">
            <div class="pos-item-stock">${isOutOfStock ? 'OUT' : product.stock}</div>
            <div class="pos-item-info">
                <div class="pos-item-title">${product.name}</div>
                <div class="pos-item-price">${formatCurrency(product.price)}</div>
            </div>
        `;
        posGrid.appendChild(card);
    });
}

// Add Item
function addToCart(productId) {
    const product = products.find(p => p.id === productId);
    const cartItem = cart.find(item => item.id === productId);
    
    if (cartItem) {
        if (cartItem.qty < product.stock) {
            cartItem.qty++;
        } else {
            showToast('warning', 'Stock Limit', `Only ${product.stock} units available.`);
        }
    } else {
        cart.push({ ...product, qty: 1 });
    }
    
    updateCartUI();
}

// Update Item Qty
function updateQty(productId, delta) {
    const index = cart.findIndex(item => item.id === productId);
    if(index > -1) {
        const newQty = cart[index].qty + delta;
        const product = products.find(p => p.id === productId);
        
        if (newQty <= 0) {
            cart.splice(index, 1);
        } else if (newQty > product.stock) {
            showToast('warning', 'Stock Limit', `Only ${product.stock} units available.`);
        } else {
            cart[index].qty = newQty;
        }
        updateCartUI();
    }
}

// Calculations
function calculateTotals() {
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    const tax = subtotal * 0.05; // 5% tax
    const total = subtotal + tax;

    return { subtotal, tax, total };
}

// Validation Checks
function checkFormValidity() {
    const missingItems = cart.length === 0;
    const missingName = nameInput.value.trim() === '';
    const missingPhone = mobileInput.value.trim() === '';

    confirmBtn.disabled = missingItems || missingName || missingPhone;
}

// Draw cart
function updateCartUI() {
    cartItemsContainer.innerHTML = '';
    
    if (cart.length === 0) {
        cartItemsContainer.innerHTML = `
            <div class="empty-cart" id="emptyCart">
                <i class="fa-solid fa-basket-shopping" style="font-size: 30px; margin-bottom: 10px; opacity: 0.5;"></i>
                <p>Cart is empty</p>
            </div>
        `;
    } else {
        cart.forEach(item => {
            const itemTotal = item.price * item.qty;
            const row = document.createElement('div');
            row.className = 'cart-item-row';
            row.innerHTML = `
                <div class="cart-item-info">
                    <div class="cart-item-name">${item.name}</div>
                    <div class="cart-item-price">${formatCurrency(item.price)}</div>
                </div>
                <div class="cart-item-controls">
                    <button class="qty-btn" onclick="updateQty(${item.id}, -1)"><i class="fa-solid fa-minus" style="font-size:10px;"></i></button>
                    <span style="font-weight: 600; width: 20px; text-align: center;">${item.qty}</span>
                    <button class="qty-btn" onclick="updateQty(${item.id}, 1)"><i class="fa-solid fa-plus" style="font-size:10px;"></i></button>
                </div>
                <div class="cart-item-total">${formatCurrency(itemTotal)}</div>
            `;
            cartItemsContainer.appendChild(row);
        });
    }

    const totals = calculateTotals();
    document.getElementById('calcSubtotal').innerText = formatCurrency(totals.subtotal);
    document.getElementById('calcTax').innerText = formatCurrency(totals.tax);
    document.getElementById('calcTotal').innerText = formatCurrency(totals.total);
    
    checkFormValidity();
}

// Payment Select
document.querySelectorAll('.pay-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        document.querySelectorAll('.pay-btn').forEach(b => b.classList.remove('active'));
        const target = e.currentTarget;
        target.classList.add('active');
        paymentMethod = target.getAttribute('data-method');
    });
});

// User Types event checks
nameInput.addEventListener('input', checkFormValidity);
mobileInput.addEventListener('input', checkFormValidity);
posSearch.addEventListener('input', renderPOSGrid);
posCategory.addEventListener('change', renderPOSGrid);


// On Form Complete + Sync to other dashboads 
confirmBtn.addEventListener('click', () => {
    const totals = calculateTotals();
    const custName = nameInput.value.trim();
    const custMobile = mobileInput.value.trim();
    const custAddr = addrInput.value.trim();

    // 1. Decrement Stock from Main DB
    cart.forEach(cartItem => {
        const productIndex = products.findIndex(p => p.id === cartItem.id);
        if(productIndex > -1) {
            products[productIndex].stock -= cartItem.qty; 
        }
    });
    saveProducts(); // provided by dashboard.js

    // 2. Add Customer to Customers DB
    // (We will check if they exist by phone, and if not append them)
    let theCustomers = JSON.parse(localStorage.getItem('grocery_customers')) || [];
    const exists = theCustomers.find(c => c.mobile === custMobile);
    
    if(!exists) {
        const newId = theCustomers.length > 0 ? Math.max(...theCustomers.map(c => c.id)) + 1 : 1;
        theCustomers.unshift({
            id: newId,
            name: custName,
            mobile: custMobile,
            email: "", // Not asked for based on prompt
            address: custAddr,
            discount: "None"
        });
        localStorage.setItem('grocery_customers', JSON.stringify(theCustomers));
    }

    // 3. Add to Analytics DB
    const orderHistory = JSON.parse(localStorage.getItem('grocery_orders')) || [];
    orderHistory.push({
        orderId: Math.random().toString(36).substr(2, 9).toUpperCase(),
        date: new Date().toISOString(),
        customerName: custName,
        paymentMethod: paymentMethod,
        items: cart.map(item => ({ name: item.name, qty: item.qty, price: item.price })),
        totalAmount: totals.total
    });
    localStorage.setItem('grocery_orders', JSON.stringify(orderHistory));

    // Show visual confirmation
    document.getElementById('receiptTotal').innerText = formatCurrency(totals.total);
    document.getElementById('receiptMsg').innerText = `Processed ${paymentMethod} payment for ${custName}.`;
    document.getElementById('receiptModal').classList.add('show');
    
    renderPOSGrid(); 
});

function startNewOrder() {
    document.getElementById('receiptModal').classList.remove('show');
    cart = [];
    nameInput.value = '';
    mobileInput.value = '';
    addrInput.value = '';
    
    document.querySelectorAll('.pay-btn').forEach(b => b.classList.remove('active'));
    document.querySelector('.pay-btn[data-method="Cash"]').classList.add('active');
    paymentMethod = 'Cash';

    updateCartUI();
}

// Ignition
initPOS();

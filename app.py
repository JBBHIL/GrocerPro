import os
import sqlite3
import random
import json
from flask import Flask, render_template, request, jsonify, session, redirect, url_for

app = Flask(__name__)
app.secret_key = os.urandom(24)

DATABASE = 'users.db'

def get_db():
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    with get_db() as conn:
        conn.execute('''
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                username TEXT UNIQUE NOT NULL,
                client_id TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL
            )
        ''')
        conn.execute('''
            CREATE TABLE IF NOT EXISTS products (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                client_id TEXT NOT NULL,
                name TEXT NOT NULL,
                category TEXT NOT NULL,
                price REAL NOT NULL,
                stock INTEGER NOT NULL,
                icon TEXT
            )
        ''')
        conn.execute('''
            CREATE TABLE IF NOT EXISTS customers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                client_id TEXT NOT NULL,
                name TEXT NOT NULL,
                mobile TEXT NOT NULL,
                email TEXT,
                address TEXT,
                discount TEXT
            )
        ''')
        conn.execute('''
            CREATE TABLE IF NOT EXISTS orders (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                client_id TEXT NOT NULL,
                order_id TEXT NOT NULL,
                date TEXT NOT NULL,
                customer_name TEXT NOT NULL,
                payment_method TEXT NOT NULL,
                items TEXT NOT NULL,
                total_amount REAL NOT NULL
            )
        ''')
        
        # Insert default admin user if not exists
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM users WHERE username = 'admin'")
        if not cursor.fetchone():
            cursor.execute(
                "INSERT INTO users (name, username, client_id, email, password) VALUES (?, ?, ?, ?, ?)",
                ("Admin Manager", "admin", "client123", "admin@freshadmin.com", "admin")
            )
            
        # Seed Happy super-admin user
        cursor.execute("SELECT * FROM users WHERE username = 'Happy'")
        if not cursor.fetchone():
            cursor.execute(
                "INSERT INTO users (name, username, client_id, email, password) VALUES (?, ?, ?, ?, ?)",
                ("Admin Owner", "Happy", "admin", "happy@grocerpro.com", "10111011")
            )
            
        # Seed default products for client123
        cursor.execute("SELECT COUNT(*) FROM products WHERE client_id = 'client123'")
        if cursor.fetchone()[0] == 0:
            default_products = [
                ("Organic Avocados", "Fruits", 299.00, 45, "https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?auto=format&fit=crop&q=80&w=200"),
                ("Whole Milk 1L", "Dairy", 65.00, 12, "https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&q=80&w=200"),
                ("Farm Fresh Eggs (12)", "Dairy", 80.00, 3, "https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?auto=format&fit=crop&q=80&w=200"),
                ("Sourdough Bread", "Bakery", 120.00, 0, "https://images.unsplash.com/photo-1585445422617-30198a2eb8fb?auto=format&fit=crop&q=80&w=200"),
                ("Premium Beef Steak", "Meat", 599.00, 8, "https://images.unsplash.com/photo-1603048297172-c92544798d5e?auto=format&fit=crop&q=80&w=200"),
                ("Fresh Spinach", "Vegetables", 40.00, 25, "https://images.unsplash.com/photo-1576045057995-568f588f82fb?auto=format&fit=crop&q=80&w=200")
            ]
            for name, cat, price, stock, icon in default_products:
                cursor.execute(
                    "INSERT INTO products (client_id, name, category, price, stock, icon) VALUES (?, ?, ?, ?, ?, ?)",
                    ("client123", name, cat, price, stock, icon)
                )
        
        # Seed default customers for client123
        cursor.execute("SELECT COUNT(*) FROM customers WHERE client_id = 'client123'")
        if cursor.fetchone()[0] == 0:
            default_customers = [
                ("Rahul Sharma", "+91 98765 43210", "rahul@example.com", "A-12, Green Park, South Delhi", "5% Off"),
                ("Priya Patel", "+91 87654 32109", "priya.p@example.com", "405, Shivam Heights, Ahmedabad", "Free Delivery"),
                ("Amit Kumar", "+91 76543 21098", "", "B-22/3, Sector 62, Noida", "None"),
                ("Sneha Desai", "+91 65432 10987", "sneha.d@exam.com", "Flat 101, Sea View Apts, Mumbai", "10% Off"),
                ("Vikram Singh", "+91 99887 76655", "vikram@mail.in", "H.No 45, Phase 2, Chandigarh", "None")
            ]
            for name, mobile, email, addr, disc in default_customers:
                cursor.execute(
                    "INSERT INTO customers (client_id, name, mobile, email, address, discount) VALUES (?, ?, ?, ?, ?, ?)",
                    ("client123", name, mobile, email, addr, disc)
                )
        conn.commit()

# Initialize DB on import
init_db()

# --- Page Routes ---

@app.route('/')
def index():
    if 'username' in session:
        return redirect(url_for('overview'))
    return render_template('index.html')

@app.route('/overview')
def overview():
    if 'username' not in session:
        return redirect(url_for('index'))
    return render_template('overview.html')

@app.route('/customers')
def customers():
    if 'username' not in session:
        return redirect(url_for('index'))
    return render_template('customers.html')



@app.route('/orders')
def orders():
    if 'username' not in session:
        return redirect(url_for('index'))
    return render_template('orders.html')

@app.route('/analytics')
def analytics():
    if 'username' not in session:
        return redirect(url_for('index'))
    return render_template('analytics.html')

@app.route('/dashboard')
def dashboard():
    if 'username' not in session:
        return redirect(url_for('index'))
    return render_template('dashboard.html')

# --- API Endpoints ---

@app.route('/api/login', methods=['POST'])
def api_login():
    data = request.get_json() or {}
    username = data.get('username', '').strip()
    client_id = data.get('client_id', '').strip()
    password = data.get('password', '')

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM users WHERE username = ? AND client_id = ? AND password = ?", (username, client_id, password))
        user = cursor.fetchone()

        if user:
            session['username'] = user['username']
            session['name'] = user['name']
            session['client_id'] = user['client_id']
            is_admin = (user['client_id'] == 'admin')
            return jsonify({'success': True, 'message': f"Welcome, {user['name']}", 'is_admin': is_admin})
        else:
            return jsonify({'success': False, 'message': "Invalid credentials (username, client ID, or password)."}), 401



@app.route('/api/forgot-password', methods=['POST'])
def api_forgot_password():
    data = request.get_json() or {}
    username = data.get('username', '').strip()
    email = data.get('email', '').strip()

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM users WHERE username = ? AND email = ?", (username, email))
        user = cursor.fetchone()

        if user:
            # Generate 6-digit code
            code = str(random.randint(100000, 999999))
            # Store in session for verification
            session['reset_code'] = code
            session['reset_username'] = username
            session['reset_email'] = email
            # Return code for client toast display
            return jsonify({'success': True, 'code': code, 'message': "Verification code generated."})
        else:
            return jsonify({'success': False, 'message': "No matching username and email found."}), 404

@app.route('/api/reset-password', methods=['POST'])
def api_reset_password():
    data = request.get_json() or {}
    code = data.get('code', '').strip()
    password = data.get('password', '')

    session_code = session.get('reset_code')
    session_user = session.get('reset_username')

    if not session_code or not session_user:
        return jsonify({'success': False, 'message': "Reset session has expired or is invalid."}), 400

    if code != session_code:
        return jsonify({'success': False, 'message': "The verification code is incorrect."}), 400

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("UPDATE users SET password = ? WHERE username = ?", (password, session_user))
        conn.commit()

    # Clear code session
    session.pop('reset_code', None)
    session.pop('reset_username', None)
    session.pop('reset_email', None)

    return jsonify({'success': True, 'message': "Password has been reset successfully."})

@app.route('/api/logout', methods=['GET', 'POST'])
def api_logout():
    session.clear()
    return redirect(url_for('index'))

# --- CRUD API for Products ---

@app.route('/api/products', methods=['GET'])
def get_products():
    if 'client_id' not in session:
        return jsonify({'success': False, 'message': 'Unauthorized'}), 401
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id, name, category, price, stock, icon FROM products ORDER BY id DESC")
        products_list = [dict(row) for row in cursor.fetchall()]
        return jsonify({'success': True, 'products': products_list})

@app.route('/api/products', methods=['POST'])
def save_product():
    if 'client_id' not in session:
        return jsonify({'success': False, 'message': 'Unauthorized'}), 401
    data = request.get_json() or {}
    product_id = data.get('id')
    name = data.get('name', '').strip()
    category = data.get('category', '').strip()
    price = float(data.get('price', 0))
    stock = int(data.get('stock', 0))
    icon = data.get('icon', '').strip()

    if not all([name, category]):
        return jsonify({'success': False, 'message': 'Product name and category are required.'}), 400

    with get_db() as conn:
        cursor = conn.cursor()
        if product_id:
            cursor.execute(
                "UPDATE products SET name = ?, category = ?, price = ?, stock = ?, icon = ? WHERE id = ?",
                (name, category, price, stock, icon, product_id)
            )
            msg = "Product updated successfully."
        else:
            # client_id is NOT NULL in database schema, so we insert 'global' as the client ID
            cursor.execute(
                "INSERT INTO products (client_id, name, category, price, stock, icon) VALUES (?, ?, ?, ?, ?, ?)",
                ('global', name, category, price, stock, icon)
            )
            product_id = cursor.lastrowid
            msg = "Product added successfully."
        conn.commit()
        return jsonify({'success': True, 'message': msg, 'product_id': product_id})

@app.route('/api/products/<int:id>', methods=['DELETE'])
def delete_product(id):
    if 'client_id' not in session:
        return jsonify({'success': False, 'message': 'Unauthorized'}), 401
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM products WHERE id = ?", (id,))
        conn.commit()
        return jsonify({'success': True, 'message': 'Product deleted successfully.'})

# --- CRUD API for Customers ---

@app.route('/api/customers', methods=['GET'])
def get_customers():
    if 'client_id' not in session:
        return jsonify({'success': False, 'message': 'Unauthorized'}), 401
    client_id = session['client_id']
    with get_db() as conn:
        cursor = conn.cursor()
        
        # 1. Backfill customer profiles from orders if they don't exist
        cursor.execute("SELECT DISTINCT customer_name FROM orders WHERE client_id = ?", (client_id,))
        order_names = [row['customer_name'].strip() for row in cursor.fetchall() if row['customer_name'] and row['customer_name'].strip().lower() != 'walk-in customer']
        
        for name in order_names:
            cursor.execute("SELECT id FROM customers WHERE client_id = ? AND LOWER(name) = ?", (client_id, name.lower()))
            if not cursor.fetchone():
                cursor.execute(
                    "INSERT INTO customers (client_id, name, mobile, email, address, discount) VALUES (?, ?, ?, ?, ?, ?)",
                    (client_id, name, "N/A", "", "Walk-in Customer", "None")
                )
        conn.commit()

        # 2. Fetch all registered customers
        cursor.execute("SELECT id, name, mobile, email, address, discount FROM customers WHERE client_id = ? ORDER BY id DESC", (client_id,))
        customers_list = [dict(row) for row in cursor.fetchall()]
        return jsonify({'success': True, 'customers': customers_list})

@app.route('/api/customers', methods=['POST'])
def save_customer():
    if 'client_id' not in session:
        return jsonify({'success': False, 'message': 'Unauthorized'}), 401
    client_id = session['client_id']
    data = request.get_json() or {}
    customer_id = data.get('id')
    name = data.get('name', '').strip()
    mobile = data.get('mobile', '').strip()
    email = data.get('email', '').strip()
    address = data.get('address', '').strip()
    discount = data.get('discount', 'None').strip()

    if not all([name, mobile]):
        return jsonify({'success': False, 'message': 'Customer name and mobile are required.'}), 400

    with get_db() as conn:
        cursor = conn.cursor()
        if customer_id:
            cursor.execute(
                "UPDATE customers SET name = ?, mobile = ?, email = ?, address = ?, discount = ? WHERE id = ? AND client_id = ?",
                (name, mobile, email, address, discount, customer_id, client_id)
            )
            msg = "Customer updated successfully."
        else:
            cursor.execute(
                "INSERT INTO customers (client_id, name, mobile, email, address, discount) VALUES (?, ?, ?, ?, ?, ?)",
                (client_id, name, mobile, email, address, discount)
            )
            customer_id = cursor.lastrowid
            msg = "Customer registered successfully."
        conn.commit()
        return jsonify({'success': True, 'message': msg, 'customer_id': customer_id})

@app.route('/api/customers/<int:id>', methods=['DELETE'])
def delete_customer(id):
    if 'client_id' not in session:
        return jsonify({'success': False, 'message': 'Unauthorized'}), 401
    client_id = session['client_id']
    with get_db() as conn:
        cursor = conn.cursor()
        if client_id == 'admin':
            cursor.execute("DELETE FROM customers WHERE id = ?", (id,))
        else:
            cursor.execute("DELETE FROM customers WHERE id = ? AND client_id = ?", (id, client_id))
        conn.commit()
        return jsonify({'success': True, 'message': 'Customer profile deleted.'})

# --- CRUD API for Orders ---

@app.route('/api/orders', methods=['GET'])
def get_orders():
    if 'client_id' not in session:
        return jsonify({'success': False, 'message': 'Unauthorized'}), 401
    client_id = session['client_id']
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id, order_id, date, customer_name, payment_method, items, total_amount FROM orders WHERE client_id = ?", (client_id,))
        orders_rows = cursor.fetchall()
        orders_list = []
        for row in orders_rows:
            orders_list.append({
                'orderId': row['order_id'],
                'date': row['date'],
                'customerName': row['customer_name'],
                'paymentMethod': row['payment_method'],
                'items': json.loads(row['items']),
                'totalAmount': row['total_amount']
            })
        return jsonify({'success': True, 'orders': orders_list})

@app.route('/api/orders', methods=['POST'])
def save_order():
    if 'client_id' not in session:
        return jsonify({'success': False, 'message': 'Unauthorized'}), 401
    client_id = session['client_id']
    data = request.get_json() or {}
    order_id = data.get('orderId', '').strip()
    date = data.get('date', '').strip()
    customer_name = data.get('customerName', '').strip()
    payment_method = data.get('paymentMethod', '').strip()
    items = data.get('items', [])
    total_amount = float(data.get('totalAmount', 0))

    if not all([order_id, customer_name, items]):
        return jsonify({'success': False, 'message': 'Order information is incomplete.'}), 400

    with get_db() as conn:
        cursor = conn.cursor()
        
        # 1. Deduct stock from database
        for item in items:
            cursor.execute(
                "UPDATE products SET stock = MAX(0, stock - ?) WHERE name = ?",
                (int(item['qty']), item['name'])
            )

        # 2. Auto-register customer profile if not already registered
        clean_name = customer_name.strip()
        if clean_name and clean_name.lower() != 'walk-in customer':
            cursor.execute("SELECT id FROM customers WHERE client_id = ? AND LOWER(name) = ?", (client_id, clean_name.lower()))
            if not cursor.fetchone():
                cursor.execute(
                    "INSERT INTO customers (client_id, name, mobile, email, address, discount) VALUES (?, ?, ?, ?, ?, ?)",
                    (client_id, clean_name, "N/A", "", "Walk-in Customer", "None")
                )

        # 3. Insert order
        cursor.execute(
            "INSERT INTO orders (client_id, order_id, date, customer_name, payment_method, items, total_amount) VALUES (?, ?, ?, ?, ?, ?, ?)",
            (client_id, order_id, date, customer_name, payment_method, json.dumps(items), total_amount)
        )
        conn.commit()
        return jsonify({'success': True, 'message': 'Order processed and saved successfully.'})


def generate_and_send_all_daily_reports():
    from datetime import datetime
    import json
    import smtplib
    import io
    import csv
    from email.mime.text import MIMEText
    from email.mime.multipart import MIMEMultipart
    from email.mime.base import MIMEBase
    from email import encoders

    today_str = datetime.today().strftime('%Y-%m-%d')
    with sqlite3.connect(DATABASE) as conn:
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        # Get all users (clients)
        cursor.execute("SELECT client_id, email, name FROM users")
        clients = cursor.fetchall()
        
        for client in clients:
            client_id = client['client_id']
            recipient_email = client['email']
            client_name = client['name']
            
            # Fetch today's orders for this client
            cursor.execute("SELECT order_id, date, customer_name, payment_method, items, total_amount FROM orders WHERE client_id = ?", (client_id,))
            orders_rows = cursor.fetchall()
            
            today_orders = []
            total_sales = 0.0
            for row in orders_rows:
                if row['date'].startswith(today_str):
                    items_list = json.loads(row['items'])
                    today_orders.append({
                        'order_id': row['order_id'],
                        'customer': row['customer_name'],
                        'payment': row['payment_method'],
                        'items': items_list,
                        'total': row['total_amount']
                    })
                    total_sales += row['total_amount']
                    
            if not today_orders:
                continue
                
            # Create Excel/CSV file content
            output = io.StringIO()
            writer = csv.writer(output)
            writer.writerow(['Bill ID', 'Customer Name', 'Items Purchased', 'Payment Method', 'Bill Amount'])
            
            for order in today_orders:
                items_str = ", ".join([f"{item['name']} (x{item['qty']})" for item in order['items']])
                writer.writerow([f"#{order['order_id']}", order['customer'], items_str, order['payment'], f"INR {order['total']:.2f}"])
                
            writer.writerow([])
            writer.writerow(['Total Sales Today', '', '', '', f"INR {total_sales:.2f}"])
            
            csv_data = output.getvalue()
            output.close()
            
            # Construct email message
            msg = MIMEMultipart()
            msg['Subject'] = f"GrocerPro Daily Closing Report - {today_str}"
            msg['From'] = os.environ.get('SMTP_SENDER_EMAIL', 'no-reply@grocerpro.com')
            msg['To'] = recipient_email
            
            body = f"Dear {client_name},\n\nPlease find attached your daily sales closing report (Excel/CSV format) for today, {today_str}.\n\nTotal Sales Today: INR {total_sales:.2f}\n\nThank you for using GrocerPro!"
            msg.attach(MIMEText(body, 'plain'))
            
            # Attach CSV
            part = MIMEBase('application', 'octet-stream')
            part.set_payload(csv_data.encode('utf-8'))
            encoders.encode_base64(part)
            part.add_header('Content-Disposition', f'attachment; filename="daily_report_{today_str}.csv"')
            msg.attach(part)
            
            # Send email
            try:
                smtp_server = os.environ.get('SMTP_SERVER', 'localhost')
                smtp_port = int(os.environ.get('SMTP_PORT', 1025))
                with smtplib.SMTP(smtp_server, smtp_port, timeout=5) as server:
                    server.sendmail(msg['From'], recipient_email, msg.as_string())
                    print(f"Sent scheduled daily closing report to {recipient_email}")
            except Exception as e:
                print(f"\n--- [AUTO-REPORT EMAIL SIMULATION FOR {recipient_email}] ---")
                print(f"To: {recipient_email}")
                print(f"Attachment CSV Content:\n{csv_data}")
                print("----------------------------------------------------------\n")

@app.route('/admin-dashboard')
def admin_dashboard():
    if 'username' not in session or session.get('client_id') != 'admin':
        return redirect(url_for('index'))
    return render_template('admin_dashboard.html')

# --- Super Admin API Endpoints ---

@app.route('/api/admin/clients', methods=['GET'])
def admin_get_clients():
    if 'username' not in session or session.get('client_id') != 'admin':
        return jsonify({'success': False, 'message': 'Unauthorized'}), 401
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id, name, username, client_id, email, password FROM users WHERE client_id != 'admin' ORDER BY id DESC")
        clients_list = [dict(row) for row in cursor.fetchall()]
        return jsonify({'success': True, 'clients': clients_list})

@app.route('/api/admin/clients', methods=['POST'])
def admin_save_client():
    if 'username' not in session or session.get('client_id') != 'admin':
        return jsonify({'success': False, 'message': 'Unauthorized'}), 401
    data = request.get_json() or {}
    client_row_id = data.get('id')
    name = data.get('name', '').strip()
    username = data.get('username', '').strip()
    client_id = data.get('client_id', '').strip()
    email = data.get('email', '').strip()
    password = data.get('password', '')

    if not all([name, username, client_id, email, password]):
        return jsonify({'success': False, 'message': 'All fields are required.'}), 400

    with get_db() as conn:
        cursor = conn.cursor()
        try:
            if client_row_id:
                cursor.execute(
                    "UPDATE users SET name = ?, username = ?, client_id = ?, email = ?, password = ? WHERE id = ?",
                    (name, username, client_id, email, password, client_row_id)
                )
                msg = "Client account updated successfully."
            else:
                cursor.execute(
                    "INSERT INTO users (name, username, client_id, email, password) VALUES (?, ?, ?, ?, ?)",
                    (name, username, client_id, email, password)
                )
                msg = "Client account created successfully."
            conn.commit()
            return jsonify({'success': True, 'message': msg})
        except sqlite3.IntegrityError as e:
            return jsonify({'success': False, 'message': 'Username or Email is already registered.'}), 400

@app.route('/api/admin/clients/<int:id>', methods=['DELETE'])
def admin_delete_client(id):
    if 'username' not in session or session.get('client_id') != 'admin':
        return jsonify({'success': False, 'message': 'Unauthorized'}), 401
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM users WHERE id = ?", (id,))
        conn.commit()
        return jsonify({'success': True, 'message': 'Client account deleted successfully.'})

@app.route('/api/admin/products', methods=['GET'])
def admin_get_products():
    if 'username' not in session or session.get('client_id') != 'admin':
        return jsonify({'success': False, 'message': 'Unauthorized'}), 401
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id, client_id, name, category, price, stock, icon FROM products ORDER BY id DESC")
        products_list = [dict(row) for row in cursor.fetchall()]
        return jsonify({'success': True, 'products': products_list})

@app.route('/api/admin/customers', methods=['GET'])
def admin_get_customers():
    if 'username' not in session or session.get('client_id') != 'admin':
        return jsonify({'success': False, 'message': 'Unauthorized'}), 401
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id, client_id, name, mobile, email, address, discount FROM customers ORDER BY id DESC")
        customers_list = [dict(row) for row in cursor.fetchall()]
        return jsonify({'success': True, 'customers': customers_list})


def daily_report_scheduler():
    import time
    from datetime import datetime, timedelta
    while True:
        now = datetime.now()
        # Schedule for 11:59 PM (23:59:00) every day
        target_time = now.replace(hour=23, minute=59, second=0, microsecond=0)
        
        if now > target_time:
            target_time += timedelta(days=1)
            
        sleep_seconds = (target_time - now).total_seconds()
        time.sleep(sleep_seconds)
        
        try:
            generate_and_send_all_daily_reports()
        except Exception as e:
            print(f"Error in automatic daily report scheduler: {e}")


if __name__ == '__main__':
    import threading
    # Start background scheduler thread for automatic closing report
    t = threading.Thread(target=daily_report_scheduler, daemon=True)
    t.start()
    
    app.run(debug=True, port=8000)

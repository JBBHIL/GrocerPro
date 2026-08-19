import os
import sqlite3
import random
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
        # Insert default admin user if not exists
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM users WHERE username = 'admin'")
        if not cursor.fetchone():
            cursor.execute(
                "INSERT INTO users (name, username, client_id, email, password) VALUES (?, ?, ?, ?, ?)",
                ("Admin Manager", "admin", "client123", "admin@freshadmin.com", "admin")
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
            return jsonify({'success': True, 'message': f"Welcome, {user['name']}"})
        else:
            return jsonify({'success': False, 'message': "Invalid credentials (username, client ID, or password)."}), 401

@app.route('/api/register', methods=['POST'])
def api_register():
    data = request.get_json() or {}
    name = data.get('name', '').strip()
    username = data.get('username', '').strip()
    client_id = data.get('client_id', '').strip()
    email = data.get('email', '').strip()
    password = data.get('password', '')

    if not all([name, username, client_id, email, password]):
        return jsonify({'success': False, 'message': "All fields are required."}), 400

    try:
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "INSERT INTO users (name, username, client_id, email, password) VALUES (?, ?, ?, ?, ?)",
                (name, username, client_id, email, password)
            )
            conn.commit()
            return jsonify({'success': True, 'message': f"User {username} registered successfully."})
    except sqlite3.IntegrityError as e:
        error_msg = str(e)
        if "username" in error_msg or "UNIQUE constraint failed: users.username" in error_msg:
            return jsonify({'success': False, 'message': "Username is already registered."}), 400
        elif "email" in error_msg or "UNIQUE constraint failed: users.email" in error_msg:
            return jsonify({'success': False, 'message': "Email is already registered."}), 400
        return jsonify({'success': False, 'message': "Registration failed due to a database constraint."}), 400

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

if __name__ == '__main__':
    app.run(debug=True, port=8000)

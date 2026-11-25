from fastapi import FastAPI, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr, Field
import sqlite3
import hashlib
import secrets
import uuid
from datetime import datetime
from pathlib import Path

DB = Path(__file__).with_name("foodie.db")
app = FastAPI(title="Foodie API", description="Food Ordering & Delivery Management System")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def connect():
    con = sqlite3.connect(DB)
    con.row_factory = sqlite3.Row
    con.execute("PRAGMA foreign_keys = ON")
    return con


def now():
    return datetime.utcnow().isoformat(timespec="seconds")


def hash_password(password: str):
    salt = secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 100_000).hex()
    return f"{salt}${digest}"


def verify_password(password: str, stored: str):
    if "$" not in stored:
        return False
    salt, digest = stored.split("$", 1)
    candidate = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 100_000).hex()
    return secrets.compare_digest(candidate, digest)


def init_db():
    con = connect()
    con.executescript("""
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL, email TEXT UNIQUE NOT NULL, phone TEXT,
      password_hash TEXT NOT NULL, role TEXT NOT NULL,
      address TEXT, active INTEGER DEFAULT 1,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS restaurants (
      id INTEGER PRIMARY KEY AUTOINCREMENT, owner_id INTEGER,
      name TEXT NOT NULL, cuisine TEXT, description TEXT,
      image TEXT, rating REAL DEFAULT 4.5, delivery_time TEXT,
      address TEXT, active INTEGER DEFAULT 1,
      FOREIGN KEY(owner_id) REFERENCES users(id)
    );
    CREATE TABLE IF NOT EXISTS food_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT, restaurant_id INTEGER NOT NULL,
      name TEXT NOT NULL, description TEXT, category TEXT,
      price REAL NOT NULL, image TEXT, available INTEGER DEFAULT 1,
      preparation_status TEXT DEFAULT 'Ready',
      FOREIGN KEY(restaurant_id) REFERENCES restaurants(id)
    );
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT, order_id TEXT UNIQUE NOT NULL,
      customer_id INTEGER NOT NULL, restaurant_id INTEGER NOT NULL,
      delivery_address TEXT NOT NULL, subtotal REAL NOT NULL,
      delivery_charge REAL DEFAULT 40, total REAL NOT NULL,
      status TEXT DEFAULT 'Order Placed', payment_status TEXT DEFAULT 'Pending',
      created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
      FOREIGN KEY(customer_id) REFERENCES users(id),
      FOREIGN KEY(restaurant_id) REFERENCES restaurants(id)
    );
    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT, order_pk INTEGER NOT NULL,
      food_item_id INTEGER NOT NULL, name TEXT NOT NULL,
      quantity INTEGER NOT NULL, price REAL NOT NULL,
      FOREIGN KEY(order_pk) REFERENCES orders(id),
      FOREIGN KEY(food_item_id) REFERENCES food_items(id)
    );
    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT, order_pk INTEGER NOT NULL,
      method TEXT NOT NULL, amount REAL NOT NULL,
      status TEXT NOT NULL, transaction_id TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY(order_pk) REFERENCES orders(id)
    );
    CREATE TABLE IF NOT EXISTS delivery_assignments (
      id INTEGER PRIMARY KEY AUTOINCREMENT, order_pk INTEGER NOT NULL,
      partner_id INTEGER, status TEXT DEFAULT 'Waiting',
      pickup_time TEXT, delivered_time TEXT,
      FOREIGN KEY(order_pk) REFERENCES orders(id),
      FOREIGN KEY(partner_id) REFERENCES users(id)
    );
    """)

    count = con.execute("SELECT COUNT(*) FROM users").fetchone()[0]
    if count == 0:
        users = [
            ("Aarav Customer", "customer@foodie.com", "9876543210", "customer", "12 Lake Road"),
            ("Spice Hub Owner", "restaurant@foodie.com", "9876543211", "restaurant", "MG Road"),
            ("Rahul Delivery", "delivery@foodie.com", "9876543212", "delivery", "Central Delivery Hub"),
            ("Admin User", "admin@foodie.com", "9876543213", "admin", "Foodie HQ"),
        ]
        for name, email, phone, role, address in users:
            con.execute("INSERT INTO users(name,email,phone,password_hash,role,address,created_at) VALUES(?,?,?,?,?,?,?)",
                        (name, email, phone, hash_password("password123"), role, address, now()))

    if con.execute("SELECT COUNT(*) FROM restaurants").fetchone()[0] == 0:
        owner = con.execute("SELECT id FROM users WHERE role='restaurant'").fetchone()[0]
        restaurants = [
            (owner, "Spice Hub", "Indian", "Bold flavors and timeless favorites.",
             "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4", 4.8, "25-35 min", "MG Road"),
            (owner, "Urban Pizza", "Italian", "Wood-fired pizzas made fresh.",
             "https://images.unsplash.com/photo-1579751626657-72bc17010498", 4.7, "20-30 min", "Park Street"),
            (owner, "Green Bowl", "Healthy", "Fresh bowls, salads and wholesome meals.",
             "https://images.unsplash.com/photo-1547592180-85f173990554", 4.6, "15-25 min", "College Avenue"),
        ]
        con.executemany("INSERT INTO restaurants(owner_id,name,cuisine,description,image,rating,delivery_time,address) VALUES(?,?,?,?,?,?,?,?)", restaurants)

    if con.execute("SELECT COUNT(*) FROM food_items").fetchone()[0] == 0:
        rows = [
            (1, "Butter Chicken", "Creamy tomato curry with tender chicken", "Mains", 320, "https://images.unsplash.com/photo-1603894584373-5ac82b2ae398", 1),
            (1, "Paneer Tikka", "Chargrilled cottage cheese with peppers", "Starters", 260, "https://images.unsplash.com/photo-1567188049-b4a07e7dc9ee", 1),
            (1, "Hyderabadi Biryani", "Fragrant rice, spices and slow-cooked chicken", "Rice", 290, "https://images.unsplash.com/photo-1563379926898-05f4575a45d8", 1),
            (2, "Margherita Pizza", "Tomato, mozzarella and fresh basil", "Pizza", 399, "https://images.unsplash.com/photo-1574071318508-1cdbab80d002", 1),
            (2, "Pesto Pasta", "Creamy pesto with parmesan and herbs", "Pasta", 349, "https://images.unsplash.com/photo-1473093295043-cdd812d0e601", 1),
            (3, "Rainbow Buddha Bowl", "Grains, vegetables, avocado and tahini", "Healthy", 280, "https://images.unsplash://images.unsplash.com/photo-1543362906-acfc16c67564", 1),
            (3, "Berry Smoothie", "Mixed berries, yogurt and honey", "Drinks", 180, "https://images.unsplash.com/photo-1505252585461-04db1eb84625", 1),
        ]
        con.executemany("INSERT INTO food_items(restaurant_id,name,description,category,price,image,available) VALUES(?,?,?,?,?,?,?)", rows)
    con.commit()
    con.close()


init_db()


class RegisterRequest(BaseModel):
    name: str = Field(min_length=2)
    email: str
    password: str = Field(min_length=6)
    phone: str = ""
    role: str = "customer"
    address: str = ""


class LoginRequest(BaseModel):
    email: str
    password: str


class ProfileRequest(BaseModel):
    name: str
    phone: str = ""
    address: str = ""


class OrderRequest(BaseModel):
    restaurant_id: int
    delivery_address: str = Field(min_length=5)
    payment_method: str
    items: list[dict]


class StatusRequest(BaseModel):
    status: str


class FoodRequest(BaseModel):
    name: str
    description: str = ""
    category: str = "Mains"
    price: float = Field(gt=0)
    image: str = ""
    available: bool = True


def public_user(row):
    return {"id": row["id"], "name": row["name"], "email": row["email"], "phone": row["phone"],
            "role": row["role"], "address": row["address"]}


def current_user(x_user_id: str | None = Header(default=None)):
    if not x_user_id:
        raise HTTPException(401, "Login required")
    con = connect()
    row = con.execute("SELECT * FROM users WHERE id=?", (int(x_user_id),)).fetchone()
    con.close()
    if not row or not row["active"]:
        raise HTTPException(401, "Invalid session")
    return row


@app.post("/api/auth/register")
def register(data: RegisterRequest):
    if data.role not in {"customer", "restaurant", "delivery", "admin"}:
        raise HTTPException(400, "Invalid role")
    con = connect()
    if con.execute("SELECT id FROM users WHERE email=?", (str(data.email),)).fetchone():
        con.close()
        raise HTTPException(409, "Email already registered")
    cur = con.execute(
        "INSERT INTO users(name,email,phone,password_hash,role,address,created_at) VALUES(?,?,?,?,?,?,?)",
        (data.name, str(data.email), data.phone, hash_password(data.password), data.role, data.address, now()))
    con.commit()
    user_id = cur.lastrowid
    row = con.execute("SELECT * FROM users WHERE id=?", (user_id,)).fetchone()
    con.close()
    return {"token": str(user_id), "user": public_user(row)}


@app.post("/api/auth/login")
def login(data: LoginRequest):
    con = connect()
    row = con.execute("SELECT * FROM users WHERE email=?", (str(data.email),)).fetchone()
    con.close()
    if not row or not verify_password(data.password, row["password_hash"]):
        raise HTTPException(401, "Invalid email or password")
    return {"token": str(row["id"]), "user": public_user(row)}


@app.get("/api/users/profile")
def profile(x_user_id: str | None = Header(default=None)):
    return public_user(current_user(x_user_id))


@app.put("/api/users/profile")
def update_profile(data: ProfileRequest, x_user_id: str | None = Header(default=None)):
    user = current_user(x_user_id)
    con = connect()
    con.execute("UPDATE users SET name=?,phone=?,address=? WHERE id=?", (data.name, data.phone, data.address, user["id"]))
    con.commit()
    row = con.execute("SELECT * FROM users WHERE id=?", (user["id"],)).fetchone()
    con.close()
    return public_user(row)


@app.get("/api/restaurants")
def restaurants(search: str = ""):
    con = connect()
    if search:
        rows = con.execute("SELECT * FROM restaurants WHERE active=1 AND (name LIKE ? OR cuisine LIKE ?)",
                           (f"%{search}%", f"%{search}%")).fetchall()
    else:
        rows = con.execute("SELECT * FROM restaurants WHERE active=1").fetchall()
    con.close()
    return [dict(r) for r in rows]


@app.get("/api/restaurants/{restaurant_id}/menu")
def menu(restaurant_id: int, search: str = "", category: str = ""):
    con = connect()
    sql = "SELECT * FROM food_items WHERE restaurant_id=?"
    params = [restaurant_id]
    if search:
        sql += " AND (name LIKE ? OR description LIKE ?)"
        params += [f"%{search}%", f"%{search}%"]
    if category:
        sql += " AND category=?"
        params.append(category)
    rows = con.execute(sql, params).fetchall()
    con.close()
    return [dict(r) for r in rows]


@app.get("/api/orders")
def orders(x_user_id: str | None = Header(default=None)):
    user = current_user(x_user_id)
    con = connect()
    if user["role"] == "customer":
        rows = con.execute("SELECT o.*, r.name restaurant_name FROM orders o JOIN restaurants r ON r.id=o.restaurant_id WHERE o.customer_id=? ORDER BY o.id DESC", (user["id"],)).fetchall()
    elif user["role"] == "restaurant":
        restaurant = con.execute("SELECT id FROM restaurants WHERE owner_id=?", (user["id"],)).fetchone()
        restaurant_id = restaurant["id"] if restaurant else -1
        rows = con.execute("SELECT o.*, r.name restaurant_name, u.name customer_name, u.phone customer_phone FROM orders o JOIN restaurants r ON r.id=o.restaurant_id JOIN users u ON u.id=o.customer_id WHERE o.restaurant_id=? ORDER BY o.id DESC", (restaurant_id,)).fetchall()
    elif user["role"] == "delivery":
        rows = con.execute("""SELECT o.*, r.name restaurant_name, r.address restaurant_address,
          u.name customer_name, u.phone customer_phone, d.status delivery_status, d.partner_id
          FROM orders o JOIN restaurants r ON r.id=o.restaurant_id JOIN users u ON u.id=o.customer_id
          LEFT JOIN delivery_assignments d ON d.order_pk=o.id
          WHERE d.partner_id=? OR d.partner_id IS NULL
          ORDER BY o.id DESC""", (user["id"],)).fetchall()
    else:
        rows = con.execute("SELECT o.*, r.name restaurant_name, u.name customer_name FROM orders o JOIN restaurants r ON r.id=o.restaurant_id JOIN users u ON u.id=o.customer_id ORDER BY o.id DESC").fetchall()

    result = []
    for row in rows:
        item_rows = con.execute("SELECT * FROM order_items WHERE order_pk=?", (row["id"],)).fetchall()
        result.append({**dict(row), "items": [dict(i) for i in item_rows]})
    con.close()
    return result


@app.post("/api/orders")
def place_order(data: OrderRequest, x_user_id: str | None = Header(default=None)):
    user = current_user(x_user_id)
    if not data.items:
        raise HTTPException(400, "Cart is empty")
    con = connect()
    subtotal = 0
    for item in data.items:
        food = con.execute("SELECT * FROM food_items WHERE id=? AND restaurant_id=? AND available=1",
                           (item["food_item_id"], data.restaurant_id)).fetchone()
        if not food:
            con.close()
            raise HTTPException(404, "Unavailable food item")
        subtotal += food["price"] * int(item["quantity"])
    delivery = 40
    total = subtotal + delivery
    order_id = "FD-" + uuid.uuid4().hex[:8].upper()
    timestamp = now()
    cur = con.execute("""INSERT INTO orders(order_id,customer_id,restaurant_id,delivery_address,subtotal,delivery_charge,total,status,payment_status,created_at,updated_at)
                         VALUES(?,?,?,?,?,?,?,?,'Pending',?,?)""",
                      (order_id, user["id"], data.restaurant_id, data.delivery_address, subtotal, delivery, total,
                       "Order Placed", timestamp, timestamp))
    order_pk = cur.lastrowid
    for item in data.items:
        food = con.execute("SELECT * FROM food_items WHERE id=?", (item["food_item_id"],)).fetchone()
        con.execute("INSERT INTO order_items(order_pk,food_item_id,name,quantity,price) VALUES(?,?,?,?,?)",
                    (order_pk, food["id"], food["name"], int(item["quantity"]), food["price"]))
    payment_status = "Success" if data.payment_method == "online" else "Pending"
    con.execute("INSERT INTO payments(order_pk,method,amount,status,transaction_id,created_at) VALUES(?,?,?,?,?,?)",
                (order_pk, "Online" if data.payment_method == "online" else "Cash on Delivery", total,
                 payment_status, "SIM-" + uuid.uuid4().hex[:10].upper(), timestamp))
    if payment_status == "Success":
        con.execute("UPDATE orders SET payment_status='Paid' WHERE id=?", (order_pk,))
    con.execute("INSERT INTO delivery_assignments(order_pk,status) VALUES(?,?)", (order_pk, "Waiting"))
    con.commit()
    con.close()
    return {"order_id": order_id, "total": total, "status": "Order Placed", "payment_status": "Paid" if payment_status == "Success" else "Pending"}


@app.get("/api/orders/{order_id}")
def order_detail(order_id: str):
    con = connect()
    row = con.execute("""SELECT o.*, r.name restaurant_name, u.name customer_name, u.phone customer_phone
                         FROM orders o JOIN restaurants r ON r.id=o.restaurant_id JOIN users u ON u.id=o.customer_id
                         WHERE o.order_id=?""", (order_id,)).fetchone()
    if not row:
        con.close()
        raise HTTPException(404, "Order not found")
    items = con.execute("SELECT * FROM order_items WHERE order_pk=?", (row["id"],)).fetchall()
    payment = con.execute("SELECT * FROM payments WHERE order_pk=?", (row["id"],)).fetchone()
    delivery = con.execute("SELECT * FROM delivery_assignments WHERE order_pk=?", (row["id"],)).fetchone()
    con.close()
    return {**dict(row), "items": [dict(i) for i in items],
            "payment": dict(payment) if payment else None,
            "delivery": dict(delivery) if delivery else None}


@app.patch("/api/orders/{order_id}/status")
def update_status(order_id: str, data: StatusRequest, x_user_id: str | None = Header(default=None)):
    current_user(x_user_id)
    con = connect()
    row = con.execute("SELECT id FROM orders WHERE order_id=?", (order_id,)).fetchone()
    if not row:
        con.close()
        raise HTTPException(404, "Order not found")
    con.execute("UPDATE orders SET status=?,updated_at=? WHERE id=?", (data.status, now(), row["id"]))
    con.commit()
    con.close()
    return {"order_id": order_id, "status": data.status}


@app.patch("/api/orders/{order_id}/cancel")
def cancel_order(order_id: str, x_user_id: str | None = Header(default=None)):
    current_user(x_user_id)
    con = connect()
    row = con.execute("SELECT id,status FROM orders WHERE order_id=?", (order_id,)).fetchone()
    if not row:
        con.close()
        raise HTTPException(404, "Order not found")
    if row["status"] not in ("Order Placed", "Order Accepted"):
        con.close()
        raise HTTPException(400, "Order cannot be cancelled")
    con.execute("UPDATE orders SET status='Cancelled',payment_status='Refunded',updated_at=? WHERE id=?", (now(), row["id"]))
    con.commit()
    con.close()
    return {"order_id": order_id, "status": "Cancelled"}


@app.post("/api/delivery/{order_id}/accept")
def accept_delivery(order_id: str, x_user_id: str | None = Header(default=None)):
    user = current_user(x_user_id)
    con = connect()
    row = con.execute("SELECT id FROM orders WHERE order_id=?", (order_id,)).fetchone()
    if not row:
        con.close()
        raise HTTPException(404, "Order not found")
    con.execute("UPDATE delivery_assignments SET partner_id=?,status='Accepted' WHERE order_pk=?", (user["id"], row["id"]))
    con.commit()
    con.close()
    return {"status": "Accepted"}


@app.get("/api/admin/stats")
def admin_stats(x_user_id: str | None = Header(default=None)):
    user = current_user(x_user_id)
    if user["role"] != "admin":
        raise HTTPException(403, "Admin access required")
    con = connect()
    stats = {
        "customers": con.execute("SELECT COUNT(*) FROM users WHERE role='customer'").fetchone()[0],
        "restaurants": con.execute("SELECT COUNT(*) FROM restaurants").fetchone()[0],
        "orders": con.execute("SELECT COUNT(*) FROM orders").fetchone()[0],
        "delivery_partners": con.execute("SELECT COUNT(*) FROM users WHERE role='delivery'").fetchone()[0],
    }
    con.close()
    return stats


@app.get("/api/admin/users")
def admin_users(x_user_id: str | None = Header(default=None)):
    user = current_user(x_user_id)
    if user["role"] != "admin":
        raise HTTPException(403, "Admin access required")
    con = connect()
    rows = con.execute("SELECT id,name,email,phone,role,address,active,created_at FROM users").fetchall()
    con.close()
    return [dict(r) for r in rows]


@app.get("/api/admin/payments")
def payments(x_user_id: str | None = Header(default=None)):
    user = current_user(x_user_id)
    if user["role"] != "admin":
        raise HTTPException(403, "Admin access required")
    con = connect()
    rows = con.execute("""SELECT p.*, o.order_id FROM payments p JOIN orders o ON o.id=p.order_pk ORDER BY p.id DESC""").fetchall()
    con.close()
    return [dict(r) for r in rows]


@app.post("/api/food-items")
def add_food(data: FoodRequest, x_user_id: str | None = Header(default=None)):
    user = current_user(x_user_id)
    if user["role"] != "restaurant":
        raise HTTPException(403, "Restaurant access required")
    con = connect()
    restaurant = con.execute("SELECT id FROM restaurants WHERE owner_id=?", (user["id"],)).fetchone()
    if not restaurant:
        con.close()
        raise HTTPException(404, "Restaurant not found")
    cur = con.execute("""INSERT INTO food_items(restaurant_id,name,description,category,price,image,available)
                         VALUES(?,?,?,?,?,?,?)""",
                      (restaurant["id"], data.name, data.description, data.category, data.price, data.image, int(data.available)))
    con.commit()
    row = con.execute("SELECT * FROM food_items WHERE id=?", (cur.lastrowid,)).fetchone()
    con.close()
    return dict(row)


@app.put("/api/food-items/{item_id}")
def edit_food(item_id: int, data: FoodRequest, x_user_id: str | None = Header(default=None)):
    current_user(x_user_id)
    con = connect()
    con.execute("""UPDATE food_items SET name=?,description=?,category=?,price=?,image=?,available=? WHERE id=?""",
                (data.name, data.description, data.category, data.price, data.image, int(data.available), item_id))
    con.commit()
    row = con.execute("SELECT * FROM food_items WHERE id=?", (item_id,)).fetchone()
    con.close()
    if not row:
        raise HTTPException(404, "Food item not found")
    return dict(row)


@app.delete("/api/food-items/{item_id}")
def delete_food(item_id: int, x_user_id: str | None = Header(default=None)):
    current_user(x_user_id)
    con = connect()
    con.execute("DELETE FROM food_items WHERE id=?", (item_id,))
    con.commit()
    con.close()
    return {"deleted": item_id}

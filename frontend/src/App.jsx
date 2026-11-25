import { useEffect, useState } from 'react';
import { BrowserRouter, Link, Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Check, ChevronRight, Clock3, LogOut, Minus, Plus, Search, ShoppingBag, Trash2, UserRound } from 'lucide-react';
import { useAuth } from './context/AuthContext.jsx';
import { useCart } from './context/CartContext.jsx';
import { api } from './services/api.js';

function Navbar() {
  const { user, logout } = useAuth();
  const { count } = useCart();
  const navigate = useNavigate();
  const dashboard = user?.role ? `/${user.role}` : '/';
  return <nav className="navbar">
    <Link className="brand" to={dashboard}><span>F</span>Foodie</Link>
    {user ? <div className="nav-actions">
      {user.role === 'customer' && <><Link to="/">Home</Link><Link className="cart-link" to="/cart"><ShoppingBag size={20}/><b>{count}</b></Link></>}
      <Link to="/profile"><UserRound size={18}/> {user.name?.split(' ')[0]}</Link>
      <button className="icon-button" title="Logout" onClick={() => { logout(); navigate('/login'); }}><LogOut size={19}/></button>
    </div> : <div className="nav-actions"><Link to="/login" className="btn btn-outline">Login</Link><Link to="/register" className="btn">Sign up</Link></div>}
  </nav>;
}

function Protected({ children, roles }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to={`/${user.role}`} replace />;
  return children;
}

function AuthPage({ register = false }) {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '', role: 'customer', address: '' });
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const submit = async (event) => {
    event.preventDefault();
    setError('');
    if (!form.email.includes('@') || form.password.length < 6) return setError('Enter a valid email and a password of at least 6 characters.');
    try {
      const result = register ? await api.register(form) : await api.login(form);
      login(result);
      navigate(result.user.role === 'customer' ? '/' : `/${result.user.role}`);
    } catch (err) { setError(err.message); }
  };
  const set = (key, value) => setForm(v => ({ ...v, [key]: value }));
  return <main className="auth-layout">
    <section className="auth-art"><div className="auth-copy"><span className="eyebrow">Good food, delivered</span><h1>Your favorite meals,<br/>right at your door.</h1><p>Discover local restaurants and track every order from kitchen to doorstep.</p></div></section>
    <section className="auth-card">
      <div className="mobile-brand"><b>F</b> Foodie</div>
      <h2>{register ? 'Create your account' : 'Welcome back'}</h2>
      <p className="muted">{register ? 'Join Foodie and start ordering' : 'Sign in to continue'}</p>
      <form onSubmit={submit}>
        {register && <label>Name<input value={form.name} onChange={e => set('name', e.target.value)} required placeholder="Your full name"/></label>}
        <label>Email address<input type="email" value={form.email} onChange={e => set('email', e.target.value)} required placeholder="you@example.com"/></label>
        {register && <label>Phone<input value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+91 98765 43210"/></label>}
        <label>Password<div className="password-wrap"><input type={show ? 'text' : 'password'} value={form.password} onChange={e => set('password', e.target.value)} required placeholder="At least 6 characters"/><button type="button" onClick={() => setShow(s => !s)}>{show ? 'Hide' : 'Show'}</button></div></label>
        {register && <><label>Account type<select value={form.role} onChange={e => set('role', e.target.value)}><option value="customer">Customer</option><option value="restaurant">Restaurant</option><option value="delivery">Delivery partner</option></select></label><label>Address<input value={form.address} onChange={e => set('address', e.target.value)} placeholder="Delivery address"/></label></>}
        {error && <div className="error">{error}</div>}
        <button className="btn btn-full" type="submit">{register ? 'Create account' : 'Sign in'} <ChevronRight size={18}/></button>
      </form>
      <p className="auth-switch">{register ? 'Already have an account?' : 'New to Foodie?'} <Link to={register ? '/login' : '/register'}>{register ? 'Sign in' : 'Create account'}</Link></p>
    </section>
  </main>;
}

function Home() {
  const [restaurants, setRestaurants] = useState([]);
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const { add } = useCart();
  useEffect(() => { api.restaurants().then(setRestaurants).catch(() => setRestaurants([])); }, []);
  const openRestaurant = async (restaurant) => {
    setSelected(restaurant);
    setItems(await api.menu(restaurant.id));
  };
  useEffect(() => {
    if (selected) api.menu(selected.id, search, category).then(setItems).catch(() => setItems([]));
  }, [search, category, selected]);
  const categories = ['Pizza','Indian','Healthy','Desserts'];
  return <main className="page">
    <section className="hero">
      <div><span className="eyebrow">Fast delivery · Great taste</span><h1>What are you craving today?</h1><p>Discover the best food around you</p>
        <div className="search-box"><Search size={20}/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search restaurants or food"/><button onClick={() => api.restaurants(search).then(setRestaurants)}>Search</button></div>
      </div><img src="https://images.unsplash.com/photo-1504674900247-0877df9cc836" alt="Food platter"/>
    </section>
    <section><div className="section-heading"><h2>Categories</h2></div><div className="category-row">{categories.map((c,i)=><button key={c} className={category===c?'category active':'category'} onClick={()=>setCategory(category===c?'':c)}><span>{['🍕','🍛','🥗','🍰'][i]}</span>{c}</button>)}</div></section>
    <section><div className="section-heading"><h2>Featured restaurants</h2><span>{restaurants.length} restaurants nearby</span></div>
      <div className="restaurant-grid">{restaurants.map(r => <article key={r.id} className="restaurant-card" onClick={() => openRestaurant(r)}>
        <img src={r.image} alt={r.name}/><div className="card-body"><div className="card-title"><h3>{r.name}</h3><span>★ {r.rating}</span></div><p>{r.cuisine} · {r.delivery_time}</p></div>
      </article>)}</div>
    </section>
    {selected && <section><div className="section-heading"><h2>{selected.name} menu</h2><button className="text-button" onClick={() => setSelected(null)}>Close</button></div>
      <div className="food-grid">{items.map(food => <article className="food-card" key={food.id}>
        <img src={food.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c'} alt={food.name}/><div className="card-body"><div className="card-title"><h3>{food.name}</h3><b>₹{food.price}</b></div><p>{food.description}</p><button className="btn" disabled={!food.available} onClick={() => add({ ...food, restaurant_id: selected.id, restaurant_name: selected.name })}><Plus size={17}/> {food.available ? 'Add to cart' : 'Unavailable'}</button></div>
      </article>)}</div>
    </section>}
  </main>;
}

function Cart() {
  const cart = useCart();
  return <main className="page narrow">
    <div className="page-title"><div><span className="eyebrow">Your order</span><h1>Shopping cart</h1></div></div>
    {cart.items.length ? <div className="cart-layout"><section className="cart-items">{cart.items.map(i =>
      <article className="cart-item" key={i.id}><img src={i.image} alt={i.name}/><div className="cart-info"><h3>{i.name}</h3><p>{i.restaurant_name}</p><b>₹{i.price}</b></div><div className="quantity"><button onClick={() => cart.update(i.id, i.quantity-1)}><Minus size={16}/></button><span>{i.quantity}</span><button onClick={() => cart.update(i.id, i.quantity+1)}><Plus size={16}/></button></div><button className="remove" onClick={() => cart.remove(i.id)}><Trash2 size={18}/></button></article>)}</section>
      <aside className="summary"><h3>Order summary</h3><div><span>Subtotal</span><b>₹{cart.subtotal}</b></div><div><span>Delivery fee</span><b>₹{cart.delivery}</b></div><hr/><div className="total"><span>Total</span><b>₹{cart.subtotal + cart.delivery}</b></div><Link className="btn btn-full" to="/checkout">Proceed to checkout</Link></aside></div> :
      <div className="empty-state"><ShoppingBag size={48}/><h2>Your cart is empty</h2><p>Add something delicious to get started.</p><Link className="btn" to="/">Browse restaurants</Link></div>}
  </main>;
}

function Checkout() {
  const { items, subtotal, delivery, clear } = useCart();
  const { user } = useAuth();
  const [address, setAddress] = useState(user?.address || '');
  const [method, setMethod] = useState('online');
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState(null);
  const navigate = useNavigate();
  const place = async () => {
    if (!address.trim()) return alert('Please enter a delivery address.');
    setProcessing(true);
    try {
      await new Promise(r => setTimeout(r, 900));
      const restaurantId = items[0]?.restaurant_id;
      const order = await api.placeOrder({ restaurant_id: restaurantId, delivery_address: address, payment_method: method, items: items.map(i => ({ food_item_id: i.id, quantity: i.quantity })) });
      clear();
      setResult(order);
    } catch (err) { alert(err.message); setProcessing(false); }
  };
  if (!items.length && !result) return <Navigate to="/cart" replace />;
  if (processing) return <main className="page narrow"><div className="payment-state"><div className="spinner"></div><h2>Processing payment...</h2><p>Please wait while we confirm your payment.</p></div></main>;
  if (result) return <main className="page narrow"><div className="payment-state success"><div className="success-icon"><Check/></div><h1>Order confirmed!</h1><p>Your order <b>{result.order_id}</b> has been placed successfully.</p><div className="confirmed-actions"><button className="btn" onClick={() => navigate(`/track/${result.order_id}`)}>Track order</button><Link className="btn btn-outline" to="/">Back to home</Link></div></div></main>;
  return <main className="page narrow"><div className="page-title"><Link to="/cart" className="back-link"><ArrowLeft size={18}/> Cart</Link><h1>Checkout</h1></div><div className="cart-layout">
    <div><section className="checkout-card"><h3>Delivery address</h3><label>Complete address<textarea value={address} onChange={e => setAddress(e.target.value)} placeholder="Flat, street, landmark, city"/></label></section>
    <section className="checkout-card"><h3>Payment method</h3><button className={method==='online'?'payment-option selected':'payment-option'} onClick={()=>setMethod('online')}><div><b>Online payment</b><span>Simulated card / UPI</span></div><span className="radio">{method==='online'&&<Check size={14}/>}</span></button><button className={method==='cod'?'payment-option selected':'payment-option'} onClick={()=>setMethod('cod')}><div><b>Cash on delivery</b><span>Pay when your food arrives</span></div><span className="radio">{method==='cod'&&<Check size={14}/>}</span></button></section></div>
    <aside className="summary"><h3>Payment summary</h3>{items.map(i=><div key={i.id}><span>{i.name} × {i.quantity}</span><b>₹{i.price*i.quantity}</b></div>)}<hr/><div><span>Delivery</span><b>₹{delivery}</b></div><div className="total"><span>Total</span><b>₹{subtotal+delivery}</b></div><button className="btn btn-full" onClick={place}>Place order</button></aside>
  </div></main>;
}

function OrderTracking() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');
  const load = () => api.order(id).then(setOrder).catch(e => setError(e.message));
  useEffect(load, [id]);
  useEffect(() => { const timer = setInterval(load, 8000); return () => clearInterval(timer); }, [id]);
  if (error) return <main className="page narrow"><div className="empty-state"><h2>Order not found</h2><p>{error}</p></div></main>;
  if (!order) return <main className="page narrow"><p>Loading order...</p></main>;
  const statuses = ['Order Placed','Order Accepted','Preparing Food','Ready for Pickup','Picked Up','Out for Delivery','Delivered'];
  const current = statuses.indexOf(order.status);
  return <main className="page narrow"><div className="page-title"><div><span className="eyebrow">Live tracking</span><h1>Order {order.order_id}</h1></div><button className="btn btn-outline" onClick={load}>Refresh</button></div>
    <section className="track-card"><div className="track-head"><div><span>Restaurant</span><h3>{order.restaurant_name}</h3></div><div><span>Payment</span><b className={order.payment_status==='Paid'?'paid':'pending'}>{order.payment_status}</b></div><div><span>Status</span><b>{order.status}</b></div></div>
    {order.status !== 'Cancelled' && <div className="timeline">{statuses.map((s,i)=><div className={i<=current?'step complete':i===current+1?'step next':'step'} key={s}><div className="step-dot">{i<=current?<Check size={15}/>:i+1}</div><span>{s}</span></div>)}</div>}
    <div className="order-details"><div><h3>Ordered items</h3>{order.items.map(i=><div className="order-line" key={i.id}><span>{i.name} × {i.quantity}</span><b>₹{i.price*i.quantity}</b></div>)}</div><div><h3>Delivery address</h3><p>{order.delivery_address}</p><div className="order-total"><span>Total</span><b>₹{order.total}</b></div></div></div></section>
  </main>;
}

function Profile() {
  const { user, login, session } = useAuth();
  const [form, setForm] = useState({ name: user?.name || '', phone: user?.phone || '', address: user?.address || '' });
  const [saved, setSaved] = useState(false);
  const save = async (e) => { e.preventDefault(); const updated = await api.updateProfile(form); login({ ...session, user: updated }); setSaved(true); setTimeout(()=>setSaved(false),2000); };
  return <main className="page narrow"><div className="page-title"><h1>My profile</h1></div><form className="profile-card" onSubmit={save}><label>Name<input value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></label><label>Phone<input value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})}/></label><label>Address<textarea value={form.address} onChange={e=>setForm({...form,address:e.target.value})}/></label><button className="btn">{saved?'Saved!':'Save changes'}</button></form></main>;
}

function RestaurantDashboard() {
  const { user } = useAuth();
  const [orders,setOrders]=useState([]); const [menu,setMenu]=useState([]); const [tab,setTab]=useState('orders');
  const [food,setFood]=useState({name:'',description:'',category:'Mains',price:'',image:'',available:true});
  const load=async()=>{const all=await api.orders();setOrders(all); const restaurants=await api.restaurants(); if(restaurants[0])setMenu(await api.menu(restaurants[0].id));};
  useEffect(()=>{load();const t=setInterval(load,8000);return()=>clearInterval(t)},[]);
  const changeStatus=async(o,status)=>{await api.updateOrderStatus(o.order_id,status);load()};
  const submitFood=async(e)=>{e.preventDefault();await api.addFood({...food,price:Number(food.price)});setFood({name:'',description:'',category:'Mains',price:'',image:'',available:true});load()};
  const remove=async(id)=>{await api.deleteFood(id);load()};
  return <DashboardShell title="Restaurant dashboard" subtitle={`Welcome back, ${user.name}`}>
    <div className="stats"><Stat label="Total orders" value={orders.length}/><Stat label="New orders" value={orders.filter(o=>o.status==='Order Placed').length}/><Stat label="Preparing" value={orders.filter(o=>o.status==='Preparing Food').length}/><Stat label="Completed" value={orders.filter(o=>o.status==='Delivered').length}/></div>
    <div className="tabs"><button className={tab==='orders'?'active':''} onClick={()=>setTab('orders')}>Incoming orders</button><button className={tab==='menu'?'active':''} onClick={()=>setTab('menu')}>Food menu</button></div>
    {tab==='orders'?<div className="table-card">{orders.map(o=><article className="order-admin-row" key={o.id}><div><b>{o.order_id}</b><span>{o.customer_name} · {o.customer_phone}</span><small>{o.items.map(i=>`${i.name} × ${i.quantity}`).join(', ')}</small></div><div><b>₹{o.total}</b><span className="status-pill">{o.status}</span></div><div className="row-actions">{o.status==='Order Placed'&&<><button className="btn" onClick={()=>changeStatus(o,'Order Accepted')}>Accept</button><button className="btn btn-danger" onClick={()=>changeStatus(o,'Cancelled')}>Reject</button></>}{o.status==='Order Accepted'&&<button className="btn" onClick={()=>changeStatus(o,'Preparing Food')}>Start preparing</button>}{o.status==='Preparing Food'&&<button className="btn" onClick={()=>changeStatus(o,'Ready for Pickup')}>Ready for pickup</button>}</div></article>)}</div>:
    <div className="management-grid"><form className="checkout-card" onSubmit={submitFood}><h3>Add food item</h3><input required placeholder="Name" value={food.name} onChange={e=>setFood({...food,name:e.target.value})}/><textarea placeholder="Description" value={food.description} onChange={e=>setFood({...food,description:e.target.value})}/><input placeholder="Category" value={food.category} onChange={e=>setFood({...food,category:e.target.value})}/><input required type="number" placeholder="Price" value={food.price} onChange={e=>setFood({...food,price:e.target.value})}/><input placeholder="Image URL" value={food.image} onChange={e=>setFood({...food,image:e.target.value})}/><button className="btn">Add item</button></form><div className="table-card">{menu.map(f=><article className="order-admin-row" key={f.id}><div><b>{f.name}</b><span>{f.category} · ₹{f.price}</span></div><div><span className="status-pill">{f.available?'Available':'Unavailable'}</span></div><button className="remove" onClick={()=>remove(f.id)}><Trash2 size={18}/></button></article>)}</div></div>}
  </DashboardShell>;
}

function DeliveryDashboard() {
  const [orders,setOrders]=useState([]);
  const load=()=>api.orders().then(setOrders);
  useEffect(()=>{load();const t=setInterval(load,8000);return()=>clearInterval(t)},[]);
  const action=async(o,type)=>{if(type==='accept') await api.acceptDelivery(o.order_id); else {const status={pickup:'Picked Up',out:'Out for Delivery',delivered:'Delivered'}[type];await api.updateOrderStatus(o.order_id,status);}load()};
  return <DashboardShell title="Delivery dashboard" subtitle="Manage your assigned deliveries"><div className="stats"><Stat label="Assigned" value={orders.length}/><Stat label="In progress" value={orders.filter(o=>['Picked Up','Out for Delivery'].includes(o.status)).length}/><Stat label="Delivered" value={orders.filter(o=>o.status==='Delivered').length}/></div><div className="delivery-grid">{orders.map(o=><article className="delivery-card" key={o.id}><div className="delivery-head"><b>{o.order_id}</b><span className="status-pill">{o.status}</span></div><h3>{o.restaurant_name}</h3><p>{o.restaurant_address || 'Restaurant location'}</p><hr/><h4>{o.customer_name}</h4><p>{o.customer_phone}</p><p className="address">{o.delivery_address}</p><div className="row-actions">{o.status==='Ready for Pickup'&&<button className="btn" onClick={()=>action(o,'accept')}>Accept delivery</button>}{o.status==='Picked Up'&&<button className="btn" onClick={()=>action(o,'out')}>Out for delivery</button>}{o.status==='Out for Delivery'&&<button className="btn" onClick={()=>action(o,'delivered')}>Mark delivered</button>}{o.delivery_status==='Accepted'&&o.status==='Ready for Pickup'&&<button className="btn" onClick={()=>action(o,'pickup')}>Confirm pickup</button>}</div></article>)}</div></DashboardShell>;
}

function AdminDashboard() {
  const [stats,setStats]=useState({});const [users,setUsers]=useState([]);const [payments,setPayments]=useState([]);const [orders,setOrders]=useState([]);const [tab,setTab]=useState('overview');
  useEffect(()=>{api.adminStats().then(setStats);api.adminUsers().then(setUsers);api.adminPayments().then(setPayments);api.orders().then(setOrders)},[]);
  return <DashboardShell title="Admin dashboard" subtitle="Monitor and manage the Foodie platform"><div className="stats"><Stat label="Customers" value={stats.customers||0}/><Stat label="Restaurants" value={stats.restaurants||0}/><Stat label="Orders" value={stats.orders||0}/><Stat label="Delivery partners" value={stats.delivery_partners||0}/></div><div className="tabs"><button className={tab==='overview'?'active':''} onClick={()=>setTab('overview')}>Orders</button><button className={tab==='users'?'active':''} onClick={()=>setTab('users')}>Users</button><button className={tab==='payments'?'active':''} onClick={()=>setTab('payments')}>Payments</button></div>{tab==='overview'&&<div className="table-card">{orders.map(o=><article className="order-admin-row" key={o.id}><div><b>{o.order_id}</b><span>{o.customer_name} · {o.restaurant_name}</span></div><div><b>₹{o.total}</b><span className="status-pill">{o.status}</span></div></article>)}</div>}{tab==='users'&&<div className="table-card">{users.map(u=><article className="order-admin-row" key={u.id}><div><b>{u.name}</b><span>{u.email}</span></div><span className="status-pill">{u.role}</span></article>)}</div>}{tab==='payments'&&<div className="table-card">{payments.map(p=><article className="order-admin-row" key={p.id}><div><b>{p.order_id}</b><span>{p.method} · {p.transaction_id}</span></div><div><b>₹{p.amount}</b><span className="status-pill">{p.status}</span></div></article>)}</div>}</DashboardShell>;
}

function Stat({label,value}) {return <article className="stat"><span>{label}</span><b>{value}</b></article>}
function DashboardShell({title,subtitle,children}) {return <main className="page dashboard"><div className="dashboard-heading"><div><span className="eyebrow">Foodie management</span><h1>{title}</h1><p>{subtitle}</p></div></div>{children}</main>}

export default function App() {
  return <BrowserRouter><Navbar/><Routes>
    <Route path="/login" element={<AuthPage/>}/><Route path="/register" element={<AuthPage register/>}/>
    <Route path="/" element={<Protected roles={['customer']}><Home/></Protected>}/>
    <Route path="/cart" element={<Protected roles={['customer']}><Cart/></Protected>}/>
    <Route path="/checkout" element={<Protected roles={['customer']}><Checkout/></Protected>}/>
    <Route path="/track/:id" element={<Protected><OrderTracking/></Protected>}/>
    <Route path="/profile" element={<Protected><Profile/></Protected>}/>
    <Route path="/restaurant" element={<Protected roles={['restaurant']}><RestaurantDashboard/></Protected>}/>
    <Route path="/delivery" element={<Protected roles={['delivery']}><DeliveryDashboard/></Protected>}/>
    <Route path="/admin" element={<Protected roles={['admin']}><AdminDashboard/></Protected>}/>
  </Routes></BrowserRouter>;
}

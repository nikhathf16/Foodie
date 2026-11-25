const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

async function request(path, options = {}) {
  const user = JSON.parse(localStorage.getItem('foodie_user') || 'null');
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (user?.token) headers['X-User-Id'] = user.token;
  const response = await fetch(`${API_URL}${path}`, { ...options, headers });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.detail || 'Something went wrong');
  return data;
}

export const api = {
  register: (body) => request('/api/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  login: (body) => request('/api/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  profile: () => request('/api/users/profile'),
  updateProfile: (body) => request('/api/users/profile', { method: 'PUT', body: JSON.stringify(body) }),
  restaurants: (search = '') => request(`/api/restaurants?search=${encodeURIComponent(search)}`),
  menu: (id, search = '', category = '') => request(`/api/restaurants/${id}/menu?search=${encodeURIComponent(search)}&category=${encodeURIComponent(category)}`),
  placeOrder: (body) => request('/api/orders', { method: 'POST', body: JSON.stringify(body) }),
  orders: () => request('/api/orders'),
  order: (id) => request(`/api/orders/${id}`),
  updateOrderStatus: (id, status) => request(`/api/orders/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  cancelOrder: (id) => request(`/api/orders/${id}/cancel`, { method: 'PATCH' }),
  acceptDelivery: (id) => request(`/api/delivery/${id}/accept`, { method: 'POST' }),
  adminStats: () => request('/api/admin/stats'),
  adminUsers: () => request('/api/admin/users'),
  adminPayments: () => request('/api/admin/payments'),
  addFood: (body) => request('/api/food-items', { method: 'POST', body: JSON.stringify(body) }),
  editFood: (id, body) => request(`/api/food-items/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteFood: (id) => request(`/api/food-items/${id}`, { method: 'DELETE' }),
};

/**
 * QUANTUM MARKET - CENTRALIZED API CLIENT
 * Connects frontend views directly to the Node.js/Express backend.
 * Uses relative '/api' which works identically in local development (via Vite proxy)
 * and in production on Vercel (via vercel.json routing).
 */

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

async function request(endpoint, options = {}) {
  const token = localStorage.getItem('qm_token');

  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    ...options,
    headers,
  };

  const response = await fetch(`${BASE_URL}${endpoint}`, config);
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMsg = data.message || `Request failed with status ${response.status}`;
    const error = new Error(errorMsg);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

export const api = {
  // Health
  getHealth: () => request('/api/health'),

  // Auth
  auth: {
    register: (body) => request('/api/auth/register', { method: 'POST', body: JSON.stringify(body) }),
    login: (body) => request('/api/auth/login', { method: 'POST', body: JSON.stringify(body) }),
    logout: () => request('/api/auth/logout', { method: 'POST' }),
    me: () => request('/api/auth/me'),
    updateProfile: (body) => request('/api/auth/profile', { method: 'PUT', body: JSON.stringify(body) }),
    updatePassword: (body) => request('/api/auth/password', { method: 'PUT', body: JSON.stringify(body) }),
  },

  // Products
  products: {
    list: (params = {}) => {
      const query = new URLSearchParams();
      if (params.q) query.set('q', params.q);
      if (params.category) query.set('category', params.category);
      if (params.sort) query.set('sort', params.sort);
      if (params.owner_id) query.set('owner_id', params.owner_id);
      if (params.status) query.set('status', params.status);
      const qs = query.toString();
      return request(`/api/products${qs ? `?${qs}` : ''}`);
    },
    get: (id) => request(`/api/products/${id}`),
    create: (body) => request('/api/products', { method: 'POST', body: JSON.stringify(body) }),
    update: (id, body) => request(`/api/products/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    updateStatus: (id, status) => request(`/api/products/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
    getHistory: (id) => request(`/api/products/${id}/history`),
  },

  // Store
  store: {
    getStatus: (ownerId) => request(`/api/store/${ownerId}/status`),
    getHistory: (ownerId) => request(`/api/store/${ownerId}/history`),
    pause: (message) => request('/api/store/pause', { method: 'POST', body: JSON.stringify({ message }) }),
    resume: () => request('/api/store/resume', { method: 'POST' }),
  },

  // Orders
  orders: {
    create: (body) => request('/api/orders', { method: 'POST', body: JSON.stringify(body) }),
    getMyOrders: () => request('/api/orders/my-orders'),
    getOwnerOrders: () => request('/api/orders/owner-orders'),
    cancel: (id) => request(`/api/orders/${id}/cancel`, { method: 'PATCH' }),
    confirmReceived: (id) => request(`/api/orders/${id}/received`, { method: 'PATCH' }),
    confirmPaidCash: (id) => request(`/api/orders/${id}/paid-cash`, { method: 'PATCH' }),
    submitPaymentProof: (id, body) => request(`/api/orders/${id}/pay-proof`, { method: 'POST', body: JSON.stringify(body) }),
  },

  // Owner Dashboard
  owner: {
    getToday: () => request('/api/owner/today'),
    payCommission: (body) => request('/api/owner/pay-commission', { method: 'POST', body: JSON.stringify(body) }),
    getAnalytics: (params = {}) => {
      const query = new URLSearchParams(params).toString();
      return request(`/api/owner/graph${query ? `?${query}` : ''}`);
    },
  },

  // Admin Dashboard
  admin: {
    getOverview: (days = 30) => request(`/api/admin/overview?days=${days}`),
    updateCommissionRate: (rate) => request('/api/admin/commission-rate', { method: 'PUT', body: JSON.stringify({ rate }) }),
    listOwners: () => request('/api/admin/owners'),
    inviteOwner: (email) => request('/api/admin/owners/invite', { method: 'POST', body: JSON.stringify({ email }) }),
    updateOwnerStatus: (id, status) => request(`/api/admin/owners/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
    getOwnerDetails: (id) => request(`/api/admin/owners/${id}/details`),
    adjustCommission: (id, body) => request(`/api/admin/owners/${id}/adjust-commission`, { method: 'POST', body: JSON.stringify(body) }),
    getVerifications: () => request('/api/admin/verifications'),
    verifyCommission: (id, approved) => request(`/api/admin/verifications/commission/${id}`, { method: 'PATCH', body: JSON.stringify({ approved }) }),
    verifyBuyerPayment: (id, approved) => request(`/api/admin/verifications/buyer-payment/${id}`, { method: 'PATCH', body: JSON.stringify({ approved }) }),
    getHistory: (type = 'products') => request(`/api/admin/history?type=${type}`),
    getToday: () => request('/api/admin/today'),
  },

  // Notifications
  notifications: {
    list: () => request('/api/notifications'),
    markRead: (id) => request(`/api/notifications/${id}/read`, { method: 'PATCH' }),
    markAllRead: () => request('/api/notifications/read-all', { method: 'PATCH' }),
  },
};

import React from 'react';
import { useAuth } from '../context/AuthContext';

const NAV_ITEMS = {
  buyer: [
    { view: 'products', icon: '🛍️', label: 'Products' },
    { view: 'history', icon: '🧾', label: 'Order History' },
    { view: 'orders', icon: '📦', label: 'My Orders' },
    { view: 'profile', icon: '👤', label: 'Profile' },
  ],
  owner: [
    { view: 'add', icon: '➕', label: 'Add Product' },
    { view: 'hist', icon: '🧾', label: 'History' },
    { view: 'ord', icon: '📦', label: 'Orders' },
    { view: 'today', icon: '📅', label: 'Today' },
    { view: 'graph', icon: '📊', label: 'Graph' },
  ],
  admin: [
    { view: 'ov', icon: '🏠', label: 'Overview' },
    { view: 'owners', icon: '👥', label: 'Owners' },
    { view: 'create', icon: '➕', label: 'Create Owner' },
    { view: 'ahist', icon: '🧾', label: 'History' },
    { view: 'aord', icon: '🛒', label: 'Orders' },
    { view: 'atoday', icon: '📅', label: 'Today' },
    { view: 'ver', icon: '✅', label: 'Verify' },
    { view: 'agraph', icon: '📊', label: 'Graphs' },
  ],
};

export const BottomNav = ({ currentView, onNavigate }) => {
  const { user } = useAuth();
  const role = user?.role || 'buyer';
  const items = NAV_ITEMS[role] || NAV_ITEMS.buyer;

  return (
    <nav id="bn" aria-label="Main">
      {items.map((item) => (
        <button
          key={item.view}
          className={currentView === item.view ? 'on' : ''}
          onClick={() => onNavigate(item.view)}
        >
          <span>{item.icon}</span>
          {item.label}
        </button>
      ))}
    </nav>
  );
};

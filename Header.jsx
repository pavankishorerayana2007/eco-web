import React from 'react';
import { useAuth } from '../context/AuthContext';

export const Header = ({
  currentView,
  onNavigate,
  unreadCount,
  cartCount,
  onOpenNotifications,
  onOpenPauseModal,
}) => {
  const { user, logout, isBuyer, isOwner, isAdmin } = useAuth();

  const getRoleTitle = () => {
    if (isAdmin) return 'Admin';
    if (isOwner) return 'Owner';
    return 'Buyer';
  };

  const getHomeView = () => {
    if (isAdmin) return 'ov';
    if (isOwner) return 'add';
    return 'products';
  };

  return (
    <header id="top">
      <div className="tl">
        <button className="o s" onClick={() => onNavigate(getHomeView())}>
          Home
        </button>
        <button className="o s" onClick={logout}>
          Sign Out
        </button>
        {isBuyer && <span className="wl">Welcome, {user.full_name}</span>}
      </div>

      <div className="tc">{getRoleTitle()}</div>

      <div className="tr">
        {isOwner && (
          <button
            className={`${user?.store_status === 'paused' ? 'y' : 'o'} s`}
            id="pz"
            style={{ whiteSpace: 'nowrap' }}
            onClick={onOpenPauseModal}
          >
            {user?.store_status === 'paused' ? 'Resume Store' : 'Pause Store'}
          </button>
        )}

        <button
          className="o s ib"
          id="bell"
          aria-label="Notifications"
          onClick={onOpenNotifications}
        >
          🔔
          {unreadCount > 0 && <b id="nb">{unreadCount}</b>}
        </button>

        {isBuyer && (
          <button
            className="o s ib"
            aria-label="Cart"
            onClick={() => onNavigate('cart')}
          >
            🛒
            {cartCount > 0 && <b id="cb">{cartCount}</b>}
          </button>
        )}
      </div>
    </header>
  );
};

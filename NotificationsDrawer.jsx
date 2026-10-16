import React from 'react';

export const NotificationsDrawer = ({
  isOpen,
  notifications,
  onClose,
  onMarkAllRead,
  onNotificationClick,
}) => {
  if (!isOpen) return null;

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div id="np" style={{ display: 'block' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBotton: '10px' }}>
        <b>Notifications</b>
        <button className="o s" onClick={onMarkAllRead}>
          Mark all read
        </button>
      </div>

      <div id="npl" style={{ marginTop: '10px' }}>
        {notifications.length === 0 ? (
          <div className="empty">No notifications yet.</div>
        ) : (
          notifications.map((n) => (
            <div
              key={n.id}
              className={`nt ${n.is_read ? '' : 'u'}`}
              onClick={() => onNotificationClick(n)}
            >
              <b>{n.title}</b>
              {!n.is_read && <span className="pill y" style={{ marginLeft: '6px' }}>New</span>}
              <br />
              {n.message}
              <br />
              <span className="sm">{formatDate(n.created_at)}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

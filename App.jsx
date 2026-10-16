import React, { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import { api } from './services/api';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { NotificationsDrawer } from './components/NotificationsDrawer';
import { Modal } from './components/Modal';
import { Toast } from './components/Toast';
import { AuthModal } from './components/AuthModal';

// Buyer views
import { ProductCatalog } from './views/buyer/ProductCatalog';
import { Cart } from './views/buyer/Cart';
import { Checkout } from './views/buyer/Checkout';
import { Orders } from './views/buyer/Orders';
import { OrderHistory } from './views/buyer/OrderHistory';
import { Profile } from './views/buyer/Profile';

// Owner views
import { AddProduct } from './views/owner/AddProduct';
import { ProductHistory } from './views/owner/ProductHistory';
import { EditProduct } from './views/owner/EditProduct';
import { OwnerOrders } from './views/owner/OwnerOrders';
import { OwnerToday } from './views/owner/OwnerToday';
import { OwnerGraph } from './views/owner/OwnerGraph';

// Admin views
import { AdminOverview } from './views/admin/AdminOverview';
import { AdminOwners } from './views/admin/AdminOwners';
import { AdminOwnerDetail } from './views/admin/AdminOwnerDetail';
import { AdminCreateOwner } from './views/admin/AdminCreateOwner';
import { AdminVerification } from './views/admin/AdminVerification';
import { AdminHistory } from './views/admin/AdminHistory';
import { AdminToday } from './views/admin/AdminToday';
import { AdminGraph } from './views/admin/AdminGraph';

export function App() {
  const { user, isAuthenticated, loading: authLoading, updateUserProfile } = useAuth();

  // Navigation state
  const [currentView, setCurrentView] = useState('products');
  const [selectedProductForEdit, setSelectedProductForEdit] = useState(null);
  const [selectedOwnerId, setSelectedOwnerId] = useState(null);

  // Cart state
  const [cart, setCart] = useState(() => {
    try {
      const saved = localStorage.getItem('qm_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [checkoutItems, setCheckoutItems] = useState([]);

  // Notifications state
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);

  // Modal & Toast states
  const [modalConfig, setModalConfig] = useState({ isOpen: false, title: '', children: null });
  const [toastMessage, setToastMessage] = useState('');
  const [showToast, setShowToast] = useState(false);

  // Sync cart to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('qm_cart', JSON.stringify(cart));
    } catch {}
  }, [cart]);

  // Set default view based on user role upon login
  useEffect(() => {
    if (user) {
      if (user.role === 'admin') setCurrentView('ov');
      else if (user.role === 'owner') setCurrentView('add');
      else setCurrentView('products');
      fetchNotifications();
    }
  }, [user?.id, user?.role]);

  const showToastNotification = (msg) => {
    setToastMessage(msg);
    setShowToast(true);
    setTimeout(() => {
      setShowToast(false);
    }, 2800);
  };

  const fetchNotifications = async () => {
    if (!isAuthenticated) return;
    try {
      const res = await api.notifications.list();
      if (res.success) {
        setNotifications(res.notifications || []);
      }
    } catch {
      // Ignore network failures for notification polling
    }
  };

  const handleMarkAllNotificationsRead = async () => {
    try {
      await api.notifications.markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch (err) {
      showToastNotification('Error: ' + err.message);
    }
  };

  const handleNotificationClick = async (notif) => {
    try {
      await api.notifications.markRead(notif.id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n))
      );
    } catch {}

    setShowNotifications(false);
    if (notif.navigation_json?.view) {
      setCurrentView(notif.navigation_json.view);
    }
  };

  // Cart actions
  const handleAddToCart = (product, quantity) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + quantity } : item
        );
      }
      return [
        ...prev,
        {
          id: product.id,
          owner_id: product.owner_id,
          name: product.name,
          price: product.price * (1 - (product.discount_percent || 0) / 100),
          quantity,
          unit: product.unit,
          product_type: product.product_type,
          image_url: product.image_url,
          emoji: product.emoji,
          shop_name: product.profiles?.shop_name || product.shop_name,
          is_paused: product.profiles?.store_status === 'paused',
        },
      ];
    });
    showToastNotification(`${product.name} added to cart`);
  };

  const handleBuyNow = (product, quantity) => {
    const buyItem = {
      id: product.id,
      owner_id: product.owner_id,
      name: product.name,
      price: product.price * (1 - (product.discount_percent || 0) / 100),
      quantity,
      unit: product.unit,
      product_type: product.product_type,
      image_url: product.image_url,
      emoji: product.emoji,
      shop_name: product.profiles?.shop_name || product.shop_name,
      is_paused: product.profiles?.store_status === 'paused',
    };
    setCheckoutItems([buyItem]);
    setCurrentView('checkout');
  };

  const handleUpdateCartQuantity = (productId, newQty) => {
    if (newQty <= 0) {
      handleRemoveCartItem(productId);
      return;
    }
    setCart((prev) =>
      prev.map((it) => (it.id === productId ? { ...it, quantity: newQty } : it))
    );
  };

  const handleRemoveCartItem = (productId) => {
    setCart((prev) => prev.filter((it) => it.id !== productId));
  };

  const handleReorder = (order) => {
    const items = (order.order_items || []).map((it) => ({
      id: it.product_id,
      owner_id: order.owner_id,
      name: it.product_name,
      price: Number(it.price),
      quantity: Number(it.quantity),
      unit: it.unit,
      product_type: it.product_type,
      image_url: it.image_url,
    }));
    setCart((prev) => [...prev, ...items]);
    showToastNotification('Items re-added to your cart!');
    setCurrentView('cart');
  };

  // Store Pause modal (Owner)
  const handleOpenStorePauseModal = () => {
    const isCurrentlyPaused = user?.store_status === 'paused';

    if (isCurrentlyPaused) {
      setModalConfig({
        isOpen: true,
        title: 'Resume Your Store?',
        children: (
          <div>
            <p style={{ margin: '10px 0 16px' }}>
              Are you sure you want to reactivate your store and allow buyers to place new orders?
            </p>
            <div className="btns">
              <button className="o" onClick={() => setModalConfig({ isOpen: false })}>
                Cancel
              </button>
              <button
                className="b"
                onClick={async () => {
                  setModalConfig({ isOpen: false });
                  try {
                    const res = await api.store.resume();
                    if (res.success) {
                      updateUserProfile({ store_status: 'active' });
                      showToastNotification(res.message);
                    }
                  } catch (err) {
                    showToastNotification('Error: ' + err.message);
                  }
                }}
              >
                Resume Store
              </button>
            </div>
          </div>
        ),
      });
    } else {
      let pauseMsg = 'Our shop is busy with other work today, so we cannot process new orders. Please visit our shop directly to purchase. Thank you for understanding.';

      setModalConfig({
        isOpen: true,
        title: 'Pause Your Store?',
        children: (
          <div>
            <p style={{ margin: '6px 0 12px' }}>
              Your store will temporarily stop accepting new orders. Your existing listings, orders, and records remain safe.
            </p>
            <div className="fg">
              <label htmlFor="pzm">Announcement message for buyers</label>
              <textarea
                id="pzm"
                rows={3}
                defaultValue={pauseMsg}
                onChange={(e) => (pauseMsg = e.target.value)}
              />
            </div>
            <div className="btns">
              <button className="o" onClick={() => setModalConfig({ isOpen: false })}>
                Cancel
              </button>
              <button
                className="b"
                onClick={async () => {
                  setModalConfig({ isOpen: false });
                  try {
                    const res = await api.store.pause(pauseMsg);
                    if (res.success) {
                      updateUserProfile({ store_status: 'paused', store_pause_message: pauseMsg });
                      showToastNotification(res.message);
                    }
                  } catch (err) {
                    showToastNotification('Error: ' + err.message);
                  }
                }}
              >
                Pause Store Now
              </button>
            </div>
          </div>
        ),
      });
    }
  };

  if (authLoading) {
    return <div className="empty" style={{ paddingTop: '100px' }}>Loading Quantum Market...</div>;
  }

  if (!isAuthenticated) {
    return <AuthModal onLoginSuccess={() => fetchNotifications()} onToast={showToastNotification} />;
  }

  const unreadCount = notifications.filter((n) => !n.is_read).length;
  const cartItemCount = cart.reduce((sum, it) => sum + it.quantity, 0);

  return (
    <div>
      {/* Top Header */}
      <Header
        currentView={currentView}
        onNavigate={setCurrentView}
        unreadCount={unreadCount}
        cartCount={cartItemCount}
        onOpenNotifications={() => setShowNotifications((prev) => !prev)}
        onOpenPauseModal={handleOpenStorePauseModal}
      />

      {/* Main Content Area */}
      <main id="app">
        {/* BUYER VIEWS */}
        {currentView === 'products' && (
          <ProductCatalog
            onAddToCart={handleAddToCart}
            onBuyNow={handleBuyNow}
            onToast={showToastNotification}
          />
        )}

        {currentView === 'cart' && (
          <Cart
            cartItems={cart}
            onUpdateQuantity={handleUpdateCartQuantity}
            onRemoveItem={handleRemoveCartItem}
            onProceedToCheckout={() => {
              setCheckoutItems(cart);
              setCurrentView('checkout');
            }}
            onNavigate={setCurrentView}
          />
        )}

        {currentView === 'checkout' && (
          <Checkout
            checkoutItems={checkoutItems}
            onOrderCompleted={() => setCart([])}
            onNavigate={setCurrentView}
            onToast={showToastNotification}
          />
        )}

        {currentView === 'orders' && (
          <Orders
            onToast={showToastNotification}
            onOpenModal={setModalConfig}
            onCloseModal={() => setModalConfig({ isOpen: false })}
          />
        )}

        {currentView === 'history' && (
          <OrderHistory onReorder={handleReorder} onToast={showToastNotification} />
        )}

        {currentView === 'profile' && <Profile onToast={showToastNotification} />}

        {/* OWNER VIEWS */}
        {currentView === 'add' && (
          <AddProduct onNavigate={setCurrentView} onToast={showToastNotification} />
        )}

        {currentView === 'hist' && (
          <ProductHistory
            onEditProduct={(p) => {
              setSelectedProductForEdit(p);
              setCurrentView('edit');
            }}
            onOpenModal={setModalConfig}
            onCloseModal={() => setModalConfig({ isOpen: false })}
            onToast={showToastNotification}
          />
        )}

        {currentView === 'edit' && (
          <EditProduct
            product={selectedProductForEdit}
            onNavigate={setCurrentView}
            onToast={showToastNotification}
          />
        )}

        {currentView === 'ord' && <OwnerOrders onToast={showToastNotification} />}

        {currentView === 'today' && <OwnerToday onToast={showToastNotification} />}

        {currentView === 'graph' && <OwnerGraph onToast={showToastNotification} />}

        {/* ADMIN VIEWS */}
        {currentView === 'ov' && <AdminOverview onToast={showToastNotification} />}

        {currentView === 'owners' && (
          <AdminOwners
            onSelectOwner={(id) => {
              setSelectedOwnerId(id);
              setCurrentView('odet');
            }}
            onOpenModal={setModalConfig}
            onCloseModal={() => setModalConfig({ isOpen: false })}
            onToast={showToastNotification}
          />
        )}

        {currentView === 'odet' && (
          <AdminOwnerDetail
            ownerId={selectedOwnerId}
            onBack={() => setCurrentView('owners')}
            onToast={showToastNotification}
          />
        )}

        {currentView === 'create' && <AdminCreateOwner onToast={showToastNotification} />}

        {currentView === 'ver' && (
          <AdminVerification
            onOpenModal={setModalConfig}
            onCloseModal={() => setModalConfig({ isOpen: false })}
            onToast={showToastNotification}
          />
        )}

        {currentView === 'ahist' && <AdminHistory onToast={showToastNotification} />}

        {currentView === 'aord' && <AdminHistory onToast={showToastNotification} />}

        {currentView === 'atoday' && <AdminToday onToast={showToastNotification} />}

        {currentView === 'agraph' && <AdminGraph />}
      </main>

      {/* Bottom Bar Navigation */}
      <BottomNav currentView={currentView} onNavigate={setCurrentView} />

      {/* Notifications Drawer */}
      <NotificationsDrawer
        isOpen={showNotifications}
        notifications={notifications}
        onClose={() => setShowNotifications(false)}
        onMarkAllRead={handleMarkAllNotificationsRead}
        onNotificationClick={handleNotificationClick}
      />

      {/* Universal Modal */}
      <Modal
        isOpen={modalConfig.isOpen}
        title={modalConfig.title}
        onClose={() => setModalConfig({ isOpen: false })}
      >
        {modalConfig.children}
      </Modal>

      {/* Toast Bar */}
      <Toast message={toastMessage} isVisible={showToast} />
    </div>
  );
}

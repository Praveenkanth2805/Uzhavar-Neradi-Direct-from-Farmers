import React, { useEffect } from 'react';
import { useLocation, useNavigate, NavLink, Routes, Route } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import DeliveryOrders from './delivery/DeliveryOrders';
import DeliveryProfile from './delivery/DeliveryProfile';
import CustomerBrowseProducts from './customer/CustomerBrowseProducts';
import CustomerOrders from './customer/CustomerOrders';
import DeliveryHome from './delivery/DeliveryHome';
import Cart from './customer/Cart';
import Checkout from './customer/Checkout';
import DeliveryPurchases from './delivery/DeliveryPurchases';

const DeliveryDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();

  useEffect(() => {
    if (user && !user.is_approved && !location.pathname.includes('/delivery/profile')) {
      navigate('/delivery/profile');
    }
  }, [user, location, navigate]);

  return (
    <div className={`dashboard-role ${user?.role || 'delivery'}`}>
      <h1>{t('delivery_dashboard')}</h1>
      <nav className="flex gap-md wrap" style={{ flexWrap: 'wrap' }}>
        <NavLink to="/delivery" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} end>
          {t('home')}
        </NavLink>
        <NavLink to="/delivery/orders" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          {t('assigned_orders')}
        </NavLink>
        <NavLink to="/delivery/browse" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          {t('browse_products')}
        </NavLink>
        <NavLink to="/delivery/purchases" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          {t('my_purchases')}
        </NavLink>
        <NavLink to="/delivery/profile" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          {t('profile')}
        </NavLink>
        <NavLink to="/delivery/cart" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          {t('cart')}
        </NavLink>
      </nav>
      <Routes>
        <Route index element={<DeliveryHome />} />
        <Route path="orders" element={<DeliveryOrders />} />
        <Route path="browse" element={<CustomerBrowseProducts />} />
        <Route path="purchases" element={<DeliveryPurchases />} />
        <Route path="profile" element={<DeliveryProfile />} />
        <Route path="cart" element={<Cart />} />
        <Route path="checkout" element={<Checkout />} />
      </Routes>
    </div>
  );
};

export default DeliveryDashboard;
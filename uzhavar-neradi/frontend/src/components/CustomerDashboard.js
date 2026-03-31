import React, { useEffect } from 'react';
import { useLocation, useNavigate, NavLink, Routes, Route } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import CustomerHome from './customer/CustomerHome';
import CustomerProfile from './customer/CustomerProfile';
import CustomerBrowseProducts from './customer/CustomerBrowseProducts';
import CustomerOrders from './customer/CustomerOrders';
import Cart from './customer/Cart';
import Checkout from './customer/Checkout';

const CustomerDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();

  useEffect(() => {
    if (user && !user.is_approved && !location.pathname.includes('/customer/profile')) {
      navigate('/customer/profile');
    }
  }, [user, location, navigate]);

  return (
    <div className={`dashboard-role ${user?.role || 'customer'}`}>
      <h1>{t('customer_dashboard')}</h1>
      <nav className="flex gap-md wrap" style={{ flexWrap: 'wrap' }}>
        <NavLink to="/customer" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} end>
          {t('home')}
        </NavLink>
        <NavLink to="/customer/profile" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          {t('my_profile')}
        </NavLink>
        <NavLink to="/customer/browse" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          {t('browse_products')}
        </NavLink>
        <NavLink to="/customer/orders" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          {t('my_orders')}
        </NavLink>
        <NavLink to="/customer/cart" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          {t('cart')}
        </NavLink>
      </nav>
      <Routes>
        <Route index element={<CustomerHome />} />
        <Route path="profile" element={<CustomerProfile />} />
        <Route path="browse" element={<CustomerBrowseProducts />} />
        <Route path="orders" element={<CustomerOrders />} />
        <Route path="checkout" element={<Checkout />} />
        <Route path="cart" element={<Cart />} />
      </Routes>
    </div>
  );
};

export default CustomerDashboard;
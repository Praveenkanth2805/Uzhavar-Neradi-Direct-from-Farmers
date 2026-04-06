import React, { useEffect } from 'react';
import { useLocation, useNavigate, NavLink, Routes, Route } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import FarmerHome from './farmer/FarmerHome';
import FarmerProducts from './farmer/FarmerProducts';
import FarmerAddProduct from './farmer/FarmerAddProduct';
import FarmerOrders from './farmer/FarmerOrders';
import FarmerProfile from './farmer/FarmerProfile';
import CustomerBrowseProducts from './customer/CustomerBrowseProducts';
import CustomerOrders from './customer/CustomerOrders';
import FarmerEditProduct from './farmer/FarmerEditProduct';
import Cart from './customer/Cart';               // new
import Checkout from './customer/Checkout';  
import FarmerPurchases from './farmer/FarmerPurchases';   // new

const FarmerDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();

  useEffect(() => {
    if (user && !user.is_approved && !location.pathname.includes('/farmer/profile')) {
      navigate('/farmer/profile');
    }
  }, [user, location, navigate]);

  return (
    <div className={`dashboard-role ${user?.role || 'farmer'}`}>
      <h1>{t('farmer_dashboard')}</h1>
      <nav className="flex gap-md wrap" style={{ flexWrap: 'wrap' }}>
        <NavLink to="/farmer" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} end>
          {t('home')}
        </NavLink>
        <NavLink to="/farmer/products" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          {t('my_products')}
        </NavLink>
        <NavLink to="/farmer/add-product" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          {t('add_product')}
        </NavLink>
        <NavLink to="/farmer/orders" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          {t('selling_orders')}
        </NavLink>
        <NavLink to="/farmer/browse" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          {t('browse_products')}
        </NavLink>
        <NavLink to="/farmer/purchases" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          {t('my_purchases')}
        </NavLink>
        <NavLink to="/farmer/profile" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          {t('profile')}
        </NavLink>
        <NavLink to="/farmer/cart" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          {t('cart')}
        </NavLink>
      </nav>
      <Routes>
        <Route index element={<FarmerHome />} />
        <Route path="products" element={<FarmerProducts />} />
        <Route path="add-product" element={<FarmerAddProduct />} />
        <Route path="orders" element={<FarmerOrders />} />
        <Route path="browse" element={<CustomerBrowseProducts />} />
        <Route path="purchases" element={<FarmerPurchases />} />
        <Route path="profile" element={<FarmerProfile />} />
        <Route path="edit-product/:id" element={<FarmerEditProduct />} />
        <Route path="cart" element={<Cart />} />
        <Route path="checkout" element={<Checkout />} />
      </Routes>
    </div>
  );
};

export default FarmerDashboard;
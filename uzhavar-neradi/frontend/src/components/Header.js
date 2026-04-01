import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Button from './Button/Button';

const Header = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();

  // Role accent color mapping
  const roleAccent = {
    admin: 'var(--color-admin)',
    farmer: 'var(--color-farmer)',
    customer: 'var(--color-customer)',
    delivery: 'var(--color-delivery)',
  }[user?.role] || 'var(--color-primary)';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const toggleLanguage = () => {
    const newLang = i18n.language === 'en' ? 'ta' : 'en';
    i18n.changeLanguage(newLang);
  };

  // Get the correct cart path based on user role
  const getCartPath = () => {
    if (!user) return '/customer/cart'; // fallback
    if (user.role === 'farmer') return '/farmer/cart';
    if (user.role === 'delivery') return '/delivery/cart';
    return '/customer/cart';
  };

  return (
    <header style={{ width: '100%' }}>
      {/* Role‑based top accent stripe */}
      <div style={{ height: '4px', backgroundColor: roleAccent }} />

      <div className="flex justify-between items-center p-md" style={{ background: 'var(--color-background)', boxShadow: 'var(--box-shadow)' }}>
        {/* Logo */}
        <Link to="/" className="flex items-center gap-sm" style={{ textDecoration: 'none' }}>
          <img
            src="/logo.png" // Replace with your actual logo path
            alt="Uzhavar Neradi"
            style={{ height: '40px', width: 'auto' }}
            onError={(e) => { e.target.style.display = 'none'; }} // fallback if image missing
          />
          <span style={{ fontWeight: 'bold', fontSize: '1.2rem', color: 'var(--color-primary)' }}>
            {t('uzhavar_neradi')}
          </span>
        </Link>

        {/* Right side: user info + buttons */}
        <div className="flex items-center gap-sm">
          {user ? (
            <>
              {/*<Link to={getCartPath()} className="nav-link">
                {t('cart')
              </Link>}*/}
              <span className="flex items-center gap-xs">
                <strong>{user.username}</strong>
                <span className="role-accent-text" style={{ fontWeight: 'bold', color: roleAccent }}>
                  ({user.role})
                </span>
              </span>
              <Button variant="secondary" onClick={handleLogout} className="btn-sm">
                {t('logout')}
              </Button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn btn-primary btn-sm">
                {t('login')}
              </Link>
              <Link to="/register" className="btn btn-secondary btn-sm">
                {t('register')}
              </Link>
            </>
          )}

          {/* Language Toggle Button */}
          <Button
            variant="accent"
            onClick={toggleLanguage}
            className="btn-sm"
            style={{ minWidth: '70px' }}
          >
            {i18n.language === 'en' ? 'தமிழ்' : 'English'}
          </Button>
        </div>
      </div>
    </header>
  );
};

export default Header;
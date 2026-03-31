import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import Button from './Button/Button';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, error } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const handleSubmit = async e => {
    e.preventDefault();
    const userData = await login(email, password);
    if (userData) {
      if (!userData.is_approved) {
        // Redirect to profile page based on role
        if (userData.role === 'farmer') navigate('/farmer/profile');
        else if (userData.role === 'delivery') navigate('/delivery/profile');
        else if (userData.role === 'customer') navigate('/customer/profile');
        else navigate('/dashboard');
      } else {
        navigate('/dashboard');
      }
    }
  };

  return (
    <div className="container mt-md">
      <div className="card" style={{ maxWidth: '400px', margin: '0 auto' }}>
        <h2 className="text-center">{t('login')}</h2>
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <input
              type="email"
              placeholder={t('email')}
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="input"
            />
          </div>
          <div className="form-group">
            <input
              type="password"
              placeholder={t('password')}
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className="input"
            />
          </div>
          <div className="form-group">
            <Button type="submit" variant="primary" className="w-full">
              {t('login')}
            </Button>
          </div>
        </form>
        <p className="text-center mt-md">
          {t('no_account')}{' '}
          <a href="/register" className="link">{t('register')}</a>
        </p>
      </div>
    </div>
  );
};

export default Login;
import React, { useState } from 'react';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import GeoapifyAddressInput from '../GeoapifyAddressInput';
import Button from '../Button/Button';
import { toast } from 'react-toastify';

const CustomerProfile = () => {
  const { user, setUser } = useAuth();
  const { t } = useTranslation();
  const [address, setAddress] = useState(user?.address || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [language, setLanguage] = useState(user?.language || 'ta');
  const [latitude, setLatitude] = useState(user?.latitude || null);
  const [longitude, setLongitude] = useState(user?.longitude || null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const isPending = user && !user.is_approved && !user.is_rejected;
  const isRejected = user && user.is_rejected;

  const handlePlaceSelected = ({ address, lat, lng }) => {
    setAddress(address);
    setLatitude(parseFloat(lat.toFixed(6)));
    setLongitude(parseFloat(lng.toFixed(6)));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      await api.patch('/users/update-profile/', {
        address,
        phone,
        language,
        latitude,
        longitude
      });
      setUser({ ...user, address, phone, language, latitude, longitude });
      setMessage(t('profile_updated'));
      toast.success(t('profile_updated'));
      if (isRejected) {
        toast.info(t('resubmitted_for_approval'));
      }
      if (!latitude || !longitude) {
        toast.warn(t('address_not_geocoded'));
      }
    } catch (err) {
      setMessage(t('update_failed'));
      toast.error(t('update_failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mt-md">
      <div className="card" style={{ maxWidth: '500px', margin: '0 auto' }}>
        <h2>{t('my_profile')}</h2>
        {isPending && (
          <div className="alert alert-info">
            {t('pending_approval_message')}
          </div>
        )}
        {isRejected && (
          <div className="alert alert-warning">
            <strong>{t('rejected_message')}</strong><br />
            {t('rejection_reason')}: {user.rejection_reason}<br />
            {t('please_update_documents')}
          </div>
        )}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>{t('email')}:</label>
            <input
              type="email"
              value={user?.email || ''}
              disabled
              className="input"
            />
          </div>
          <div className="form-group">
            <label>{t('phone')}:</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              className="input"
            />
          </div>
          <div className="form-group">
            <label>{t('delivery_address')}:</label>
            <GeoapifyAddressInput
              value={address}
              onChange={setAddress}
              onPlaceSelected={handlePlaceSelected}
            />
          </div>
          <div className="form-group">
            <label>{t('language')}:</label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="input"
            >
              <option value="ta">தமிழ்</option>
              <option value="en">English</option>
            </select>
          </div>
          <div className="form-group">
            <Button
              type="submit"
              variant="primary"
              disabled={loading}
              className="w-full"
            >
              {loading ? t('updating') : t('update_profile')}
            </Button>
          </div>
          {message && (
            <p className={`text-${message.includes(t('profile_updated')) ? 'success' : 'error'}`}>
              {message}
            </p>
          )}
        </form>
      </div>
    </div>
  );
};

export default CustomerProfile;
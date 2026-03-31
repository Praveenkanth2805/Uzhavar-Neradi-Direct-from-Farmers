import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import GeoapifyAddressInput from '../GeoapifyAddressInput';
import Button from '../Button/Button';

const FarmerProfile = () => {
  const { user, setUser } = useAuth();
  const { t } = useTranslation();
  const [upiId, setUpiId] = useState(user?.upi_id || '');
  const [address, setAddress] = useState(user?.address || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [language, setLanguage] = useState(user?.language || 'ta');
  const [latitude, setLatitude] = useState(user?.latitude || null);
  const [longitude, setLongitude] = useState(user?.longitude || null);
  const [landPhoto, setLandPhoto] = useState(null);
  const [existingLandPhoto, setExistingLandPhoto] = useState(user?.land_photo || '');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const isPending = user && !user.is_approved && !user.is_rejected;
  const isRejected = user && user.is_rejected;

  const handlePlaceSelected = ({ address, lat, lng }) => {
    setAddress(address);
    setLatitude(parseFloat(lat.toFixed(6)));
    setLongitude(parseFloat(lng.toFixed(6)));
  };

  const handleFileChange = (e) => {
    setLandPhoto(e.target.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    const formData = new FormData();
    formData.append('upi_id', upiId);
    formData.append('address', address);
    formData.append('phone', phone);
    formData.append('language', language);
    if (latitude) formData.append('latitude', latitude);
    if (longitude) formData.append('longitude', longitude);
    if (landPhoto) formData.append('land_photo', landPhoto);

    try {
      const res = await api.patch('/users/update-profile/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setUser({ ...user, upi_id: upiId, address, phone, language, latitude, longitude,
                land_photo: res.data.land_photo });
      setExistingLandPhoto(res.data.land_photo);
      setMessage(t('profile_updated'));
      toast.success(t('profile_updated'));
      if (isRejected) {
        toast.info(t('resubmitted_for_approval'));
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
      <div className="card" style={{ maxWidth: '600px', margin: '0 auto' }}>
        <h2>{t('farmer_profile')}</h2>
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
        <form onSubmit={handleSubmit} encType="multipart/form-data">
          <div className="form-group">
            <label>{t('email')}</label>
            <input type="email" value={user?.email || ''} disabled className="input" />
          </div>
          <div className="form-group">
            <label>{t('phone')}</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              className="input"
            />
          </div>
          <div className="form-group">
            <label>UPI ID</label>
            <input
              type="text"
              value={upiId}
              onChange={(e) => setUpiId(e.target.value)}
              placeholder="e.g., farmer@okhdfcbank"
              className="input"
            />
          </div>
          <div className="form-group">
            <label>{t('farm_address')}</label>
            <GeoapifyAddressInput
              value={address}
              onChange={setAddress}
              onPlaceSelected={handlePlaceSelected}
            />
          </div>
          <div className="form-group">
            <label>{t('language')}</label>
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
            <label>{t('land_photo')}</label>
            {existingLandPhoto && (
              <div className="mb-sm">
                <img src={existingLandPhoto} alt="Land" style={{ maxWidth: '200px', maxHeight: '150px' }} />
              </div>
            )}
            <input type="file" accept="image/*" onChange={handleFileChange} className="input" />
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

export default FarmerProfile;
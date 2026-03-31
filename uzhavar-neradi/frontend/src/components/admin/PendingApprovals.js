import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import api from '../../services/api';
import Button from '../Button/Button';

const PendingApprovals = () => {
  const { t } = useTranslation();
  const [pendingUsers, setPendingUsers] = useState([]);
  const [rejectionReasons, setRejectionReasons] = useState({});
  const [remarkText, setRemarkText] = useState('');
  const [selectedReason, setSelectedReason] = useState('');
  const [currentUserId, setCurrentUserId] = useState(null);
  const [currentRole, setCurrentRole] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [approveUserId, setApproveUserId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPending();
    fetchRejectionReasons();
  }, []);

  const fetchPending = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/pending-users/');
      setPendingUsers(res.data);
    } catch (err) {
      console.error(err);
      toast.error(t('failed_load_pending'));
    } finally {
      setLoading(false);
    }
  };

  const fetchRejectionReasons = async () => {
    try {
      const res = await api.get('/admin/settings/');
      const reasonsMap = {};
      res.data.forEach(setting => {
        if (setting.key === 'farmer_rejection_reasons') {
          reasonsMap.farmer = JSON.parse(setting.value);
        } else if (setting.key === 'delivery_rejection_reasons') {
          reasonsMap.delivery = JSON.parse(setting.value);
        } else if (setting.key === 'customer_rejection_reasons') {
          reasonsMap.customer = JSON.parse(setting.value);
        }
      });
      setRejectionReasons(reasonsMap);
    } catch (err) {
      console.error(err);
    }
  };

  const approveUser = async (userId) => {
    try {
      await api.post(`/admin/approve-user/${userId}/`);
      toast.success(t('user_approved'));
      setShowApproveModal(false);
      fetchPending();
    } catch (err) {
      toast.error(t('approve_failed'));
    }
  };

  const openApproveModal = (userId) => {
    setApproveUserId(userId);
    setShowApproveModal(true);
  };

  const openRejectModal = (userId, role) => {
    setCurrentUserId(userId);
    setCurrentRole(role);
    setSelectedReason('');
    setRemarkText('');
    setShowRejectModal(true);
  };

  const rejectUser = async () => {
    const remark = selectedReason === 'Other' ? remarkText : selectedReason;
    if (!remark) {
      toast.warn(t('rejection_reason_required'));
      return;
    }
    try {
      await api.post(`/admin/reject-user/${currentUserId}/`, { remark });
      toast.success(t('user_rejected'));
      setShowRejectModal(false);
      fetchPending();
    } catch (err) {
      toast.error(t('reject_failed'));
    }
  };

  const renderDocuments = (user) => {
    // Display images directly
    return (
      <div className="flex gap-sm" style={{ flexWrap: 'wrap' }}>
        {user.land_photo && (
          <img
            src={user.land_photo}
            alt="Land"
            style={{ width: '80px', height: '60px', objectFit: 'cover', cursor: 'pointer' }}
            onClick={() => window.open(user.land_photo, '_blank')}
          />
        )}
        {user.vehicle_photo && (
          <img
            src={user.vehicle_photo}
            alt="Vehicle"
            style={{ width: '80px', height: '60px', objectFit: 'cover', cursor: 'pointer' }}
            onClick={() => window.open(user.vehicle_photo, '_blank')}
          />
        )}
        {user.license_photo && (
          <img
            src={user.license_photo}
            alt="License"
            style={{ width: '80px', height: '60px', objectFit: 'cover', cursor: 'pointer' }}
            onClick={() => window.open(user.license_photo, '_blank')}
          />
        )}
        {!user.land_photo && !user.vehicle_photo && !user.license_photo && (
          <span>{t('no_documents')}</span>
        )}
      </div>
    );
  };

  const renderDocumentsLarge = (user) => (
    <div className="flex gap-md" style={{ flexWrap: 'wrap', justifyContent: 'center' }}>
      {user.land_photo && (
        <div>
          <strong>{t('land_photo')}</strong><br />
          <img
            src={user.land_photo}
            alt="Land"
            style={{ width: '200px', height: '150px', objectFit: 'cover', cursor: 'pointer' }}
            onClick={() => window.open(user.land_photo, '_blank')}
          />
        </div>
      )}
      {user.vehicle_photo && (
        <div>
          <strong>{t('vehicle_photo')}</strong><br />
          <img
            src={user.vehicle_photo}
            alt="Vehicle"
            style={{ width: '200px', height: '150px', objectFit: 'cover', cursor: 'pointer' }}
            onClick={() => window.open(user.vehicle_photo, '_blank')}
          />
        </div>
      )}
      {user.license_photo && (
        <div>
          <strong>{t('license_photo')}</strong><br />
          <img
            src={user.license_photo}
            alt="License"
            style={{ width: '200px', height: '150px', objectFit: 'cover', cursor: 'pointer' }}
            onClick={() => window.open(user.license_photo, '_blank')}
          />
        </div>
      )}
      {!user.land_photo && !user.vehicle_photo && !user.license_photo && (
        <span>{t('no_documents')}</span>
      )}
    </div>
  );

  const getRoleDisplay = (role) => {
    switch(role) {
      case 'farmer': return t('farmer');
      case 'delivery': return t('delivery_partner');
      case 'customer': return t('customer');
      default: return role;
    }
  };

  const currentUser = pendingUsers.find(u => u.id === currentUserId);
  const approveUserObj = pendingUsers.find(u => u.id === approveUserId);

  if (loading) return <div className="container mt-md">{t('loading')}</div>;

  return (
    <div className="container mt-md">
      <h2>{t('pending_approvals')}</h2>
      {pendingUsers.length === 0 ? (
        <p>{t('no_pending_users')}</p>
      ) : (
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>{t('username')}</th>
                <th>{t('email')}</th>
                <th>{t('phone')}</th>
                <th>{t('role')}</th>
                <th>{t('documents')}</th>
                <th>{t('actions')}</th>
                </tr>
              </thead>
            <tbody>
              {pendingUsers.map(user => (
                <tr key={user.id}>
                  <td>{user.username}</td>
                  <td>{user.email}</td>
                  <td>{user.phone}</td>
                  <td>{getRoleDisplay(user.role)}</td>
                  <td>{renderDocuments(user)}</td>
                  <td>
                    <div className="flex gap-sm">
                      <Button variant="success" onClick={() => openApproveModal(user.id)}>
                        {t('approve')}
                      </Button>
                      <Button variant="danger" onClick={() => openRejectModal(user.id, user.role)}>
                        {t('reject')}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
           </table>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && currentUser && (
        <div className="modal-overlay">
          <div className="card" style={{ maxWidth: '500px', margin: '0 auto' }}>
            <h3>{t('reject_user', { role: getRoleDisplay(currentRole) })}</h3>

            <div className="mb-md">
              <h4>{t('documents')}</h4>
              <div className="flex gap-sm" style={{ flexWrap: 'wrap' }}>
                {renderDocumentsLarge(currentUser)}
              </div>
            </div>

            <div className="mb-md">
              <label>{t('select_reason')}</label>
              <select
                value={selectedReason}
                onChange={(e) => setSelectedReason(e.target.value)}
                className="input"
              >
                <option value="">-- {t('choose')} --</option>
                {rejectionReasons[currentRole]?.map((reason, idx) => (
                  <option key={idx} value={reason}>{reason}</option>
                ))}
                <option value="Other">{t('other')}</option>
              </select>
            </div>
            {selectedReason === 'Other' && (
              <div className="mb-md">
                <label>{t('remark')}</label>
                <textarea
                  value={remarkText}
                  onChange={(e) => setRemarkText(e.target.value)}
                  className="input"
                  rows="3"
                />
              </div>
            )}
            <div className="flex gap-sm justify-end">
              <Button variant="danger" onClick={rejectUser}>{t('send_rejection')}</Button>
              <Button variant="secondary" onClick={() => setShowRejectModal(false)}>{t('cancel')}</Button>
            </div>
          </div>
        </div>
      )}

      {/* Approve Confirmation Modal */}
      {showApproveModal && approveUserObj && (
        <div className="modal-overlay">
          <div className="card" style={{ maxWidth: '600px', margin: '0 auto' }}>
            <h3>{t('confirm_approval')}</h3>
            <div className="mb-md">
              <h4>{t('documents')}</h4>
              {renderDocumentsLarge(approveUserObj)}
            </div>
            <div className="flex gap-sm justify-end">
              <Button variant="success" onClick={() => approveUser(approveUserId)}>
                {t('confirm_approve')}
              </Button>
              <Button variant="secondary" onClick={() => setShowApproveModal(false)}>
                {t('cancel')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PendingApprovals;
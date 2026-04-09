import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import Button from '../Button/Button';

const DeliveryOrders = () => {
  const [orders, setOrders] = useState([]);
  const [updating, setUpdating] = useState(null);
  const [remark, setRemark] = useState('');
  const [showRemark, setShowRemark] = useState(null);
  const [rejectModal, setRejectModal] = useState({ show: false, assignmentId: null, orderId: null });
  const [rejectReason, setRejectReason] = useState('');
  const [rejecting, setRejecting] = useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const res = await api.get('/delivery/orders/');
      setOrders(res.data);
    } catch (err) {
      console.error('Failed to fetch orders', err);
      toast.error(t('failed_load_orders'));
    }
  };

  const updateStatus = async (orderId, newStatus, remarkText = '') => {
    setUpdating(orderId);
    try {
      await api.patch(`/orders/delivery/orders/${orderId}/update/`, {
        status: newStatus,
        remark: remarkText,
      });
      toast.success(t('status_updated'));
      fetchOrders();
      setShowRemark(null);
      setRemark('');
    } catch (err) {
      toast.error(err.response?.data?.error || t('update_failed'));
    } finally {
      setUpdating(null);
    }
  };

  const handleReject = async () => {
    if (!rejectReason) {
      toast.error(t('please_select_reason'));
      return;
    }
    setRejecting(true);
    try {
      const res = await api.post(`/delivery/assignments/${rejectModal.assignmentId}/reject/`, {
        reason: rejectReason,
      });
      if (res.data.status === 'reassigned') {
        toast.success(t('order_rejected_reassigned', { name: res.data.new_partner_name }));
      } else if (res.data.status === 'no_partner_available') {
        toast.warning(t('no_partner_available_manual'));
      }
      fetchOrders();
      setRejectModal({ show: false, assignmentId: null, orderId: null });
      setRejectReason('');
    } catch (err) {
      toast.error(err.response?.data?.error || t('rejection_failed'));
    } finally {
      setRejecting(false);
    }
  };

  return (
    <div className="container mt-md">
      <h2>{t('assigned_orders')}</h2>
      {orders.length === 0 ? (
        <p>{t('no_assigned_orders')}</p>
      ) : (
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>ID</th>
                <th>{t('customer')}</th>
                <th>{t('address')}</th>
                <th>{t('total')}</th>
                <th>{t('status')}</th>
                <th>{t('actions')}</th>
              </tr>
            </thead>
            <tbody>
              {orders.map(o => (
                <tr key={o.id}>
                  <td>{o.id}</td>
                  <td>{o.customer_name}</td>
                  <td>{o.delivery_address}</td>
                  <td>₹{o.total_amount}</td>
                  <td>{o.status}</td>
                  <td>
                    {o.status === 'shipped' && (
                      <div className="flex gap-sm wrap">
                        <Button
                          variant="primary"
                          onClick={() => updateStatus(o.id, 'out_for_delivery')}
                          disabled={updating === o.id}
                        >
                          {t('out_for_delivery')}
                        </Button>
                        <Button
                          variant="danger"
                          onClick={() => setRejectModal({
                            show: true,
                            assignmentId: o.assignment_id,
                            orderId: o.id
                          })}
                          disabled={updating === o.id}
                        >
                          {t('reject')}
                        </Button>
                      </div>
                    )}
                    {o.status === 'out_for_delivery' && (
                      <div className="flex gap-sm">
                        <Button
                          variant="success"
                          onClick={() => updateStatus(o.id, 'delivered')}
                          disabled={updating === o.id}
                        >
                          {t('delivered')}
                        </Button>
                        <Button
                          variant="danger"
                          onClick={() => setShowRemark(o.id)}
                        >
                          {t('not_delivered')}
                        </Button>
                      </div>
                    )}
                    {showRemark === o.id && (
                      <div className="card mt-sm" style={{ padding: 'var(--spacing-sm)' }}>
                        <textarea
                          placeholder={t('enter_remark')}
                          value={remark}
                          onChange={(e) => setRemark(e.target.value)}
                          rows="2"
                          className="input"
                        />
                        <div className="flex gap-sm mt-sm">
                          <Button
                            variant="danger"
                            onClick={() => updateStatus(o.id, 'not_delivered', remark)}
                            disabled={updating === o.id}
                          >
                            {t('submit')}
                          </Button>
                          <Button
                            variant="secondary"
                            onClick={() => setShowRemark(null)}
                          >
                            {t('cancel')}
                          </Button>
                        </div>
                      </div>
                    )}
                    {updating === o.id && <span className="ml-sm">{t('updating')}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Rejection Modal */}
      {rejectModal.show && (
        <div className="modal-overlay" style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div className="card" style={{ maxWidth: '500px', margin: '1rem', padding: '1.5rem' }}>
            <h3>{t('reject_order')}</h3>
            <div className="mb-md">
              <label className="form-label">{t('rejection_reason')}</label>
              <select
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="input"
              >
                <option value="">{t('select_reason')}</option>
                <option value="too_far">{t('too_far')}</option>
                <option value="busy">{t('busy')}</option>
                <option value="vehicle_issue">{t('vehicle_issue')}</option>
                <option value="personal_reason">{t('personal_reason')}</option>
                <option value="other">{t('other')}</option>
              </select>
            </div>
            <div className="flex gap-sm justify-end">
              <Button variant="danger" onClick={handleReject} disabled={rejecting}>
                {rejecting ? t('rejecting') : t('confirm_reject')}
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setRejectModal({ show: false, assignmentId: null, orderId: null });
                  setRejectReason('');
                }}
              >
                {t('cancel')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeliveryOrders;
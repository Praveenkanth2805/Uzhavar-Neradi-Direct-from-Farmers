import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import Button from '../Button/Button';

const DeliveryPurchases = () => {
  const [orders, setOrders] = useState([]);
  const [cancelling, setCancelling] = useState(null);
  const [reason, setReason] = useState('');
  const [showCancel, setShowCancel] = useState(null);
  const { t } = useTranslation();

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      // Use the same endpoint as customers – it should return orders for the logged-in user
      const res = await api.get('/orders/customer/orders/');
      setOrders(res.data);
    } catch (err) {
      console.error('Failed to fetch purchase orders', err);
      toast.error(t('failed_load_orders'));
    }
  };

  const cancelOrder = async (orderId) => {
    if (!reason.trim()) {
      toast.error(t('cancellation_reason_required'));
      return;
    }
    setCancelling(orderId);
    try {
      await api.patch(`/orders/customer/orders/${orderId}/cancel/`, { reason });
      toast.success(t('order_cancelled'));
      fetchOrders();
      setShowCancel(null);
      setReason('');
    } catch (err) {
      toast.error(err.response?.data?.error || t('cancellation_failed'));
    } finally {
      setCancelling(null);
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'delivered': return 'var(--color-success)';
      case 'cancelled': return 'var(--color-error)';
      case 'pending': return 'var(--color-accent)';
      default: return 'var(--color-primary)';
    }
  };

  if (orders.length === 0) {
    return (
      <div className="container mt-md text-center">
        <h2>{t('my_purchases')}</h2>
        <p>{t('no_orders')}</p>
      </div>
    );
  }

  return (
    <div className="container mt-md">
      <h2>{t('my_purchases')}</h2>
      <div className="table-responsive">
        <table className="table">
          <thead>
            <tr>
              <th>ID</th>
              <th>{t('date')}</th>
              <th>{t('farmer')}</th>
              <th>{t('total')}</th>
              <th>{t('status')}</th>
              <th>{t('cancel_reason')}</th>
              <th>{t('payment')}</th>
              <th>{t('delivery_address')}</th>
              <th>{t('actions')}</th>
            </tr>
          </thead>
          <tbody>
            {orders.map(o => (
              <tr key={o.id}>
                <td>{o.id}</td>
                <td>{new Date(o.order_date).toLocaleDateString()}</td>
                <td>{o.farmer_name}</td>
                <td>₹{o.total_amount}</td>
                <td style={{ color: getStatusColor(o.status) }}>{o.status}</td>
                <td>{o.status === 'cancelled' ? o.cancellation_reason || '—' : '—'}</td>
                <td>{o.payment_status}</td>
                <td>{o.delivery_address}</td>
                <td>
                  {/* Pickup confirmation for pickup orders */}
                  {o.delivery_method === 'pickup' && o.status === 'shipped' && (
                    <Button 
                      variant="primary" 
                      onClick={async () => {
                        try {
                          await api.patch(`/orders/customer/orders/${o.id}/pickup/`);
                          toast.success(t('order_picked_up'));
                          fetchOrders();
                        } catch (err) {
                          toast.error(err.response?.data?.error || t('pickup_failed'));
                        }
                      }}
                    >
                      {t('mark_as_picked_up')}
                    </Button>
                  )}
                  {/* Cancel button for pending orders */}
                  {o.status === 'pending' && (
                    <>
                      <Button variant="danger" onClick={() => setShowCancel(o.id)}>
                        {t('cancel')}
                      </Button>
                      {showCancel === o.id && (
                        <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                          <div className="card" style={{ maxWidth: '500px', margin: '1rem' }}>
                            <h3>{t('confirm_cancel')}</h3>
                            <div className="mb-md">
                              <textarea
                                placeholder={t('enter_cancel_reason')}
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                className="input"
                                rows="3"
                              />
                            </div>
                            <div className="flex gap-sm justify-end">
                              <Button
                                variant="danger"
                                onClick={() => cancelOrder(o.id)}
                                disabled={cancelling === o.id}
                              >
                                {cancelling === o.id ? t('cancelling') : t('confirm_cancel')}
                              </Button>
                              <Button
                                variant="secondary"
                                onClick={() => { setShowCancel(null); setReason(''); }}
                              >
                                {t('close')}
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DeliveryPurchases;
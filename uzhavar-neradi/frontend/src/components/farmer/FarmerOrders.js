import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import Button from '../Button/Button';

const FarmerOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updating, setUpdating] = useState(null);
  const [assigning, setAssigning] = useState(null);
  const { t } = useTranslation();

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const res = await api.get('/orders/farmer/orders/');
      setOrders(res.data);
    } catch (err) {
      console.error(err);
      setError(t('failed_load_orders'));
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (orderId, newStatus) => {
    if (!newStatus) return;
    setUpdating(orderId);
    try {
      await api.patch(`/orders/farmer/orders/${orderId}/update/`, { status: newStatus });
      toast.success(t('order_status_updated_to', { status: newStatus }));
      fetchOrders();
    } catch (err) {
      toast.error(err.response?.data?.error || t('update_failed'));
    } finally {
      setUpdating(null);
    }
  };

  const assignDeliveryPartner = async (orderId) => {
    setAssigning(orderId);
    try {
      const res = await api.post(`/orders/${orderId}/assign-delivery-partner/`);
      toast.success(t('delivery_partner_assigned', { name: res.data.partner_name }));
      fetchOrders();
    } catch (err) {
      toast.error(err.response?.data?.error || t('assignment_failed'));
    } finally {
      setAssigning(null);
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'delivered': return 'var(--color-success)';
      case 'cancelled': return 'var(--color-error)';
      case 'pending': return 'var(--color-accent)';
      case 'out_for_delivery': return 'var(--color-primary)';
      default: return 'var(--color-text)';
    }
  };

  if (loading) return <div className="container mt-md text-center">{t('loading')}</div>;
  if (error) return <div className="container mt-md text-center text-error">{error}</div>;
  if (orders.length === 0) return <div className="container mt-md text-center">{t('no_orders')}</div>;

  return (
    <div className="container mt-md">
      <h2>{t('my_orders')}</h2>
      <div className="table-responsive">
        <table className="table">
          <thead>
            <tr>
              <th>{t('order_id')}</th>
              <th>{t('customer')}</th>
              <th>{t('order_type')}</th>
              <th>{t('delivery_method')}</th>
              <th>{t('order_date')}</th>
              <th>{t('requested_date')}</th>
              <th>{t('total')}</th>
              <th>{t('status')}</th>
              <th>{t('payment')}</th>
              <th>{t('delivery_partner')}</th>
              <th>{t('delivery_status')}</th>
              <th>{t('actions')}</th>
            </tr>
          </thead>
          <tbody>
            {orders.map(o => (
              <tr key={o.id}>
                <td>{o.id}</td>
                <td>{o.customer_name}</td>
                <td>{o.is_preorder ? t('preorder') : t('regular')}</td>
                <td>
                  {o.delivery_method === 'pickup' && t('pickup')}
                  {o.delivery_method === 'drop' && t('farmer_drop')}
                  {o.delivery_method === 'delivery' && t('delivery_partner')}
                </td>
                <td>{new Date(o.order_date).toLocaleDateString()}</td>
                <td>{o.preorder_date || '-'}</td>
                <td>₹{o.total_amount}</td>
                <td style={{ color: getStatusColor(o.status) }}>{o.status}</td>
                <td>{o.payment_status}</td>
                <td>{o.delivery_partner_name || t('not_assigned')}</td>
                <td>
                  {o.status === 'out_for_delivery' && t('out_for_delivery')}
                  {o.status === 'delivered' && t('delivered')}
                  {o.status === 'not_delivered' && t('not_delivered_with_remark', { remark: o.delivery_remark || t('no_remark') })}
                  {!['out_for_delivery','delivered','not_delivered'].includes(o.status) && '—'}
                </td>
                <td style={{ whiteSpace: 'nowrap' }}>
                  {o.delivery_method === 'drop' ? (
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <select
                        onChange={(e) => updateStatus(o.id, e.target.value)}
                        disabled={updating === o.id}
                        className="input"
                        style={{ width: '140px', padding: '4px 8px' }}
                      >
                        <option value="" disabled>{t('update_status')}</option>
                        <option value="confirmed">{t('confirmed')}</option>
                        <option value="shipped">{t('shipped')}</option>
                        <option value="out_for_delivery">{t('out_for_delivery')}</option>
                        <option value="delivered">{t('delivered')}</option>
                      </select>
                      
                      {o.status === 'shipped' && (
                        
                        <Button
                          variant="secondary"
                          size="small"
                          onClick={() => assignDeliveryPartner(o.id)}
                          disabled={assigning === o.id}
                        >
                          {assigning === o.id ? t('assigning') : t('assign_delivery_partner')}
                        </Button>
                      )}
                    </div>
                  ) : (
                    <>
                      <select
                        onChange={(e) => updateStatus(o.id, e.target.value)}
                        disabled={updating === o.id}
                        className="input"
                        style={{ width: '140px', padding: '4px 8px' }}
                      >
                        <option value="" disabled>{t('update_status')}</option>
                        <option value="confirmed">{t('confirmed')}</option>
                        <option value="shipped">{t('shipped')}</option>
                      </select>
                    </>
                  )}
                  {updating === o.id && <span style={{ marginLeft: '8px' }}>{t('updating')}</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default FarmerOrders;
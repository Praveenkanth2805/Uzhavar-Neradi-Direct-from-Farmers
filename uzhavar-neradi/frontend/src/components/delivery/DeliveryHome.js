import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Button from '../Button/Button';

const DeliveryHome = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [earnings, setEarnings] = useState(0);

useEffect(() => {
    const fetchEarnings = async () => {
        const res = await api.get('/delivery/stats/');
        setEarnings(res.data.total_earnings);
    };
    fetchEarnings();
}, []);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await api.get('/delivery/stats/');
      setStats(res.data);
    } catch (err) {
      console.error('Failed to fetch delivery stats', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="container mt-md text-center">{t('loading')}</div>;

  return (
    <div className="container mt-md">
      <h2>{t('delivery_overview')}</h2>

      {/* Key Metrics Cards */}
      <div className="flex gap-md wrap" style={{ marginBottom: 'var(--spacing-lg)' }}>
        <div className="metric-card">
          <h3>{t('total_assigned')}</h3>
          <p>{stats.total_assigned}</p>
        </div>
        <div className="metric-card">
          <h3>{t('delivered')}</h3>
          <p>{stats.delivered}</p>
        </div>
        <div className="metric-card">
          <h3>{t('out_for_delivery')}</h3>
          <p>{stats.out_for_delivery}</p>
        </div>
        <div className="metric-card">
          <h3>{t('not_delivered')}</h3>
          <p>{stats.not_delivered}</p>
        </div>
        <div className="metric-card">
    <h3>{t('total_earnings')}</h3>
    <p>₹{earnings}</p>
</div>
      </div>

      {/* Recent Deliveries */}
      <section className="mb-lg">
        <h3>{t('recent_deliveries')}</h3>
        {stats.recent_deliveries.length === 0 ? (
          <p>{t('no_recent_deliveries')}</p>
        ) : (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>{t('customer')}</th>
                  <th>{t('address')}</th>
                  <th>{t('status')}</th>
                  <th>{t('date')}</th>
                  </tr>
                </thead>
              <tbody>
                {stats.recent_deliveries.map(o => (
                  <tr key={o.id}>
                    <td>{o.id}</td>
                    <td>{o.customer}</td>
                    <td>{o.address}</td>
                    <td>{o.status}</td>
                    <td>{new Date(o.date).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Quick Actions */}
      <section>
        <h3>{t('quick_actions')}</h3>
        <div className="flex gap-md wrap">
          <Button variant="primary" onClick={() => navigate('/delivery/orders')}>
            {t('view_assigned_orders')}
          </Button>
          <Button variant="primary" onClick={() => navigate('/delivery/browse')}>
            {t('browse_products')}
          </Button>
          <Button variant="primary" onClick={() => navigate('/delivery/purchases')}>
            {t('my_purchases')}
          </Button>
          <Button variant="secondary" onClick={() => navigate('/delivery/profile')}>
            {t('update_profile')}
          </Button>
        </div>
      </section>
    </div>
  );
};

export default DeliveryHome;
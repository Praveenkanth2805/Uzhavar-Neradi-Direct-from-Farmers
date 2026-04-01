import React, { useState, useEffect } from 'react';
import { useCart } from '../../contexts/CartContext';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { QRCodeCanvas as QRCode } from 'qrcode.react';
import { toast } from 'react-toastify';
import GeoapifyAddressInput from '../GeoapifyAddressInput';
import Button from '../Button/Button';

const Checkout = () => {
  const { cart, getItemsByFarmer, getCartTotal, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [address, setAddress] = useState(user?.address || '');
  const [customerLat, setCustomerLat] = useState(user?.latitude || null);
  const [customerLng, setCustomerLng] = useState(user?.longitude || null);
  const [paymentMethod, setPaymentMethod] = useState('cod');
  const [loading, setLoading] = useState(false);
  const [ordersPlaced, setOrdersPlaced] = useState([]);
  const [upiDetails, setUpiDetails] = useState(null);
  const [deliveryMethods, setDeliveryMethods] = useState({});
  const [distances, setDistances] = useState({});
  const [calculating, setCalculating] = useState(false);
  const [calculated, setCalculated] = useState(false); // to prevent repeated calculations

  const ordersByFarmer = getItemsByFarmer();

  // Load user coordinates from profile on mount
  useEffect(() => {
    if (user?.latitude && user?.longitude) {
      setCustomerLat(user.latitude);
      setCustomerLng(user.longitude);
      if (user?.address) setAddress(user.address);
    }
  }, [user]);

  const handleDeliveryMethodChange = async (farmerId, method) => {
    // Update state
    setDeliveryMethods(prev => ({ ...prev, [farmerId]: method }));

    // If method is not pickup and we haven't calculated distance for this farmer yet, calculate now
    if (method !== 'pickup' && customerLat && customerLng && !distances[farmerId]) {
      setCalculating(true);
      try {
        const res = await api.post('/orders/calculate-distance/', {
          farmer_id: farmerId,
          customer_lat: customerLat,
          customer_lng: customerLng,
        });
        setDistances(prev => ({
          ...prev,
          [farmerId]: {
            distance: res.data.distance,
            fee: res.data.fee,
          },
        }));
      } catch (err) {
        console.error(`Failed to get distance for farmer ${farmerId}`, err);
        // Fallback: use flat fee from settings (we'll use the stored value; we'll fetch it once)
        const flatFee = await getFlatDeliveryFee();
        setDistances(prev => ({
          ...prev,
          [farmerId]: { distance: null, fee: flatFee },
        }));
        toast.warn(t('delivery_fee_unavailable'));
      } finally {
        setCalculating(false);
      }
    }
  };

  // Helper to fetch flat delivery fee from settings (cached)
  const getFlatDeliveryFee = async () => {
    if (window.flatDeliveryFee) return window.flatDeliveryFee;
    try {
      const res = await api.get('/admin/settings/?key=delivery_fee');
      const fee = res.data.find(s => s.key === 'delivery_fee')?.value;
      const flat = parseFloat(fee) || 0;
      window.flatDeliveryFee = flat;
      return flat;
    } catch (err) {
      return 0;
    }
  };

  const handlePlaceSelected = ({ address, lat, lng }) => {
    setAddress(address);
    setCustomerLat(parseFloat(lat.toFixed(6)));
    setCustomerLng(parseFloat(lng.toFixed(6)));
    // Reset distances because coordinates changed – user may need to recalc
    setDistances({});
  };

  const calculateTotal = () => {
    let total = getCartTotal();
    for (const group of ordersByFarmer) {
      const method = deliveryMethods[group.farmerId] || 'pickup';
      if (method !== 'pickup' && distances[group.farmerId]) {
        total += distances[group.farmerId].fee;
      }
    }
    return total;
  };

  const handlePlaceOrder = async () => {
    setLoading(true);
    const placedOrders = [];

    try {
      for (const group of ordersByFarmer) {
        const method = deliveryMethods[group.farmerId] || 'pickup';
        const subtotal = group.items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

        const orderData = {
          farmer: group.farmerId,
          items: group.items.map(item => ({
            product: item.product.id,
            quantity: item.quantity,
          })),
          delivery_address: address,
          payment_method: paymentMethod,
          total_amount: subtotal,
          delivery_method: method,
          customer_lat: customerLat,
          customer_lng: customerLng,
        };
        const res = await api.post('/orders/create/', orderData);
        placedOrders.push(res.data);
      }
      clearCart();
      setOrdersPlaced(placedOrders);
      if (paymentMethod === 'upi') {
        const firstFarmer = ordersByFarmer[0];
        setUpiDetails({
          upiId: firstFarmer.farmerUpiId,
          amount: calculateTotal(),
          orderId: placedOrders[0].id,
        });
      }
    } catch (err) {
      toast.error(t('order_failed'));
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (cart.items.length === 0) {
    navigate('/customer/cart');
    return null;
  }

  if (ordersPlaced.length > 0 && paymentMethod === 'cod') {
    return (
      <div className="container mt-md text-center">
        <h2>{t('order_confirmed')}</h2>
        <p>{t('order_success_cod')}</p>
        <Button variant="primary" onClick={() => navigate('/customer/orders')}>
          {t('view_orders')}
        </Button>
      </div>
    );
  }

  if (upiDetails) {
    const upiString = `upi://pay?pa=${upiDetails.upiId}&pn=Farmer&am=${upiDetails.amount}&cu=INR`;
    return (
      <div className="container mt-md text-center">
        <h2>{t('pay_with_upi')}</h2>
        <p>{t('scan_qr_or_use_upi_id')}</p>
        <QRCode value={upiString} size={200} />
        <p><strong>UPI ID:</strong> {upiDetails.upiId}</p>
        <p><strong>{t('amount')}:</strong> ₹{upiDetails.amount}</p>
        <p>{t('after_payment_click')}</p>
        <Button variant="primary" onClick={() => navigate('/customer/orders')}>
          {t('i_have_paid')}
        </Button>
      </div>
    );
  }

  return (
    <div className="container mt-md">
      <h2>{t('checkout')}</h2>
      <form onSubmit={(e) => { e.preventDefault(); handlePlaceOrder(); }}>
        <div className="mb-md">
          <label className="form-label">{t('delivery_address')}:</label>
          <GeoapifyAddressInput
            value={address}
            onChange={setAddress}
            onPlaceSelected={handlePlaceSelected}
          />
          {calculating && <span className="text-muted ml-sm">{t('calculating_distance')}</span>}
        </div>

        <div className="mb-md">
          <label className="form-label">{t('payment_method')}:</label>
          <select
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
            className="input"
            style={{ width: 'auto' }}
          >
            <option value="cod">Cash on Delivery</option>
            <option value="upi">UPI / QR</option>
          </select>
        </div>

        <h3>{t('order_summary')}</h3>
        {ordersByFarmer.map((group) => {
          const selectedMethod = deliveryMethods[group.farmerId] || 'pickup';
          const subtotal = group.items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
          return (
            <div key={group.farmerId} className="card mb-md">
              <h4 className="card-header">{t('farmer')}: {group.farmerName}</h4>
              <ul className="list-none p-0">
                {group.items.map(item => (
                  <li key={item.product.id} className="flex justify-between items-center">
                    <span>{item.product.name} x {item.quantity}</span>
                    <span>₹{item.product.price * item.quantity}</span>
                  </li>
                ))}
              </ul>
              <p><strong>{t('subtotal')}:</strong> ₹{subtotal}</p>
              <div className="flex items-center gap-sm">
                <label>{t('delivery_method')}:</label>
                <select
                  value={selectedMethod}
                  onChange={(e) => handleDeliveryMethodChange(group.farmerId, e.target.value)}
                  className="input"
                  style={{ width: 'auto' }}
                >
                  {group.enabledOptions?.pickup && <option value="pickup">{t('pickup')}</option>}
                  {group.enabledOptions?.drop && <option value="drop">{t('farmer_drop')}</option>}
                  {group.enabledOptions?.delivery && <option value="delivery">{t('delivery_partner')}</option>}
                </select>
              </div>
              {selectedMethod !== 'pickup' && distances[group.farmerId] && (
                <p className="mt-sm">
                  {distances[group.farmerId].distance !== null ? (
                    <>
                      {t('distance')}: {distances[group.farmerId].distance} km | {t('delivery_fee')}: ₹{distances[group.farmerId].fee}
                    </>
                  ) : (
                    <>
                      {t('flat_delivery_fee')}: ₹{distances[group.farmerId].fee}
                      <br />
                      <small>{t('delivery_fee_fallback_note')}</small>
                    </>
                  )}
                </p>
              )}
            </div>
          );
        })}

        <div className="flex justify-between items-center mt-lg">
          <h3>{t('total')}: ₹{calculateTotal()}</h3>
          <Button type="submit" variant="primary" disabled={loading}>
            {loading ? t('placing_order') : t('place_order')}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default Checkout;
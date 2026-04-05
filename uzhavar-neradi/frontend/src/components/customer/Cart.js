import React from 'react';
import { useCart } from '../../contexts/CartContext';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { useAuth } from '../../contexts/AuthContext';
import Button from '../Button/Button';

const Cart = () => {
  const { cart, removeFromCart, updateQuantity, getCartTotal } = useCart();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useTranslation();

  const getCheckoutPath = () => {
    if (user?.role === 'farmer') return '/farmer/checkout';
    if (user?.role === 'delivery') return '/delivery/checkout';
    return '/customer/checkout';
  };
  
  const handleRemove = (item) => {
    removeFromCart(item.product.id);
    toast.info(`${item.product.name} ${t('removed_from_cart')}`);
  };

  const handleQuantityChange = (productId, newQuantity, maxStock) => {
    if (newQuantity > maxStock) {
      toast.warn(t('stock_limit_warning', { maxStock }));
      return;
    }
    updateQuantity(productId, newQuantity);
  };

  const hasStockIssue = cart.items.some(item => item.quantity > item.product.stock);

  if (cart.items.length === 0) {
    return (
      <div className="container mt-md text-center">
        <h2>{t('cart')}</h2>
        <p>{t('cart_empty')}</p>
        <Button variant="primary" onClick={() => navigate('/customer/browse')}>
          {t('continue_shopping')}
        </Button>
      </div>
    );
  }

  return (
    <div className="container mt-md">
      <h2>{t('cart')}</h2>
      <div className="table-responsive">
        <table className="table">
          <thead>
            <tr>
              <th>{t('product')}</th>
              <th>{t('price')}</th>
              <th>{t('quantity')}</th>
              <th>{t('total')}</th>
              <th>{t('action')}</th>
            </tr>
          </thead>
          <tbody>
            {cart.items.map(item => {
              const stock = item.product.stock;
              const exceedsStock = item.quantity > stock;
              return (
                <tr key={item.product.id} className={exceedsStock ? 'table-warning' : ''}>
                  <td>
                    {item.product.name}
                    {exceedsStock && (
                      <span className="text-error ml-sm">
                        ({t('only_x_available', { count: stock })})
                      </span>
                    )}
                  </td>
                  <td>₹{item.product.price}</td>
                  <td>
                    <input
                      type="number"
                      min="1"
                      max={stock}
                      value={item.quantity}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 1;
                        handleQuantityChange(item.product.id, val, stock);
                      }}
                      className="input-quantity"
                    />
                  </td>
                  <td>₹{item.product.price * item.quantity}</td>
                  <td>
                    <Button variant="danger" onClick={() => handleRemove(item)}>
                      {t('remove')}
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex justify-between items-center mt-md">
        <h3>{t('total')}: ₹{getCartTotal()}</h3>
        {hasStockIssue && (
          <p className="text-error">{t('stock_issue_warning')}</p>
        )}
        <Button
  variant="primary"
  onClick={() => navigate(getCheckoutPath())}
  disabled={hasStockIssue}
>
          {hasStockIssue ? t('stock_issues') : t('proceed_to_checkout')}
        </Button>
      </div>
    </div>
  );
};

export default Cart;
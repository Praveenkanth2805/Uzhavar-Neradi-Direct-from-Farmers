import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import { useCart } from '../../contexts/CartContext';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Button from '../Button/Button';

const CustomerBrowseProducts = () => {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const { addToCart, clearCart } = useCart();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const getCheckoutPath = () => {
    if (user?.role === 'farmer') return '/farmer/checkout';
    if (user?.role === 'delivery') return '/delivery/checkout';
    return '/customer/checkout';
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const res = await api.get('/products/customer/products/');
      setProducts(res.data);
    } catch (err) {
      console.error('Failed to fetch products', err);
    }
  };

  const handlePreOrder = (product) => {
    clearCart();
    addToCart(product);
    navigate(getCheckoutPath());
  };

  const handleAddToCart = (product) => {
    addToCart(product);
    toast.success(`${product.name} ${t('added_to_cart')}`);
  };

  return (
    <div className="container mt-md">
      <h2>{t('browse_products')}</h2>
      <div className="flex flex-wrap gap-md">
        {products.map(p => (
          <div key={p.id} className="card" style={{ width: '250px' }}>
            {p.image_url ? (
              <img src={p.image_url} alt={p.name} className="product-image" />
            ) : (
              <div className="product-image-placeholder">No Image</div>
            )}
            <h3 className="mt-sm">{p.name}</h3>
            <p className="text-sm">{p.description}</p>
            <p>
              <strong>₹{p.price}</strong> / {p.stock} in stock
            </p>
            {p.is_preorder && (
              <p className="text-sm">
                {t('max_preorder')}: {p.preorder_max_quantity || t('unlimited')}
              </p>
            )}
            <p className="text-sm text-muted">Farmer: {p.farmer_name}</p>
            <div className="flex gap-sm mt-sm">
              {p.is_preorder && (
                <Button variant="accent" onClick={() => handlePreOrder(p)}>
                  {t('pre_order')}
                </Button>
              )}
              {p.stock > 0 && (
                <Button variant="primary" onClick={() => handleAddToCart(p)}>
                  {t('add_to_cart')}
                </Button>
              )}
              {!p.is_preorder && p.stock === 0 && (
                <span className="text-error">{t('out_of_stock')}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CustomerBrowseProducts;
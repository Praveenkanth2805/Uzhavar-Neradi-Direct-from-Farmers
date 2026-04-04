import React, { useState } from 'react';
import Button from './Button/Button';
import { useTranslation } from 'react-i18next';

const PreorderModal = ({ product, onConfirm, onCancel }) => {
  const { t } = useTranslation();
  const [quantity, setQuantity] = useState(1);
  const [preorderDate, setPreorderDate] = useState('');

  const handleSubmit = () => {
    if (quantity < 1) {
      alert(t('invalid_quantity'));
      return;
    }
    if (product.preorder_max_quantity && quantity > product.preorder_max_quantity) {
      alert(`Max quantity is ${product.preorder_max_quantity}`);
      return;
    }
    if (!preorderDate) {
      alert(t('please_select_preorder_date'));
      return;
    }
    onConfirm(quantity, preorderDate);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h3>{t('pre_order')}: {product.name}</h3>
        <div className="mb-sm">
          <label>{t('quantity')}:</label>
          <input
            type="number"
            min="1"
            max={product.preorder_max_quantity || 999}
            value={quantity}
            onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
            className="input"
          />
        </div>
        <div className="mb-sm">
          <label>{t('preorder_date')}:</label>
          <input
            type="date"
            value={preorderDate}
            onChange={(e) => setPreorderDate(e.target.value)}
            className="input"
            min={new Date().toISOString().split('T')[0]}
          />
        </div>
        <div className="flex gap-sm">
          <Button variant="primary" onClick={handleSubmit}>{t('confirm')}</Button>
          <Button variant="secondary" onClick={onCancel}>{t('cancel')}</Button>
        </div>
      </div>
    </div>
  );
};

export default PreorderModal;
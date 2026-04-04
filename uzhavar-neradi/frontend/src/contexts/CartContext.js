import React, { createContext, useContext, useReducer, useEffect } from 'react';

const CartContext = createContext();

const initialState = {
  items: [], // { product, quantity }
};

const cartReducer = (state, action) => {
  switch (action.type) {
    case 'ADD_ITEM': {
  const existing = state.items.find(item => item.product.id === action.payload.product.id);
  const newQuantity = action.payload.quantity || 1;
  const preorderDate = action.payload.preorderDate || null;
  if (existing) {
    // For preorder, we might want to replace or merge? Simpler: replace with new date.
    // We'll just update quantity and date.
    return {
      ...state,
      items: state.items.map(item =>
        item.product.id === action.payload.product.id
          ? { ...item, quantity: item.quantity + newQuantity, preorderDate: preorderDate || item.preorderDate }
          : item
      ),
    };
  }
  return {
    ...state,
    items: [...state.items, { product: action.payload.product, quantity: newQuantity, preorderDate }],
  };
}
    case 'REMOVE_ITEM':
      return {
        ...state,
        items: state.items.filter(item => item.product.id !== action.payload.productId),
      };
    case 'UPDATE_QUANTITY':
      return {
        ...state,
        items: state.items.map(item =>
          item.product.id === action.payload.productId
            ? { ...item, quantity: action.payload.quantity }
            : item
        ),
      };
    case 'CLEAR_CART':
      return initialState;
    default:
      return state;
  }
};

export const CartProvider = ({ children }) => {
  const [state, dispatch] = useReducer(cartReducer, initialState, () => {
    const local = localStorage.getItem('cart');
    return local ? JSON.parse(local) : initialState;
  });

  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(state));
  }, [state]);

  const addToCart = (product, quantity = 1) => {
  dispatch({ type: 'ADD_ITEM', payload: { product, quantity } });
};

  const removeFromCart = (productId) => {
    dispatch({ type: 'REMOVE_ITEM', payload: { productId } });
  };

  const updateQuantity = (productId, quantity) => {
    if (quantity < 1) return;
    dispatch({ type: 'UPDATE_QUANTITY', payload: { productId, quantity } });
  };

  const clearCart = () => {
    dispatch({ type: 'CLEAR_CART' });
  };

  const getCartTotal = () => {
    return state.items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  };
  
  const getItemsByFarmer = () => {
  const map = new Map();
  state.items.forEach(item => {
    const farmerId = item.product.farmer;
    if (!map.has(farmerId)) {
      map.set(farmerId, {
        farmerId: farmerId,
        farmerName: item.product.farmer_name,
        farmerUpiId: item.product.farmer_upi_id,
        farmerLat: item.product.farmer_lat,   // new
        farmerLng: item.product.farmer_lng,   // new
        items: [],
        enabledOptions: { pickup: true, drop: true, delivery: true }
      });
    }
    const group = map.get(farmerId);
    const prodOptions = item.product.delivery_options || { pickup: false, drop: false, delivery: false };
    group.enabledOptions.pickup = group.enabledOptions.pickup && prodOptions.pickup;
    group.enabledOptions.drop = group.enabledOptions.drop && prodOptions.drop;
    group.enabledOptions.delivery = group.enabledOptions.delivery && prodOptions.delivery;
    group.items.push(item);
  });
  return Array.from(map.values());
};

  return (
    <CartContext.Provider
      value={{
        cart: state,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        getCartTotal,
        getItemsByFarmer,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);
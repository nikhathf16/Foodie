import { createContext, useContext, useMemo, useState } from 'react';

const CartContext = createContext(null);
export function CartProvider({ children }) {
  const [items, setItems] = useState(() => JSON.parse(localStorage.getItem('foodie_cart') || '[]'));
  const save = (next) => { setItems(next); localStorage.setItem('foodie_cart', JSON.stringify(next)); };
  const add = (food) => {
    const existing = items.find(i => i.id === food.id);
    save(existing ? items.map(i => i.id === food.id ? { ...i, quantity: i.quantity + 1 } : i) : [...items, { ...food, quantity: 1 }]);
  };
  const update = (id, quantity) => save(quantity <= 0 ? items.filter(i => i.id !== id) : items.map(i => i.id === id ? { ...i, quantity } : i));
  const remove = (id) => save(items.filter(i => i.id !== id));
  const clear = () => save([]);
  const subtotal = useMemo(() => items.reduce((sum, i) => sum + i.price * i.quantity, 0), [items]);
  return <CartContext.Provider value={{ items, add, update, remove, clear, subtotal, count: items.reduce((n, i) => n + i.quantity, 0), delivery: items.length ? 40 : 0 }}>{children}</CartContext.Provider>;
}
export const useCart = () => useContext(CartContext);

const express = require('express');
const router = express.Router();
const { Product, Order, OrderItem } = require('../models');

function ensureAuth(req, res, next) {
  if (!req.session.user) return res.redirect('/login');
  next();
}

router.get('/', async (req, res) => {
  const cart = req.session.cart || {};
  const entries = [];
  for (const pid in cart) {
    const product = await Product.findByPk(pid);
    if (product) entries.push({ product, quantity: cart[pid] });
  }
  res.render('cart', { entries });
});

router.post('/add/:id', ensureAuth, async (req, res) => {
  const id = req.params.id;
  const product = await Product.findByPk(id);
  if (!product) return res.redirect('/products');
  req.session.cart = req.session.cart || {};
  req.session.cart[id] = (req.session.cart[id] || 0) + 1;
  req.flash('success', 'Añadido al carrito');
  res.redirect('/cart');
});

router.post('/increase/:id', async (req, res) => {
  const id = req.params.id;
  const product = await Product.findByPk(id);
  if (!product) return res.redirect('/cart');
  req.session.cart = req.session.cart || {};
  req.session.cart[id] = (req.session.cart[id] || 0) + 1;
  res.redirect('/cart');
});

router.post('/decrease/:id', async (req, res) => {
  const id = req.params.id;
  const cart = req.session.cart || {};
  if (cart[id] && cart[id] > 1) {
    cart[id]--;
    req.session.cart = cart;
  } else if (cart[id]) {
    delete cart[id];
    req.session.cart = cart;
  }
  res.redirect('/cart');
});

router.delete('/remove/:id', async (req, res) => {
  const id = req.params.id;
  const cart = req.session.cart || {};
  if (cart[id]) {
    delete cart[id];
    req.session.cart = cart;
    req.flash('success', 'Producto eliminado del carrito');
  }
  res.redirect('/cart');
});

router.post('/checkout', ensureAuth, async (req, res) => {
  const cart = req.session.cart || {};
  if (Object.keys(cart).length === 0) {
    req.flash('error', 'Carrito vacío');
    return res.redirect('/cart');
  }
  let total = 0;
  const items = [];
  for (const pid in cart) {
    const product = await Product.findByPk(pid);
    if (!product) continue;
    const qty = cart[pid];
    if (product.quantity < qty) {
      req.flash('error', `Inventario insuficiente para ${product.title}`);
      return res.redirect('/cart');
    }
    total += product.price * qty;
    items.push({ product, qty });
  }
  const order = await Order.create({ userId: req.session.user.id, total, status: 'paid' });
  for (const it of items) {
    await OrderItem.create({ orderId: order.id, productId: it.product.id, quantity: it.qty, price: it.product.price });
    // decrement inventory
    await it.product.decrement('quantity', { by: it.qty });
  }
  req.session.cart = {};
  req.flash('success', 'Reserva confirmada');
  res.redirect('/');
});

module.exports = router;

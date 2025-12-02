const express = require('express');
const router = express.Router();
const { User, Product, Order, OrderItem } = require('../models');

function ensureAdmin(req, res, next) {
  const u = req.session.user;
  if (!u || u.role !== 'admin') {
    req.flash('error', 'Acceso denegado');
    return res.redirect('/');
  }
  next();
}

router.get('/', ensureAdmin, async (req, res) => {
  const users = await User.findAll();
  const products = await Product.findAll();
  const orders = await Order.findAll();
  res.render('admin', { users, products, orders });
});

module.exports = router;

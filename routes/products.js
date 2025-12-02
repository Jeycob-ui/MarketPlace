const express = require('express');
const router = express.Router();
const { Product } = require('../models');

function ensureAuth(req, res, next) {
  if (!req.session.user) return res.redirect('/login');
  next();
}

function ensureVendorOrAdmin(req, res, next) {
  const u = req.session.user;
  if (!u) return res.redirect('/login');
  if (u.role === 'vendor' || u.role === 'admin') return next();
  req.flash('error', 'No autorizado');
  res.redirect('/');
}

router.get('/', async (req, res) => {
  const products = await Product.findAll();
  res.render('products', { products });
});

router.get('/new', ensureVendorOrAdmin, (req, res) => res.render('product_form', { product: {} }));

router.post('/', ensureVendorOrAdmin, async (req, res) => {
  const { title, description, price, quantity } = req.body;
  try {
    await Product.create({ title, description, price: parseFloat(price || 0), quantity: parseInt(quantity || 0), userId: req.session.user.id });
    req.flash('success', 'Producto creado');
    res.redirect('/products');
  } catch (err) {
    req.flash('error', 'Error: ' + err.message);
    res.redirect('/products/new');
  }
});

router.get('/:id', async (req, res) => {
  const product = await Product.findByPk(req.params.id);
  if (!product) return res.status(404).send('No encontrado');
  res.render('product_form', { product, viewOnly: true });
});

router.get('/:id/edit', ensureVendorOrAdmin, async (req, res) => {
  const product = await Product.findByPk(req.params.id);
  res.render('product_form', { product });
});

router.put('/:id', ensureVendorOrAdmin, async (req, res) => {
  const product = await Product.findByPk(req.params.id);
  if (!product) return res.redirect('/products');
  const { title, description, price, quantity } = req.body;
  await product.update({ title, description, price: parseFloat(price || 0), quantity: parseInt(quantity || 0) });
  req.flash('success', 'Producto actualizado');
  res.redirect('/products');
});

router.delete('/:id', ensureVendorOrAdmin, async (req, res) => {
  const product = await Product.findByPk(req.params.id);
  if (product) await product.destroy();
  req.flash('success', 'Producto eliminado');
  res.redirect('/products');
});

module.exports = router;

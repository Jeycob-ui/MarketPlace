const express = require('express');
const router = express.Router();
const { Product } = require('../models');
const { Op } = require('sequelize');

function ensureAuth(req, res, next) {
  if (!req.session.user) return res.redirect('/login');
  next();
}

function ensureVendorOrAdmin(req, res, next) {
  const u = req.session.user;
  if (!u) return res.redirect('/login');
  if (u.role === 'vendedor' || u.role === 'admin') return next();
  req.flash('error', 'Necesitas ser vendedor o administrador');
  res.redirect('/');
}

router.get('/', async (req, res) => {
  try {
    const { q, minPrice, maxPrice, available, sort } = req.query;
    const where = {};

    if (q) {
      const like = { [Op.like]: `%${q}%` };
      where[Op.or] = [{ title: like }, { description: like }];
    }

    // Interpret minPrice/maxPrice inputs as COP (pesos colombianos)
    // Convert them to USD (DB price) using the configured rate
    if (minPrice) {
      const n = parseFloat(minPrice);
      if (!isNaN(n)) {
        const { copToUsd } = require('../helpers/currency');
        const usd = copToUsd(n);
        where.price = { ...(where.price || {}), [Op.gte]: usd };
      }
    }
    if (maxPrice) {
      const n = parseFloat(maxPrice);
      if (!isNaN(n)) {
        const { copToUsd } = require('../helpers/currency');
        const usd = copToUsd(n);
        where.price = { ...(where.price || {}), [Op.lte]: usd };
      }
    }

    if (available === '1' || available === 'true') {
      where.quantity = { [Op.gt]: 0 };
    }

    const order = [];
    if (sort === 'price_asc') order.push(['price', 'ASC']);
    else if (sort === 'price_desc') order.push(['price', 'DESC']);
    else if (sort === 'newest') order.push(['id', 'DESC']);
    else if (sort === 'oldest') order.push(['id', 'ASC']);
    else order.push(['id', 'DESC']);

    const products = await Product.findAll({ where, order });
    res.render('products', { products, query: req.query });
  } catch (err) {
    req.flash('error', 'Error buscando productos: ' + err.message);
    const products = await Product.findAll();
    res.render('products', { products, query: {} });
  }
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

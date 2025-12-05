const path = require('path');
const express = require('express');
const session = require('express-session');
const flash = require('connect-flash');
const methodOverride = require('method-override');
require('dotenv').config();

const bcrypt = require('bcryptjs');
const { sequelize, User, Product, Order, OrderItem } = require('./models');
const { Op } = require('sequelize');
const { copToUsd } = require('./helpers/currency');

const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const cartRoutes = require('./routes/cart');
const adminRoutes = require('./routes/admin');
const notificationsRoutes = require('./routes/notifications');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride('_method'));

app.use(session({ secret: process.env.SESSION_SECRET || 'secret', resave: false, saveUninitialized: false }));
app.use(flash());

// user in templates
app.use((req, res, next) => {
  res.locals.currentUser = req.session.user || null;
  res.locals.messages = req.flash();
  next();
});

app.use('/', authRoutes);
app.use('/products', productRoutes);
app.use('/cart', cartRoutes);
app.use('/admin', adminRoutes);

// Helpers disponibles en vistas
const { formatCOP } = require('./helpers/currency');
app.locals.formatCOP = formatCOP;
app.use('/notifications', notificationsRoutes);

app.get('/', async (req, res) => {
  try {
    const { q, minPrice, maxPrice, available, sort } = req.query || {};
    const where = {};

    if (q) {
      const like = { [Op.like]: `%${q}%` };
      where[Op.or] = [{ title: like }, { description: like }];
    }

    if (minPrice) {
      const n = parseFloat(minPrice);
      if (!isNaN(n)) where.price = { ...(where.price || {}), [Op.gte]: copToUsd(n) };
    }
    if (maxPrice) {
      const n = parseFloat(maxPrice);
      if (!isNaN(n)) where.price = { ...(where.price || {}), [Op.lte]: copToUsd(n) };
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

    const products = await Product.findAll({ where, order, limit: 12 });
    res.render('index', { products, query: req.query });
  } catch (err) {
    console.error('Error loading index products', err);
    const products = await Product.findAll({ limit: 12 });
    res.render('index', { products, query: {} });
  }
});

async function start() {
  try {
    await sequelize.sync({ alter: true });
    // create default admin if none
    const admin = await User.findOne({ where: { role: 'admin' } });
    if (!admin) {
      const hash = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'admin', 10);
      await User.create({ name: 'admin', email: 'admin@example.com', passwordHash: hash, role: 'admin' });
      console.log('Admin user created with email admin@example.com and password from ADMIN_PASSWORD or "admin" (change in prod)');
    }
    app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
  } catch (err) {
    console.error('Failed to start app', err);
  }
}

start();
// Express `app.listen` en `start()` maneja el servidor. Se eliminó el servidor
// HTTP duplicado que devolvía "Hola desde Node.js".

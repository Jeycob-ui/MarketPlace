const path = require('path');
const express = require('express');
const session = require('express-session');
const flash = require('connect-flash');
const methodOverride = require('method-override');
require('dotenv').config();

const bcrypt = require('bcryptjs');
const { sequelize, User, Product, Order, OrderItem } = require('./models');

const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const cartRoutes = require('./routes/cart');
const adminRoutes = require('./routes/admin');

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

app.get('/', async (req, res) => {
  const products = await Product.findAll({ limit: 12 });
  res.render('index', { products });
});

async function start() {
  try {
    await sequelize.sync();
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

const express = require('express');
const router = express.Router();
const multer = require('multer');
const { Product, Category } = require('../models');
const { Op } = require('sequelize');

// Configurar multer para capturar imágenes
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

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
    const { q, minPrice, maxPrice, available, sort, categoryId } = req.query;
    const where = {};

    if (q) {
      const like = { [Op.like]: `%${q}%` };
      where[Op.or] = [{ title: like }, { description: like }];
    }

    // Filtrar por categoría
    if (categoryId) {
      where.categoryId = categoryId;
    }

    // Interpret minPrice/maxPrice inputs as COP (pesos colombianos)
    if (minPrice) {
      const n = parseFloat(minPrice);
      if (!isNaN(n)) {
        where.price = { ...(where.price || {}), [Op.gte]: n };
      }
    }
    if (maxPrice) {
      const n = parseFloat(maxPrice);
      if (!isNaN(n)) {
        where.price = { ...(where.price || {}), [Op.lte]: n };
      }
    }

    if (available === '1' || available === 'true') {
      where.quantity = { [Op.gt]: 0 };
    }

    // Solo mostrar productos activos en el listado público
    // Si es admin, mostrar todos
    if (!(req.session && req.session.user && req.session.user.role === 'admin')) {
      where.active = true;
    }

    const order = [];
    if (sort === 'price_asc') order.push(['price', 'ASC']);
    else if (sort === 'price_desc') order.push(['price', 'DESC']);
    else if (sort === 'newest') order.push(['id', 'DESC']);
    else if (sort === 'oldest') order.push(['id', 'ASC']);
    else order.push(['id', 'DESC']);

    const products = await Product.findAll({ where, order, include: [{ model: Category }] });
    const categories = await Category.findAll();
    res.render('products', { products, categories, query: req.query });
  } catch (err) {
    req.flash('error', 'Error buscando productos: ' + err.message);
    const fallbackWhere = { active: true };
    const products = await Product.findAll({ where: fallbackWhere, include: [{ model: Category }] });
    const categories = await Category.findAll();
    res.render('products', { products, categories, query: {} });
  }
});

// Formulario para crear producto (debe estar antes de las rutas con :id)
router.get('/new', ensureVendorOrAdmin, async (req, res) => {
  const categories = await Category.findAll();
  res.render('product_form', { product: {}, categories });
});
router.post('/', ensureVendorOrAdmin, upload.single('image'), async (req, res) => {
  const { title, description, price, quantity, categoryId } = req.body;
  try {
    let imageBase64 = null;
    let imageMimeType = 'image/jpeg';
    if (req.file) {
      imageBase64 = req.file.buffer.toString('base64');
      imageMimeType = req.file.mimetype || 'image/jpeg';
    }
    await Product.create({ 
      title, 
      description, 
      price: parseFloat(price || 0), 
      quantity: parseInt(quantity || 0), 
      userId: req.session.user.id,
      image: imageBase64,
      imageMimeType,
      categoryId: categoryId ? parseInt(categoryId) : null
    });
    req.flash('success', 'Producto creado');
    res.redirect('/products');
  } catch (err) {
    req.flash('error', 'Error: ' + err.message);
    res.redirect('/products/new');
  }
});

router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id, {
      include: [{ model: require('../models').User }]
    });
    if (!product) {
      return res.status(404).send('Producto no encontrado');
    }

    // Si el producto está inactivo, no mostrarlo públicamente
    const isAdmin = req.session && req.session.user && req.session.user.role === 'admin';
    const isOwner = req.session && req.session.user && req.session.user.id === product.userId;
    if (!product.active && !isAdmin && !isOwner) {
      return res.status(404).send('Producto no encontrado');
    }

    res.render('product_form', { product, viewOnly: true });
  } catch (err) {
    console.error('Error al obtener producto:', err);
    res.status(500).send('Error al cargar el producto');
  }
});
router.get('/:id/edit', ensureVendorOrAdmin, async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id);
    const categories = await Category.findAll();
    if (!product) {
      req.flash('error', 'Producto no encontrado');
      return res.redirect('/products');
    }
    
    // Validar que el vendedor solo pueda editar sus propios productos
    if (req.session.user.role === 'vendedor' && product.userId !== req.session.user.id) {
      req.flash('error', 'No tienes permiso para editar este producto');
      return res.redirect('/products');
    }
    
    res.render('product_form', { product, categories });
  } catch (err) {
    req.flash('error', 'Error al cargar el producto: ' + err.message);
    res.redirect('/products');
  }
});
router.post('/:id/update', ensureVendorOrAdmin, upload.single('image'), async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id);
    if (!product) {
      req.flash('error', 'Producto no encontrado');
      return res.redirect('/products');
    }
    
    // Validar que el vendedor solo pueda editar sus propios productos
    if (req.session.user.role === 'vendedor' && product.userId !== req.session.user.id) {
      req.flash('error', 'No tienes permiso para editar este producto');
      return res.redirect('/products');
    }
    
    const { title, description, price, quantity, categoryId } = req.body;
    let imageBase64 = product.image;
    let imageMimeType = product.imageMimeType || 'image/jpeg';
    if (req.file) {
      imageBase64 = req.file.buffer.toString('base64');
      imageMimeType = req.file.mimetype || 'image/jpeg';
    }
    await product.update({ 
      title, 
      description, 
      price: parseFloat(price || 0), 
      quantity: parseInt(quantity || 0),
      image: imageBase64,
      imageMimeType,
      categoryId: categoryId ? parseInt(categoryId) : null
    });
    req.flash('success', 'Producto actualizado');
    res.redirect('/products');
  } catch (err) {
    req.flash('error', 'Error al actualizar: ' + err.message);
    res.redirect(`/products/${req.params.id}/edit`);
  }
});

router.put('/:id', ensureVendorOrAdmin, upload.single('image'), async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id);
    if (!product) {
      req.flash('error', 'Producto no encontrado');
      return res.redirect('/products');
    }
    
    // Validar que el vendedor solo pueda editar sus propios productos
    if (req.session.user.role === 'vendedor' && product.userId !== req.session.user.id) {
      req.flash('error', 'No tienes permiso para editar este producto');
      return res.redirect('/products');
    }
    
    const { title, description, price, quantity, categoryId } = req.body;
    let imageBase64 = product.image;
    let imageMimeType = product.imageMimeType || 'image/jpeg';
    if (req.file) {
      imageBase64 = req.file.buffer.toString('base64');
      imageMimeType = req.file.mimetype || 'image/jpeg';
    }
    await product.update({ 
      title, 
      description, 
      price: parseFloat(price || 0), 
      quantity: parseInt(quantity || 0),
      image: imageBase64,
      imageMimeType,
      categoryId: categoryId ? parseInt(categoryId) : null
    });
    req.flash('success', 'Producto actualizado');
    res.redirect('/products');
  } catch (err) {
    req.flash('error', 'Error al actualizar: ' + err.message);
    res.redirect(`/products/${req.params.id}/edit`);
  }
});

router.delete('/:id', ensureVendorOrAdmin, async (req, res) => {
  const product = await Product.findByPk(req.params.id);
  if (product) await product.destroy();
  req.flash('success', 'Producto eliminado');
  res.redirect('/products');
});

module.exports = router;

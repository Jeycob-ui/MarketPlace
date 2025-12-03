const express = require('express');
const router = express.Router();
const usuarioController = require('../controllers/usuarioController');

router.get('/register', usuarioController.formularioRegistro);
router.post('/register', usuarioController.registrar);

router.get('/login', usuarioController.formularioLogin);
router.post('/login', usuarioController.autenticar);

router.get('/logout', usuarioController.cerrarSesion);

module.exports = router;

// server.js
require('dotenv').config();        // Carga variables desde .env
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();
const PORT = process.env.PORT || 3000;

// ----------  Configuración de CORS   ----------
app.use(cors({
  origin: 'https://talo100uraba.github.io', // tu dominio de GitHub Pages
  methods: ['GET','POST','PUT','DELETE'],
  allowedHeaders: ['Content-Type','Authorization'],
  credentials: true
}));

// ----------  Middleware para parsear JSON con límite aumentado a 10mb  ----------
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// ----------  Conexión a MongoDB Atlas  ----------
const MONGODB_URI = process.env.MONGODB_URI;
mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('✅ Conectado a MongoDB Atlas'))
.catch(err => {
  console.error('❌ Error al conectar a MongoDB:', err);
  process.exit(1);
});

// ----------  Variables de entorno  ----------
const JWT_SECRET          = process.env.JWT_SECRET;
const JWT_EXPIRATION      = process.env.JWT_EXPIRATION || '1h';
const ADMIN_USERNAME      = process.env.ADMIN_USERNAME;
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH;

// ----------  Importar modelo de Producto  ----------
const Product = require('./models/Product');

// ----------  Ruta de prueba  ----------
app.get('/', (req, res) => {
  res.send('Servidor TALØ Admin activo.');
});

// ==============================
// ===   RUTA POST /login   ====
// ==============================
app.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Faltan credenciales.' });
    }

    if (username !== ADMIN_USERNAME) {
      return res.status(401).json({ error: 'Usuario o contraseña inválidos.' });
    }

    const match = await bcrypt.compare(password, ADMIN_PASSWORD_HASH);
    if (!match) {
      return res.status(401).json({ error: 'Usuario o contraseña inválidos.' });
    }

    const payload = { user: username, role: 'admin' };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRATION });
    res.json({ token });
  } catch (error) {
    console.error('Error en /login:', error);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

// =================================================
// ===  Middleware para verificar JWT en rutas  ====
// =================================================
function verifyJWT(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    return res.status(401).json({ error: 'Falta token de autorización.' });
  }

  const tokenParts = authHeader.split(' ');
  if (tokenParts.length !== 2 || tokenParts[0] !== 'Bearer') {
    return res.status(401).json({ error: 'Formato de token inválido.' });
  }

  const token = tokenParts[1];
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).json({ error: 'Token inválido o expirado.' });
    }
    req.user = decoded; // guardamos el payload en req.user
    next();
  });
}

// =================================================
// ===     Ejemplo de ruta protegida /api/test   ===
// =================================================
app.get('/api/test', verifyJWT, (req, res) => {
  res.json({ message: 'Acceso concedido a ruta protegida.', user: req.user });
});

// =================================================
// ===    RUTAS CRUD PARA “PRODUCTS” (PROTEGIDAS)  ===
// =================================================

// Obtener todos los productos (público)
app.get('/api/products', async (req, res) => {
  try {
    const products = await Product.find().sort({ fechaCreacion: -1 });
    res.json(products);
  } catch (err) {
    console.error('Error al obtener productos:', err);
    res.status(500).json({ error: 'Error al obtener productos.' });
  }
});

// Obtener un producto por ID (público)
app.get('/api/products/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ error: 'Producto no encontrado.' });
    }
    res.json(product);
  } catch (err) {
    console.error('Error al obtener producto:', err);
    res.status(500).json({ error: 'Error al obtener producto.' });
  }
});

// Crear un nuevo producto (requiere JWT)
app.post('/api/products', verifyJWT, async (req, res) => {
  try {
    // Ahora extraemos también promo y categoria
    const { nombre, descripcion, precio, imagenes, colores, tallas, promo, categoria } = req.body;

    // Validar campos obligatorios: nombre, precio y categoría
    if (!nombre || precio == null || !categoria) {
      return res.status(400).json({ error: 'Falta nombre, precio o categoría.' });
    }

    const nuevoProducto = new Product({
      nombre,
      descripcion: descripcion || '',
      precio,
      imagenes: imagenes || [],
      colores: colores || [],
      tallas: tallas || [],
      promo: promo || '',
      categoria
    });

    const productoGuardado = await nuevoProducto.save();
    res.status(201).json(productoGuardado);
  } catch (err) {
    console.error('Error al crear producto:', err);
    res.status(500).json({ error: 'Error al crear producto.' });
  }
});

// Actualizar un producto existente (requiere JWT)
app.put('/api/products/:id', verifyJWT, async (req, res) => {
  try {
    const { id } = req.params;
    // También extraemos promo y categoria para que puedan editarse
    const { nombre, descripcion, precio, imagenes, colores, tallas, promo, categoria } = req.body;

    // Validar que categoría esté presente (o dejar que sea la misma)
    if (!nombre || precio == null || !categoria) {
      return res.status(400).json({ error: 'Falta nombre, precio o categoría.' });
    }

    const productoActualizado = await Product.findByIdAndUpdate(
      id,
      { nombre, descripcion, precio, imagenes, colores, tallas, promo, categoria },
      { new: true, runValidators: true }
    );

    if (!productoActualizado) {
      return res.status(404).json({ error: 'Producto no encontrado.' });
    }

    res.json(productoActualizado);
  } catch (err) {
    console.error('Error al actualizar producto:', err);
    res.status(500).json({ error: 'Error al actualizar producto.' });
  }
});

// Eliminar un producto (requiere JWT)
app.delete('/api/products/:id', verifyJWT, async (req, res) => {
  try {
    const { id } = req.params;
    const productoEliminado = await Product.findByIdAndDelete(id);

    if (!productoEliminado) {
      return res.status(404).json({ error: 'Producto no encontrado.' });
    }

    res.json({ message: 'Producto eliminado correctamente.' });
  } catch (err) {
    console.error('Error al eliminar producto:', err);
    res.status(500).json({ error: 'Error al eliminar producto.' });
  }
});

// ============================================
// ===    RUTA GET /api/promociones   ========
// ============================================
// Devuelve todos los productos cuyo campo `promo` no esté vacío.
app.get('/api/promociones', async (req, res) => {
  try {
    // Buscamos en la colección Product todos los que tengan un valor válido en `promo`
    const promociones = await Product.find({ promo: { $exists: true, $ne: "" } }).sort({ fechaCreacion: -1 });
    res.json(promociones);
  } catch (err) {
    console.error('Error al obtener promociones:', err);
    res.status(500).json({ error: 'Error al obtener promociones.' });
  }
});

// ================================================
// ===    RUTA POST /api/promociones (opcional) ===
// ================================================
// Si prefieres un endpoint dedicado para crear promociones, puedes usarlo.
// Requiere JWT para validar que solo Admin las agregue.
app.post('/api/promociones', verifyJWT, async (req, res) => {
  try {
    // Esperamos: nombre, descripcion, precio, imagenes, colores, tallas, promo (obligatorio), y opcionalmente categoria
    const { nombre, descripcion, precio, imagenes, colores, tallas, promo, categoria } = req.body;

    // Validar campos mínimos
    if (!nombre || precio == null || !promo) {
      return res.status(400).json({ error: 'Falta nombre, precio o promo.' });
    }
    // Convertir promo a número y verificar
    const promoInt = parseInt(promo);
    if (isNaN(promoInt)) {
      return res.status(400).json({ error: 'El campo promo debe ser un número válido.' });
    }

    const nuevaPromocion = new Product({
      nombre,
      descripcion: descripcion || '',
      precio,
      imagenes: imagenes || [],
      colores: colores || [],
      tallas: tallas || [],
      promo: promoInt,
      // Si no se envía categoría, podemos asignar "promociones" por defecto
      categoria: categoria || 'promociones'
    });

    const promocionGuardada = await nuevaPromocion.save();
    res.status(201).json(promocionGuardada);
  } catch (err) {
    console.error('Error al crear promoción:', err);
    res.status(500).json({ error: 'Error al crear promoción.' });
  }
});

// =======================
// ===  LEVANTAR SERVIDOR ===
// =======================
app.listen(PORT, () => {
  console.log(`Servidor TALØ Admin corriendo en puerto ${PORT}`);
  console.log(`POST http://localhost:${PORT}/login   para obtener token JWT`);
});

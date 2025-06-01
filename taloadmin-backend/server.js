// server.js
require('dotenv').config();        // Carga variables desde .env
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const mongoose = require('mongoose');    // ──────── (NUEVO) Importar mongoose

const app = express();
const PORT = process.env.PORT || 3000;

// ----------  Configuración de CORS   ----------
// En producción, reemplaza origin: true por tu dominio de GitHub Pages:
// origin: 'https://talo100uraba.github.io'
app.use(cors({
  origin: 'https://talo100uraba.github.io', // tu dominio de GitHub Pages
  methods: ['GET','POST','PUT','DELETE'],
  allowedHeaders: ['Content-Type','Authorization'],
  credentials: true
}));

// ----------  Middleware para parsear JSON  ----------
app.use(express.json());

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
const JWT_SECRET         = process.env.JWT_SECRET;
const JWT_EXPIRATION     = process.env.JWT_EXPIRATION || '1h';
const ADMIN_USERNAME     = process.env.ADMIN_USERNAME;
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
// Recibe { username, password } en el body.
// Comprueba que username === ADMIN_USERNAME y que password coincida con el hash.
// Si OK, genera un JWT; si no, 401.
app.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Faltan credenciales.' });
    }

    // 1) Verificar que sea el admin correcto
    if (username !== ADMIN_USERNAME) {
      return res.status(401).json({ error: 'Usuario o contraseña inválidos.' });
    }

    // 2) Comparar la contraseña con el hash
    const match = await bcrypt.compare(password, ADMIN_PASSWORD_HASH);
    if (!match) {
      return res.status(401).json({ error: 'Usuario o contraseña inválidos.' });
    }

    // 3) Crear payload del JWT
    const payload = {
      user: username,
      role: 'admin'
    };

    // 4) Firmar el token
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRATION });

    // 5) Devolver token
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
// ===    RUTAS CRUD PARA “PRODUCTS” (protegidas)   ===
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
    const { nombre, descripcion, precio, imagenes, colores, tallas } = req.body;
    if (!nombre || precio == null) {
      return res.status(400).json({ error: 'Falta nombre o precio.' });
    }

    const nuevoProducto = new Product({
      nombre,
      descripcion: descripcion || '',
      precio,
      imagenes: imagenes || [],
      colores: colores || [],
      tallas: tallas || []
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
    const { nombre, descripcion, precio, imagenes, colores, tallas } = req.body;

    const productoActualizado = await Product.findByIdAndUpdate(
      id,
      { nombre, descripcion, precio, imagenes, colores, tallas },
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

// =======================
// ===  LEVANTAR SERVIDOR ===
// =======================
app.listen(PORT, () => {
  console.log(`Servidor TALØ Admin corriendo en puerto ${PORT}`);
  console.log(`POST http://localhost:${PORT}/login   para obtener token JWT`);
});

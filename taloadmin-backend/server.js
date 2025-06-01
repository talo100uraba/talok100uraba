// server.js
require('dotenv').config();   // Carga variables desde .env
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// ----------  Configuración de CORS   ----------
// Ajusta el origen (origin) a tu dominio o localhost según corresponda.
// Ej: front y back en la misma máquina: "http://localhost:5500"
app.use(cors({
  origin: true,     // para desarrollo permitir cualquier origen
  // O bien: origin: "http://localhost:5500"
  methods: ['GET','POST','PUT','DELETE'],
  credentials: true
}));

// ----------  Middleware para parsear JSON  ----------
app.use(express.json());

// ----------  Variables de entorno  ----------
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRATION = process.env.JWT_EXPIRATION || '1h';
const ADMIN_USERNAME = process.env.ADMIN_USERNAME;
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH;

// ----------  Ruta de prueba  ----------
app.get('/', (req, res) => {
  res.send('Servidor TALØ Admin activo.');
});

// ==============================
// ===   RUTA POST /login   ====
// ==============================
// Recibe { username, password } en el body.
// Comprueba que `username === ADMIN_USERNAME` y
// luego compara `password` con `ADMIN_PASSWORD_HASH` usando bcrypt.
// Si todo coincide, genera un JWT y lo envía al cliente.
// Si no, responde con 401 Unauthorized.
app.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Faltan credenciales.' });
    }

    // 1) Verificar usuario
    if (username !== ADMIN_USERNAME) {
      return res.status(401).json({ error: 'Usuario o contraseña inválidos.' });
    }

    // 2) Verificar contraseña usando bcrypt.compare
    const match = await bcrypt.compare(password, ADMIN_PASSWORD_HASH);
    if (!match) {
      return res.status(401).json({ error: 'Usuario o contraseña inválidos.' });
    }

    // 3) Creamos payload del JWT (puede incluir solo el username o también un rol)
    const payload = {
      user: username,
      role: 'admin',
    };

    // 4) Firmar el token
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRATION });

    // 5) Devolver al cliente el token (en JSON)
    res.json({ token });

  } catch (error) {
    console.error('Error en /login:', error);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

// =================================================
// ===  Middleware para verificar JWT en rutas  ====
// =================================================
// Función que extrae el Bearer token del header
function verifyJWT(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return res.status(401).json({ error: 'Falta token de autorización.' });

  const tokenParts = authHeader.split(' ');
  if (tokenParts.length !== 2 || tokenParts[0] !== 'Bearer') {
    return res.status(401).json({ error: 'Formato de token inválido.' });
  }

  const token = tokenParts[1];
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).json({ error: 'Token inválido o expirado.' });
    }
    // Guardamos el payload en el req para uso posterior
    req.user = decoded;
    next();
  });
}

// =================================================
// ===     Ejemplo de ruta protegida /api/test   ===
// =================================================
// Solo para probar si el token funciona.  
app.get('/api/test', verifyJWT, (req, res) => {
  res.json({ message: 'Acceso concedido a ruta protegida.', user: req.user });
});

// =================================================
// ===  Aquí podrías añadir tus propias rutas CRUD  ===
// ===  por ejemplo, /api/products (GET, POST,    ===
// ===  PUT, DELETE) y en cada una aplicas verifyJWT ===
// =================================================

// =======================
// ===  LEVANTAR SERVIDOR ===
// =======================
app.listen(PORT, () => {
  console.log(`Servidor TALØ Admin corriendo en puerto ${PORT}`);
  console.log(`POST http://localhost:${PORT}/login   para obtener token JWT`);
});

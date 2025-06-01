const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
  nombre: {
    type: String,
    required: true,
    trim: true
  },
  descripcion: {
    type: String,
    default: ''
  },
  precio: {
    type: Number,
    required: true,
    min: 0
  },
  imagenes: {
    type: [String],       // Array de URLs o rutas de imagen
    default: []
  },
  colores: {
    type: [String],       // Array de nombres de colores
    default: []
  },
  tallas: {
    type: [String],       // Array de tallas disponibles
    default: []
  },
  fechaCreacion: {
    type: Date,
    default: Date.now
  }
}, {
  versionKey: false        // Para no incluir el campo "__v"
});

module.exports = mongoose.model('Product', ProductSchema);

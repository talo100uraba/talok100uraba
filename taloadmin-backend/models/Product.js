// /models/Product.js

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
    type: [String],
    default: []
  },
  colores: {
    type: [String],
    default: []
  },
  tallas: {
    type: [String],
    default: []
  },
  promo: {
    type: String,      // Porcentaje de descuento, ej. "10" para 10% OFF
    default: ''
  },
  categoria: {
    type: String,      // Ej. "camisas", "shorts", "gorras", "lociones", "promociones"
    required: true,
    trim: true
  },
  fechaCreacion: {
    type: Date,
    default: Date.now
  }
}, {
  versionKey: false
});

module.exports = mongoose.model('Product', ProductSchema);

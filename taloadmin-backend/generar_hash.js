// generar_hash.js
// Uso: `node generar_hash.js TuContraseñaAquí`
const bcrypt = require('bcrypt');

// Puedes aumentar SALT_ROUNDS para mayor seguridad (coste más alto)
const SALT_ROUNDS = 12;

async function main() {
  const argv = process.argv;
  if (argv.length < 3) {
    console.error("Uso: node generar_hash.js <ContraseñaEnTextoPlano>");
    process.exit(1);
  }
  const password = argv[2];
  try {
    const salt = await bcrypt.genSalt(SALT_ROUNDS);
    const hash = await bcrypt.hash(password, salt);
    console.log(`Hash bcrypt de "${password}":\n\n${hash}\n`);
  } catch (err) {
    console.error("Error al generar hash:", err);
  }
}

main();

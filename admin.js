<!-- ===== admin.js ===== -->

<script>
  // ====== BLOQUE COMÚN PARA TODAS LAS PÁGINAS ======

  // 1) Configura aquí tu usuario y el hash de la contraseña (SHA-256)
  //    NO pongas la contraseña en texto plano. Pon sólo el hash.
  const USUARIO_ADMIN = "admin";
  // SHA-256 de "secreto123" → "ef92b778bafe771e89245b89ecbc216e9abf5ed5580c9b8e355d72c7a2cd4d76"
  const HASH_PASS_ADMIN = "ef92b778bafe771e89245b89ecbc216e9abf5ed5580c9b8e355d72c7a2cd4d76";

  // 2) Función para calcular SHA-256 en el navegador
  async function sha256(text) {
    const datos = new TextEncoder().encode(text);
    const hashBuffer = await crypto.subtle.digest('SHA-256', datos);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // 3) Lógica de “atajo” Ctrl+Shift+A
  window.addEventListener('DOMContentLoaded', () => {
    // Solo vinculamos en dispositivos que tengan teclado físico
    if (!('ontouchstart' in window)) {
      window.addEventListener('keydown', async function(e) {
        if (e.ctrlKey && e.shiftKey && (e.key === 'A' || e.key === 'a')) {
          e.preventDefault();
          await intentarLoginAdmin();
        }
      });
    }

    // 4) Si ya iniciaron sesión (sessionStorage), activamos modo admin directamente
    if (sessionStorage.getItem("modoAdminActivo") === "true") {
      habilitarModoAdmin();
    }
  });

  // 5) Función que despliega prompt y compara credenciales
  async function intentarLoginAdmin() {
    const usu = prompt("👉 Ingrese Usuario (modo Admin):", "");
    if (!usu) return;
    const pass = prompt("👉 Ingrese Contraseña (modo Admin):", "");
    if (!pass) return;

    const hashPass = await sha256(pass);
    if (usu === USUARIO_ADMIN && hashPass === HASH_PASS_ADMIN) {
      sessionStorage.setItem("modoAdminActivo", "true");
      alert("✔️ Sesión Admin iniciada correctamente.");
      habilitarModoAdmin();
    } else {
      alert("❌ Usuario o contraseña incorrectos.");
    }
  }

  // 6) Función que habilita “modo admin” en la interfaz actual
  function habilitarModoAdmin() {
    // Agrega clase al body
    document.body.classList.add("admin-activo");
    // Muestra todos los elementos marcados con data-admin="solo"
    document.querySelectorAll("[data-admin='solo']").forEach(el => {
      el.classList.remove("hidden");
    });

    // Opcional: muestra un banner fijo indicando “Modo Admin Activo”
    if (!document.getElementById("bannerAdmin")) {
      const banner = document.createElement("div");
      banner.id = "bannerAdmin";
      banner.innerHTML = "🔒 Modo Admin Activo";
      banner.style.position = "fixed";
      banner.style.bottom = "10px";
      banner.style.right = "10px";
      banner.style.background = "#000";
      banner.style.color = "#fff";
      banner.style.padding = "8px 12px";
      banner.style.zIndex = "2000";
      banner.style.borderRadius = "4px";
      document.body.appendChild(banner);
    }
  }

  // 7) Función para cerrar sesión Admin
  function cerrarSesionAdmin() {
    sessionStorage.removeItem("modoAdminActivo");
    document.body.classList.remove("admin-activo");
    document.querySelectorAll("[data-admin='solo']").forEach(el => {
      el.classList.add("hidden");
    });
    const banner = document.getElementById("bannerAdmin");
    if (banner) banner.remove();
    alert("🔒 Sesión Admin cerrada.");
  }
</script>

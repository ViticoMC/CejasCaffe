import type { MenuDatos } from "./datos";
import { LOGO_DATA_URI } from "./logo";
import { LEMA_NEGOCIO, NOMBRE_NEGOCIO } from "./marca";

const ESTILOS = `
:root {
  color-scheme: light;
  --crema: #FAF6EF;
  --superficie: #FFFFFF;
  --superficie-alta: #FFFDF8;
  --sutil: #F5EDE3;
  --borde: #E8DCCB;
  --texto: #2B211C;
  --texto-2: #6B5A50;
  --muted: #9C8B7D;
  --primario: #4A3427;
  --secundario: #A47148;
  --acento: #5A7A4C;
  --sombra: rgba(43, 33, 28, 0.12);
  --serif: Georgia, 'Iowan Old Style', 'Palatino Linotype', 'Times New Roman', serif;
  --sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
}

* { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
html, body { margin: 0; padding: 0; }
[hidden] { display: none !important; }
body {
  background: var(--crema);
  color: var(--texto);
  font-family: var(--sans);
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
  padding-bottom: 48px;
}
img { display: block; max-width: 100%; }
button { font-family: inherit; cursor: pointer; }

.envoltura { max-width: 720px; margin: 0 auto; padding: 0 16px; }

.cabecera {
  position: relative;
  z-index: 1;
  max-width: 720px;
  margin: 0 auto;
  padding: 40px 16px 20px;
  text-align: center;
}
.marca {
  font-family: var(--serif);
  font-size: 34px;
  line-height: 1.1;
  font-weight: 600;
  letter-spacing: 0.2px;
  margin: 0;
  color: var(--texto);
}
.lema {
  margin: 10px 0 0;
  color: var(--texto-2);
  font-size: 15px;
}
.logo {
  display: block;
  width: 96px;
  height: auto;
  margin: 0 auto 14px;
}

.filtros { margin: 8px 0 20px; }
.filtros-encabezado {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
}
.filtros-encabezado h2 {
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 1.2px;
  color: var(--muted);
  font-weight: 600;
  margin: 0;
}
.limpiar {
  border: none;
  background: none;
  color: var(--secundario);
  font-size: 13px;
  font-weight: 600;
  padding: 4px;
}
.chips {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 4px;
  scrollbar-width: none;
}
.chips::-webkit-scrollbar { display: none; }
.chip {
  flex: 0 0 auto;
  border: 1px solid var(--borde);
  background: var(--superficie);
  color: var(--texto-2);
  border-radius: 999px;
  padding: 8px 14px;
  font-size: 14px;
  font-weight: 500;
  transition: background 160ms ease, border-color 160ms ease, color 160ms ease;
}
.chip.activo {
  background: rgba(90, 122, 76, 0.14);
  border-color: var(--acento);
  color: var(--acento);
}

.lista { display: grid; gap: 16px; }

.tarjeta {
  background: var(--superficie);
  border: 1px solid var(--borde);
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 2px 12px var(--sombra);
}
.tarjeta-foto {
  position: relative;
  aspect-ratio: 4 / 3;
  background: var(--sutil);
  overflow: hidden;
}
.tarjeta-foto img { width: 100%; height: 100%; object-fit: cover; }
.sin-foto {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--serif);
  font-size: 40px;
  color: var(--muted);
  background: linear-gradient(135deg, var(--sutil), var(--superficie-alta));
}
.insignia-fotos {
  position: absolute;
  right: 10px;
  bottom: 10px;
  background: rgba(43, 33, 28, 0.55);
  color: #FDF8F0;
  font-size: 12px;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: 999px;
}
.tarjeta-cuerpo { padding: 16px; display: grid; gap: 8px; }
.tarjeta-nombre {
  font-family: var(--serif);
  font-size: 20px;
  line-height: 1.2;
  font-weight: 600;
  margin: 0;
}
.tarjeta-desc {
  margin: 0;
  color: var(--texto-2);
  font-size: 14px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.tarjeta-pie {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 4px;
}
.precio {
  font-family: var(--serif);
  font-size: 22px;
  font-weight: 600;
  color: var(--secundario);
  font-variant-numeric: tabular-nums;
  margin: 0;
}
.boton-detalle {
  border: 1px solid var(--borde);
  background: var(--superficie);
  color: var(--primario);
  border-radius: 12px;
  padding: 10px 16px;
  font-size: 14px;
  font-weight: 600;
  min-height: 44px;
  transition: background 160ms ease;
}
.boton-detalle:active { background: var(--sutil); }

.vacio {
  text-align: center;
  padding: 48px 16px;
  color: var(--texto-2);
}
.vacio .titulo {
  font-family: var(--serif);
  font-size: 20px;
  color: var(--texto);
  margin: 0 0 6px;
}

/* Detalle */
.detalle {
  position: fixed;
  inset: 0;
  z-index: 40;
  background: var(--crema);
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  animation: entrar 180ms ease;
}
@keyframes entrar { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
.detalle-cabecera {
  position: sticky;
  top: 0;
  z-index: 2;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px 16px;
  background: rgba(250, 246, 239, 0.92);
  backdrop-filter: blur(6px);
  border-bottom: 1px solid var(--borde);
}
.volver, .visor-boton {
   padding: 10px;
  border: none;
  background: var(--superficie);
  color: var(--primario);
  border-radius: 999px;
  width: 44px;
  height: 44px;
  font-size: 20px;
  line-height: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 1px 4px var(--sombra);
}
.detalle-cabecera .titulo-cabecera {
  font-family: var(--serif);
  font-size: 16px;
  font-weight: 600;
  color: var(--texto-2);
}

.carrusel {
  display: flex;
  gap: 12px;
  overflow-x: auto;
  overscroll-behavior-x: contain;
  scroll-snap-type: x mandatory;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
  padding: 16px;
  touch-action: pan-x;
}
.carrusel::-webkit-scrollbar { display: none; }
.slide {
  flex: 0 0 100%;
  scroll-snap-align: center;
  aspect-ratio: 4 / 3;
  border-radius: 16px;
  overflow: hidden;
  background: var(--sutil);
  box-shadow: 0 2px 12px var(--sombra);
}
.slide img { width: 100%; height: 100%; object-fit: cover; }
.puntos {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 2px;
  margin: -4px 0 8px;
}
.punto {
  width: 24px;
  height: 24px;
  border: none;
  padding: 0;
  background: transparent;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.punto::after {
  content: '';
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: var(--borde);
  transition: width 160ms ease, background 160ms ease;
}
.punto.activo::after { width: 20px; background: var(--secundario); }

.detalle-info { padding: 8px 16px 48px; max-width: 720px; margin: 0 auto; }
.detalle-nombre {
  font-family: var(--serif);
  font-size: 28px;
  line-height: 1.15;
  font-weight: 600;
  margin: 4px 0 0;
}
.detalle-desc { color: var(--texto-2); font-size: 16px; margin: 10px 0 0; }
.detalle-precio {
  font-family: var(--serif);
  font-size: 26px;
  font-weight: 600;
  color: var(--secundario);
  font-variant-numeric: tabular-nums;
  margin: 16px 0 0;
}
.bloque-titulo {
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 1.2px;
  color: var(--muted);
  font-weight: 600;
  margin: 28px 0 12px;
}
.lista-ingredientes {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 8px;
}
.lista-ingredientes li {
  background: var(--sutil);
  border-radius: 12px;
  padding: 12px 16px;
  font-size: 15px;
  color: var(--texto);
}

/* Visor pantalla completa */
.visor {
  position: fixed;
  inset: 0;
  z-index: 60;
  background: rgba(20, 14, 11, 0.96);
  display: flex;
  flex-direction: column;
}
.visor-barra {
  display: flex;
  justify-content: flex-end;
  padding: 14px 16px;
  gap: 12px;
}
.visor-barra .visor-boton { background: rgba(253, 248, 240, 0.15); color: #FDF8F0; box-shadow: none; }
.visor-escenario {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  padding: 0 8px 24px;
}
.visor-escenario img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  touch-action: pinch-zoom;
}
.visor-nav {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 48px;
  height: 48px;
  border-radius: 999px;
  border: none;
  background: rgba(253, 248, 240, 0.15);
  color: #FDF8F0;
  font-size: 24px;
}
.visor-nav.izq { left: 12px; }
.visor-nav.der { right: 12px; }
`;

const SCRIPT = `
(function () {
  var datos = window.__MENU__ || null;
  var seleccion = new Set();

  function formatoPrecio(valor) {
    var numero = Number(valor) || 0;
    try {
      return '$' + numero.toLocaleString('es-MX', { maximumFractionDigits: 2 });
    } catch (e) {
      return '$' + numero;
    }
  }

  function el(tag, clase, texto) {
    var nodo = document.createElement(tag);
    if (clase) nodo.className = clase;
    if (texto != null) nodo.textContent = texto;
    return nodo;
  }

  function cargar() {
    if (datos) { iniciar(datos); return; }
    fetch('/api/menu')
      .then(function (r) { return r.json(); })
      .then(iniciar)
      .catch(function () { mostrarVacio('No se pudo cargar el menú', 'Revisa la conexión e inténtalo de nuevo.'); });
  }

  function iniciar(d) {
    datos = d;
    document.title = d.negocio + ' · Menú';
    document.getElementById('marca').textContent = d.negocio;
    document.getElementById('lema').textContent = d.lema;
    renderChips(d.ingredientes || []);
    renderLista();
  }

  function renderChips(ingredientes) {
    var contenedor = document.getElementById('chips');
    var seccion = document.getElementById('filtros');
    contenedor.innerHTML = '';
    document.getElementById('limpiar').hidden = true;
    if (!ingredientes.length) { seccion.hidden = true; return; }
    seccion.hidden = false;
    ingredientes.forEach(function (ing) {
      var boton = el('button', 'chip', ing.nombre);
      boton.type = 'button';
      boton.setAttribute('aria-pressed', 'false');
      boton.addEventListener('click', function () { alternar(ing.id, boton); });
      contenedor.appendChild(boton);
    });
  }

  function alternar(id, boton) {
    if (seleccion.has(id)) {
      seleccion.delete(id);
      boton.classList.remove('activo');
      boton.setAttribute('aria-pressed', 'false');
    } else {
      seleccion.add(id);
      boton.classList.add('activo');
      boton.setAttribute('aria-pressed', 'true');
    }
    document.getElementById('limpiar').hidden = seleccion.size === 0;
    renderLista();
  }

  function limpiarFiltros() {
    seleccion.clear();
    document.querySelectorAll('.chip.activo').forEach(function (c) {
      c.classList.remove('activo');
      c.setAttribute('aria-pressed', 'false');
    });
    document.getElementById('limpiar').hidden = true;
    renderLista();
  }

  function filtradas() {
    var ids = Array.from(seleccion);
    var ordenadas = datos.bebidas.slice().sort(function (a, b) {
      return a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' });
    });
    if (!ids.length) return ordenadas;
    return ordenadas.filter(function (b) {
      var propios = b.ingredientes.map(function (i) { return i.id; });
      return ids.every(function (id) { return propios.indexOf(id) !== -1; });
    });
  }

  function renderLista() {
    var lista = document.getElementById('lista');
    lista.innerHTML = '';
    var visibles = filtradas();

    if (!visibles.length) {
      if (datos.bebidas.length === 0) {
        mostrarVacio('Menú en preparación', 'Muy pronto encontrarás aquí nuestras bebidas.');
      } else {
        mostrarVacio('Sin coincidencias', 'Ninguna bebida usa todos los ingredientes seleccionados.');
      }
      return;
    }
    ocultarVacio();
    visibles.forEach(function (bebida) { lista.appendChild(tarjeta(bebida)); });
  }

  function tarjeta(bebida) {
    var card = el('article', 'tarjeta');
    var foto = el('div', 'tarjeta-foto');

    if (bebida.fotos && bebida.fotos.length) {
      var img = el('img');
      img.src = bebida.fotos[0].src;
      img.alt = bebida.nombre;
      img.loading = 'lazy';
      foto.appendChild(img);
      if (bebida.fotos.length > 1) {
        foto.appendChild(el('span', 'insignia-fotos', bebida.fotos.length + ' fotos'));
      }
    } else {
      foto.appendChild(el('div', 'sin-foto', (bebida.nombre || '?').charAt(0).toUpperCase()));
    }
    card.appendChild(foto);

    var cuerpo = el('div', 'tarjeta-cuerpo');
    cuerpo.appendChild(el('h3', 'tarjeta-nombre', bebida.nombre));
    if (bebida.descripcion) cuerpo.appendChild(el('p', 'tarjeta-desc', bebida.descripcion));

    var pie = el('div', 'tarjeta-pie');
    pie.appendChild(el('p', 'precio', formatoPrecio(bebida.precio)));
    var boton = el('button', 'boton-detalle', 'Más detalles');
    boton.type = 'button';
    boton.addEventListener('click', function () { abrirDetalle(bebida); });
    pie.appendChild(boton);
    cuerpo.appendChild(pie);
    card.appendChild(cuerpo);
    return card;
  }

  var detalleActual = null;

  function abrirDetalle(bebida) {
    detalleActual = bebida;
    var seccion = document.getElementById('detalle');
    seccion.hidden = false;
    seccion.scrollTop = 0;
    document.body.style.overflow = 'hidden';

    document.getElementById('d-nombre').textContent = bebida.nombre;
    document.getElementById('d-desc').textContent = bebida.descripcion || '';
    document.getElementById('d-desc').hidden = !bebida.descripcion;
    document.getElementById('d-precio').textContent = formatoPrecio(bebida.precio);

    var lista = document.getElementById('d-ingredientes');
    lista.innerHTML = '';
    if (bebida.ingredientes && bebida.ingredientes.length) {
      bebida.ingredientes.forEach(function (ing) { lista.appendChild(el('li', null, ing.nombre)); });
      document.getElementById('d-ingredientes-titulo').hidden = false;
    } else {
      document.getElementById('d-ingredientes-titulo').hidden = true;
    }

    renderCarrusel(bebida);
    document.getElementById('volver').focus();
  }

  function cerrarDetalle() {
    document.getElementById('detalle').hidden = true;
    document.body.style.overflow = '';
    detalleActual = null;
    cerrarVisor();
  }

  function renderCarrusel(bebida) {
    var carrusel = document.getElementById('carrusel');
    var puntos = document.getElementById('puntos');
    carrusel.onscroll = null;
    carrusel.innerHTML = '';
    puntos.innerHTML = '';
    var fotos = bebida.fotos || [];

    fotos.forEach(function (foto, indice) {
      var slide = el('div', 'slide');
      var img = el('img');
      img.src = foto.src;
      img.alt = bebida.nombre + ' ' + (indice + 1);
      img.addEventListener('click', function () { abrirVisor(indice); });
      slide.appendChild(img);
      carrusel.appendChild(slide);

      var punto = el('button', 'punto');
      punto.type = 'button';
      punto.setAttribute('aria-label', 'Ir a la foto ' + (indice + 1));
      punto.addEventListener('click', function () {
        var destino = slide.getBoundingClientRect().left
          - carrusel.getBoundingClientRect().left
          + carrusel.scrollLeft;
        carrusel.scrollTo({ left: destino, behavior: 'auto' });
        actualizarPuntos(indice);
      });
      puntos.appendChild(punto);
    });

    if (fotos.length <= 1) {
      puntos.style.display = 'none';
      carrusel.onscroll = null;
      return;
    }
    puntos.style.display = '';
    actualizarPuntos(0);
    carrusel.onscroll = function () {
      actualizarPuntos(Math.round(carrusel.scrollLeft / avanceSlide()));
    };
  }

  function avanceSlide() {
    var carrusel = document.getElementById('carrusel');
    var slide = carrusel ? carrusel.querySelector('.slide') : null;
    var ancho = slide ? slide.offsetWidth : 0;
    if (ancho <= 0 && carrusel) ancho = carrusel.clientWidth;
    return (ancho > 0 ? ancho : 1) + 12;
  }

  function actualizarPuntos(activo) {
    document.querySelectorAll('#puntos .punto').forEach(function (p, i) {
      p.classList.toggle('activo', i === activo);
    });
  }

  var visorIndice = 0;

  function abrirVisor(indice) {
    if (!detalleActual || !detalleActual.fotos || !detalleActual.fotos.length) return;
    visorIndice = indice;
    var visor = document.getElementById('visor');
    visor.hidden = false;
    pintarVisor();
  }

  function pintarVisor() {
    var fotos = (detalleActual && detalleActual.fotos) || [];
    var foto = fotos[visorIndice];
    if (!foto) return;
    document.getElementById('visor-img').src = foto.src;
    var hayVarias = fotos.length > 1;
    document.getElementById('visor-izq').hidden = !hayVarias;
    document.getElementById('visor-der').hidden = !hayVarias;
  }

  function moverVisor(delta) {
    var fotos = (detalleActual && detalleActual.fotos) || [];
    if (!fotos.length) return;
    visorIndice = (visorIndice + delta + fotos.length) % fotos.length;
    pintarVisor();
  }

  function cerrarVisor() {
    document.getElementById('visor').hidden = true;
  }

  function mostrarVacio(titulo, texto) {
    var vacio = document.getElementById('vacio');
    document.getElementById('vacio-titulo').textContent = titulo;
    document.getElementById('vacio-texto').textContent = texto;
    vacio.hidden = false;
    document.getElementById('lista').innerHTML = '';
  }

  function ocultarVacio() {
    document.getElementById('vacio').hidden = true;
  }

  function conectar() {
    document.getElementById('limpiar').addEventListener('click', limpiarFiltros);
    document.getElementById('volver').addEventListener('click', cerrarDetalle);
    document.getElementById('visor-cerrar').addEventListener('click', cerrarVisor);
    document.getElementById('visor-izq').addEventListener('click', function () { moverVisor(-1); });
    document.getElementById('visor-der').addEventListener('click', function () { moverVisor(1); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        if (!document.getElementById('visor').hidden) cerrarVisor();
        else if (!document.getElementById('detalle').hidden) cerrarDetalle();
      } else if (!document.getElementById('visor').hidden) {
        if (e.key === 'ArrowLeft') moverVisor(-1);
        if (e.key === 'ArrowRight') moverVisor(1);
      }
    });

    var inicioX = null;
    var visor = document.getElementById('visor');
    visor.addEventListener('touchstart', function (e) { inicioX = e.changedTouches[0].clientX; }, { passive: true });
    visor.addEventListener('touchend', function (e) {
      if (inicioX == null) return;
      var dx = e.changedTouches[0].clientX - inicioX;
      if (Math.abs(dx) > 50) moverVisor(dx < 0 ? 1 : -1);
      inicioX = null;
    }, { passive: true });
  }

  document.addEventListener('DOMContentLoaded', function () { conectar(); cargar(); });
})();
`;

function escaparParaScript(valor: unknown): string {
  return JSON.stringify(valor).replace(/</g, "\\u003c");
}

export function generarPagina(datos?: MenuDatos): string {
  const inyeccion =
    datos != null
      ? `<script>window.__MENU__ = ${escaparParaScript(datos)};</script>`
      : "";

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="color-scheme" content="only light">
<meta name="theme-color" content="#FAF6EF">
<title>${NOMBRE_NEGOCIO} · Menú</title>
<style>${ESTILOS}</style>
</head>
<body>
<div class="envoltura">
  <header class="cabecera">
    <img class="logo" src="${LOGO_DATA_URI}" alt="${NOMBRE_NEGOCIO}" width="96" height="88">
    <p class="marca" id="marca">${NOMBRE_NEGOCIO}</p>
    <p class="lema" id="lema">${LEMA_NEGOCIO}</p>
  </header>

  <section class="filtros" id="filtros" hidden>
    <div class="filtros-encabezado">
      <h2>Filtrar por ingredientes</h2>
      <button type="button" class="limpiar" id="limpiar" hidden>Limpiar</button>
    </div>
    <div class="chips" id="chips"></div>
  </section>

  <main class="lista" id="lista" aria-live="polite"></main>
  <div class="vacio" id="vacio" hidden>
    <p class="titulo" id="vacio-titulo"></p>
    <p id="vacio-texto"></p>
  </div>
</div>

<section class="detalle" id="detalle" hidden>
  <div class="detalle-cabecera">
    <button type="button" class="volver" id="volver" aria-label="Volver al menú"><svg fill="#000000" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"><polygon points="3.828 9 9.899 2.929 8.485 1.515 0 10 .707 10.707 8.485 18.485 9.899 17.071 3.828 11 20 11 20 9 3.828 9"></polygon></g></svg></button>
    <span class="titulo-cabecera">Detalles</span>
  </div>
  <div class="carrusel" id="carrusel"></div>
  <div class="puntos" id="puntos"></div>
  <div class="detalle-info">
    <h1 class="detalle-nombre" id="d-nombre"></h1>
    <p class="detalle-desc" id="d-desc"></p>
    <p class="detalle-precio" id="d-precio"></p>
    <h2 class="bloque-titulo" id="d-ingredientes-titulo">Ingredientes</h2>
    <ul class="lista-ingredientes" id="d-ingredientes"></ul>
  </div>
</section>

<div class="visor" id="visor" hidden>
  <div class="visor-barra">
    <button type="button" class="visor-boton" id="visor-cerrar" aria-label="Cerrar">&#215;</button>
  </div>
  <div class="visor-escenario">
    <img id="visor-img" alt="">
  </div>
  <button type="button" class="visor-nav izq" id="visor-izq" aria-label="Foto anterior">&#8249;</button>
  <button type="button" class="visor-nav der" id="visor-der" aria-label="Foto siguiente">&#8250;</button>
</div>

${inyeccion}
<script>${SCRIPT}</script>
</body>
</html>`;
}

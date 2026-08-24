#!/usr/bin/env node
/*--------------------------------------------------------------
# RUTA J — deploy.js
# Sincroniza esta carpeta con public_html en Neolo por FTP.
#
#   npm run deploy        → informe. No sube nada. Siempre empezá por acá.
#   npm run deploy:go     → sube lo que el informe marcó.
#
# Cómo decide qué subir:
#   1. Guarda en el servidor un manifiesto (.deploy-manifest.json) con el
#      hash sha1 de cada archivo publicado.
#   2. En cada corrida compara el hash local contra ese manifiesto.
#      Distinto o ausente → sube. Igual → no lo toca.
#   3. Además lista el servidor de verdad, así detecta archivos que faltan
#      arriba aunque el manifiesto diga que están.
#
# NUNCA borra nada del servidor. Los archivos que sobran solo se informan.
--------------------------------------------------------------*/

"use strict";

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const ftp = require("basic-ftp");

const RAIZ = path.resolve(__dirname, "..");
const MANIFIESTO = ".deploy-manifest.json";

/*--------------------------------------------------------------
# 1. Configuración
--------------------------------------------------------------*/

// Lector mínimo de .env — evita sumar la dependencia dotenv.
function leerEnv(archivo) {
  if (!fs.existsSync(archivo)) return {};
  const env = {};
  for (const linea of fs.readFileSync(archivo, "utf8").split(/\r?\n/)) {
    const limpia = linea.trim();
    if (!limpia || limpia.startsWith("#")) continue;
    const corte = limpia.indexOf("=");
    if (corte === -1) continue;
    const clave = limpia.slice(0, corte).trim();
    let valor = limpia.slice(corte + 1).trim();
    if (/^(".*"|'.*')$/.test(valor)) valor = valor.slice(1, -1);
    env[clave] = valor;
  }
  return env;
}

const env = { ...leerEnv(path.join(__dirname, ".env")), ...process.env };

const CONFIG = {
  host: env.FTP_HOST,
  user: env.FTP_USER,
  password: env.FTP_PASSWORD,
  secure: env.FTP_SECURE === "true",
  puerto: parseInt(env.FTP_PORT || "21", 10),
  raizRemota: env.FTP_REMOTE_ROOT || "/public_html"
};

/*--------------------------------------------------------------
# 2. Qué NO se sube
--------------------------------------------------------------*/

// Carpetas que ni se recorren.
const CARPETAS_FUERA = new Set([
  "node_modules", ".git", ".vs", ".vscode", ".gstack",
  "deploy",              // la herramienta no se publica a sí misma
  "1.construccion", "2.especificacion", "3.clarificacion", "4.plan"
]);

// Archivos sueltos que no se publican.
const ARCHIVOS_FUERA = new Set([
  // Del repositorio, no del sitio.
  ".gitignore", ".gitattributes", "README.md",
  "package.json", "package-lock.json", ".ftpquota", "forms/Readme.txt",

  // Configuración de IIS. Neolo es Linux y usa .htaccess: subirlo no hace
  // nada bueno y puede confundir a quien mire el servidor mañana.
  "Web.config",

  // Clips todavía sin asignar a ningún hito: no están referenciados por
  // historia.html, así que subirlos sería peso muerto en el servidor.
  "assets/video/historia/h06-clip-obra.mp4",
  "assets/video/historia/hoy-clip-red.mp4",
  "assets/img/historia/h06-clip-obra-poster.webp",
  "assets/img/historia/hoy-clip-red-poster.webp",

  // Fotos de archivo subidas pero todavía sin asignar a ningún hito. Los
  // .jpg ya usados en la web se borran directamente de la carpeta en cuanto
  // existe su .webp (Julio, 24/08/2026): no hace falta excluirlos acá.
  "assets/img/historia/BakandoPalosBR.jpg",
  "assets/img/historia/Reunion01BR.jpg",
  "assets/img/historia/ParqueAutomotorBR.jpg",

  // Foto vieja del hito 06: quedó reemplazada por h06-cuadrilla-postes.webp.
  "assets/img/historia/h06-obra.webp"
]);

function seExcluye(rel) {
  if (ARCHIVOS_FUERA.has(rel)) return true;
  // Los 4 videos institucionales ya están arriba y pesan 124 MB entre todos.
  if (/^assets\/videos\/.+\.mp4$/i.test(rel)) return true;
  return false;
}

/*--------------------------------------------------------------
# 3. Inventario local
--------------------------------------------------------------*/

function sha1(archivo) {
  return crypto.createHash("sha1").update(fs.readFileSync(archivo)).digest("hex");
}

function recorrer(dir, base = "") {
  const salida = [];
  for (const entrada of fs.readdirSync(dir, { withFileTypes: true })) {
    const rel = base ? `${base}/${entrada.name}` : entrada.name;
    if (entrada.isDirectory()) {
      if (CARPETAS_FUERA.has(entrada.name)) continue;
      salida.push(...recorrer(path.join(dir, entrada.name), rel));
    } else if (entrada.isFile()) {
      if (seExcluye(rel)) continue;
      const abs = path.join(dir, entrada.name);
      salida.push({ rel, abs, peso: fs.statSync(abs).size, hash: sha1(abs) });
    }
  }
  return salida;
}

/*--------------------------------------------------------------
# 4. Inventario remoto
--------------------------------------------------------------*/

// Recorre el servidor. Por defecto entra SOLO a las carpetas donde tenemos
// archivos locales: el servidor arrastra miles de archivos de versiones viejas
// del sitio y recorrerlo entero tarda minutos sin aportar nada.
// Con `completo` en true los recorre todos (bandera --huerfanos).
async function listarRemoto(client, dir, base = "", carpetas = null, completo = false) {
  const encontrados = new Map();
  let entradas;
  try {
    entradas = await client.list(dir);
  } catch {
    return encontrados; // la carpeta todavía no existe en el servidor
  }
  for (const e of entradas) {
    if (e.name === "." || e.name === "..") continue;
    const rel = base ? `${base}/${e.name}` : e.name;
    if (e.isDirectory) {
      if (CARPETAS_FUERA.has(e.name)) continue;
      if (!completo && carpetas && !carpetas.has(rel)) continue;
      for (const [k, v] of await listarRemoto(client, `${dir}/${e.name}`, rel, carpetas, completo)) {
        encontrados.set(k, v);
      }
    } else if (e.isFile) {
      encontrados.set(rel, e.size);
    }
  }
  return encontrados;
}

// Toda carpeta que contenga archivos locales, más sus carpetas padre: son las
// únicas ramas del servidor que necesitamos mirar.
function carpetasDeInteres(locales) {
  const set = new Set();
  for (const a of locales) {
    const partes = a.rel.split("/");
    partes.pop();
    for (let i = 1; i <= partes.length; i++) set.add(partes.slice(0, i).join("/"));
  }
  return set;
}

async function bajarManifiesto(client) {
  const tmp = path.join(__dirname, ".manifiesto-remoto.tmp");
  try {
    await client.downloadTo(tmp, `${CONFIG.raizRemota}/${MANIFIESTO}`);
    const datos = JSON.parse(fs.readFileSync(tmp, "utf8"));
    fs.unlinkSync(tmp);
    return datos.archivos || {};
  } catch {
    try { fs.unlinkSync(tmp); } catch {}
    return null; // primera corrida
  }
}

/*--------------------------------------------------------------
# 5. Presentación
--------------------------------------------------------------*/

const kb = (b) => (b < 1024 ? `${b} B` : b < 1048576 ? `${(b / 1024).toFixed(0)} KB` : `${(b / 1048576).toFixed(1)} MB`);

function titulo(texto) {
  console.log(`\n${texto}\n${"─".repeat(texto.length)}`);
}

/*--------------------------------------------------------------
# 6. Principal
--------------------------------------------------------------*/

async function main() {
  const args = process.argv.slice(2);
  const subir = args.includes("--go");
  const filtro = (() => {
    const i = args.indexOf("--solo");
    return i !== -1 && args[i + 1] ? args[i + 1] : null;
  })();

  for (const clave of ["host", "user", "password"]) {
    if (!CONFIG[clave]) {
      console.error(
        `\nFalta FTP_${clave.toUpperCase()} en deploy/.env\n` +
        `Copiá deploy/.env.example a deploy/.env y completá los datos de Neolo.\n`
      );
      process.exit(1);
    }
  }

  console.log(`\nRUTA J — deploy${subir ? "" : "  (informe, no sube nada)"}`);
  console.log(`${CONFIG.user}@${CONFIG.host}:${CONFIG.raizRemota}`);

  let locales = recorrer(RAIZ);
  if (filtro) locales = locales.filter((a) => a.rel.includes(filtro));
  console.log(`\n${locales.length} archivos locales publicables${filtro ? ` que contienen "${filtro}"` : ""}.`);

  const client = new ftp.Client(30000);
  client.ftp.verbose = args.includes("--verboso");

  try {
    await client.access({
      host: CONFIG.host,
      port: CONFIG.puerto,
      user: CONFIG.user,
      password: CONFIG.password,
      secure: CONFIG.secure
    });

    const manifiesto = await bajarManifiesto(client);
    if (!manifiesto) {
      console.log("\nNo hay manifiesto en el servidor: es la primera corrida.");
      console.log("Comparo por presencia y peso; a partir de la próxima, por hash.");
    }
    const completo = args.includes("--huerfanos");
    const remotos = await listarRemoto(
      client, CONFIG.raizRemota, "", carpetasDeInteres(locales), completo
    );
    console.log(
      `${remotos.size} archivos en el servidor` +
      (completo ? " (recorrido completo)." : " dentro de las carpetas del sitio.")
    );

    const faltan = [];   // no están arriba — el error de ayer
    const cambiaron = []; // están pero son distintos
    const dudosos = [];  // sin manifiesto y mismo peso: probablemente iguales

    for (const a of locales) {
      const pesoRemoto = remotos.get(a.rel);
      if (pesoRemoto === undefined) { faltan.push(a); continue; }
      if (manifiesto && a.rel in manifiesto) {
        if (manifiesto[a.rel] !== a.hash) cambiaron.push(a);
      } else if (pesoRemoto !== a.peso) {
        // Sin registro en el manifiesto (pasa tras una corrida con --solo):
        // se cae al mismo criterio de la primera vez, el peso.
        cambiaron.push(a);
      } else {
        dudosos.push(a);
      }
    }

    const huerfanos = [...remotos.keys()].filter(
      (r) => r !== MANIFIESTO && !locales.some((a) => a.rel === r) && !filtro
    );

    if (faltan.length) {
      titulo(`FALTAN EN EL SERVIDOR — ${faltan.length}`);
      for (const a of faltan) console.log(`  + ${a.rel}  (${kb(a.peso)})`);
    }
    if (cambiaron.length) {
      titulo(`CAMBIARON — ${cambiaron.length}`);
      for (const a of cambiaron) console.log(`  ~ ${a.rel}  (${kb(a.peso)})`);
    }
    if (!faltan.length && !cambiaron.length) {
      titulo("EL SERVIDOR ESTÁ AL DÍA");
      console.log("  No hay nada para subir.");
    }
    if (dudosos.length) {
      console.log(`\n${dudosos.length} archivos con el mismo peso que el servidor: los doy por iguales.`);
    }
    if (huerfanos.length) {
      titulo(`SOLO EN EL SERVIDOR — ${huerfanos.length}`);
      console.log(
        completo
          ? "  (no se borran, es solo información)"
          : "  (no se borran. Solo las carpetas del sitio: --huerfanos recorre todo)"
      );
      for (const r of huerfanos.slice(0, 30)) console.log(`  ? ${r}`);
      if (huerfanos.length > 30) console.log(`  … y ${huerfanos.length - 30} más`);
    }

    const pendientes = [...faltan, ...cambiaron];

    if (!subir) {
      if (pendientes.length) {
        const total = pendientes.reduce((s, a) => s + a.peso, 0);
        console.log(`\nPara subir estos ${pendientes.length} archivos (${kb(total)}):\n  npm run deploy:go\n`);
      } else {
        console.log("");
      }
      return;
    }

    if (!pendientes.length) { console.log(""); return; }

    // Agrupo por carpeta remota: así creo cada carpeta una sola vez.
    const porCarpeta = new Map();
    for (const a of pendientes) {
      const dir = path.posix.dirname(a.rel);
      if (!porCarpeta.has(dir)) porCarpeta.set(dir, []);
      porCarpeta.get(dir).push(a);
    }

    titulo(`SUBIENDO — ${pendientes.length} archivos`);
    let hechos = 0;
    for (const [dir, archivos] of porCarpeta) {
      await client.cd(CONFIG.raizRemota);
      if (dir !== ".") await client.ensureDir(dir); // crea el árbol si no existe
      for (const a of archivos) {
        await client.uploadFrom(a.abs, path.posix.basename(a.rel));
        hechos++;
        console.log(`  ✓ ${a.rel}  (${kb(a.peso)})`);
      }
    }

    // Manifiesto nuevo: arranca del anterior para no perder lo que quedó fuera
    // de esta corrida (con --solo, `locales` es apenas un subconjunto).
    const nuevo = { ...(manifiesto || {}) };
    for (const a of locales) {
      const subido = pendientes.includes(a);
      const yaEstaba = manifiesto && manifiesto[a.rel] === a.hash;
      if (subido || yaEstaba || dudosos.includes(a)) nuevo[a.rel] = a.hash;
    }
    const tmp = path.join(__dirname, ".manifiesto-nuevo.tmp");
    fs.writeFileSync(
      tmp,
      JSON.stringify({ actualizado: new Date().toISOString(), archivos: nuevo }, null, 2)
    );
    await client.cd(CONFIG.raizRemota);
    await client.uploadFrom(tmp, MANIFIESTO);
    fs.unlinkSync(tmp);

    console.log(`\n${hechos} archivos subidos. Manifiesto actualizado.\n`);
  } catch (error) {
    console.error(`\nFalló el deploy: ${error.message}`);
    if (/530/.test(error.message)) console.error("Usuario o contraseña rechazados por Neolo.");
    if (/ECONNREFUSED|ETIMEDOUT|ENOTFOUND/.test(error.message)) {
      console.error("No hubo conexión. Revisá FTP_HOST, o si Neolo te bloqueó la IP.");
    }
    process.exitCode = 1;
  } finally {
    client.close();
  }
}

main();

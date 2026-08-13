# RutaJ

Sitio web de la **Cooperativa de Servicios Públicos Ruta J Ltda.**
Concepción del Uruguay, Entre Ríos.

Desarrollo y diseño: **jArismendi®** — Comunicación & Marketing.

---

## Publicar en producción

El hosting es **Neolo** y se publica por FTP. No hay deploy automático:
subir es siempre una decisión explícita.

### Preparación (una sola vez)

```bash
npm install
cp deploy/.env.example deploy/.env
```

Completá `deploy/.env` con los datos de FTP de Neolo. Ese archivo está en
`.gitignore` y no se sube nunca a GitHub.

### Cada publicación

```bash
npm run deploy      # informe: qué falta y qué cambió. No sube nada.
npm run deploy:go   # sube lo que el informe listó.
```

El informe compara los archivos locales contra el servidor usando un
manifiesto de hashes (`.deploy-manifest.json`) que vive en la raíz remota,
y los separa en tres grupos:

| | |
|---|---|
| **FALTAN EN EL SERVIDOR** | están acá pero no arriba |
| **CAMBIARON** | están en los dos lados y son distintos |
| **SOLO EN EL SERVIDOR** | están arriba y no acá — solo se informan |

**El script nunca borra nada del servidor.**

Para trabajar sobre un subconjunto:

```bash
node deploy/deploy.js --solo historia        # solo rutas que contengan "historia"
node deploy/deploy.js --verboso              # traza completa del diálogo FTP
```

---

## Qué NO está en este repositorio

Decisiones tomadas el 13 de agosto de 2026:

- **`node_modules/`** — se reconstruye con `npm install`.
- **Carpetas del pipeline** (`1.construccion/`, `2.especificacion/`,
  `3.clarificacion/`, `4.plan/`) — el repo es el sitio publicable, no el
  proceso de trabajo. Viven en la carpeta local del proyecto.
- **`assets/videos/*.mp4`** — 4 videos institucionales de 26 a 38 MB
  (124 MB entre todos). Ya están en el servidor y no cambian. Si alguna vez
  se reemplaza uno, se sube a mano por FTP.
- **`deploy/.env`** — credenciales.

Cada exclusión es una línea del [.gitignore](.gitignore); revertir cualquiera
de estas decisiones es borrar esa línea.

---

## Estructura

```
assets/css/      hojas del sitio + historia.css
assets/js/       scripts del sitio + historia.js
assets/img/      imágenes
assets/rutaj/    Bootstrap, Swiper, GLightbox, Isotope
deploy/          herramienta de publicación por FTP
forms/           handlers de formularios
Web.config       configuración del servidor
```

---

*jArismendi® — Diseño & Marketing*

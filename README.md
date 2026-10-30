# Checklist de Autoinspección — Codere Colombia

Aplicación web para que los **encargados de sala** de Codere Colombia hagan una
autoinspección previa a la visita técnica de la **UAE Cuerpo Oficial de
Bomberos Bogotá**, usando como base el formato oficial:

> **RD-PR03-FT05** — *Levantamiento de información de inspección técnica
> (Bajo-Moderado-Alto)* — Versión 1 — Vigencia 26/05/2026.

La app reproduce los 113 ítems del formato oficial (secciones A a G:
información general, seguridad humana, materiales inflamables, riesgos de
incendio, equipos de control de incendios, plan de mejoramiento y criterios
de evaluación), permite adjuntar **fotografías/registro fotográfico** por
cada ítem, y exporta el resultado en **JSON**, **Excel (.xlsx)** y **PDF**
conservando la numeración y estructura documental del formato original.

No reemplaza el Concepto Técnico oficial de Bomberos: es una herramienta
interna de preparación y control de cumplimiento.

## Cómo funciona hoy (sin servidor)

- Es un sitio **100% estático** (HTML + CSS + JS puro, sin frameworks ni
  build step). Se puede abrir directamente o publicar en **GitHub Pages**.
- Cada inspección se guarda en el navegador del dispositivo (IndexedDB),
  junto con sus fotos. El encargado de sala llena el checklist, lo guarda
  como borrador si necesita continuar después, y al terminar **exporta**
  el reporte (JSON / Excel / PDF) para enviarlo a quien consolide los
  resultados.
- No requiere cuenta, login ni conexión a internet una vez cargada la
  página (las librerías de Excel/PDF están empaquetadas localmente en
  `assets/vendor/`, no se cargan desde un CDN).

## Publicar en GitHub Pages

1. Crea un repositorio en GitHub (puede ser privado) y sube todo el
   contenido de esta carpeta tal cual (manteniendo la estructura de
   carpetas `css/`, `js/`, `data/`, `assets/`).
2. En GitHub → **Settings → Pages**, selecciona la rama `main` y la
   carpeta `/ (root)` como origen.
3. En un par de minutos la app queda disponible en
   `https://<tu-usuario>.github.io/<nombre-repo>/`.
4. Comparte ese enlace con los encargados de sala (funciona bien en
   celular/tablet).

No se necesita ningún paso de compilación (`npm install`, `build`, etc.).

## Estructura del proyecto

```
index.html              Página principal (estructura del formulario)
css/styles.css           Estilos (paleta corporativa Codere: rojo/negro)
data/checklist.js        Los 113 ítems del formato oficial, en datos (no HTML)
js/storage.js            Capa de persistencia (hoy: IndexedDB en el navegador)
js/app.js                Lógica de interfaz: renderiza el formulario, fotos, historial
js/export.js             Generación de JSON / Excel / PDF
assets/vendor/           Librerías de terceros empaquetadas localmente
                          (SheetJS para Excel, html2pdf.js para PDF)
```

### `data/checklist.js`: la fuente de verdad del formato

Todos los ítems (números, texto, agrupación por sección y campos
adicionales como "Cantidad aprox." o "Tanque elevado/enterrado") están
definidos como datos en este archivo, **no están escritos a mano en el
HTML**. Esto significa que si Bomberos Bogotá actualiza el formato
(nueva versión, ítem agregado o modificado), **solo hay que editar este
archivo** — el formulario, el Excel y el PDF se regeneran automáticamente
con la nueva estructura.

## Fotografías / registro fotográfico

Cada ítem del checklist tiene un botón 📷 para adjuntar una o varias
fotos (se recomienda especialmente en los hallazgos marcados "NO").
También hay una sección de **registro fotográfico general** al final
para evidencia que no corresponde a un ítem puntual. Las fotos se guardan
en el mismo dispositivo (IndexedDB) y se incluyen automáticamente dentro
del PDF exportado.

## Exportar: JSON, Excel y PDF

- **JSON** — estructura completa de la inspección (útil para integrarlo
  luego a un sistema propio o a un panel de consolidación).
- **Excel (.xlsx)** — misma numeración y secciones del formato oficial
  RD-PR03-FT05, lista para revisar o archivar junto con los demás
  documentos de la sala.
- **PDF** — reporte con membrete de Codere Colombia, incluye las fotos
  adjuntadas, listo para imprimir o enviar por correo.

## Convertirlo en estándar de obligatorio cumplimiento

Esta primera versión deja todo lo necesario para operar hoy mismo:
publicar el enlace, que cada sala lo use antes de cada visita, y archivar
los PDF/Excel exportados como evidencia de cumplimiento.

Si más adelante Codere quiere ver el estado de **todas las salas desde un
panel central** (en vez de que cada una exporte y envíe su archivo por
separado), el proyecto ya está preparado para ese cambio sin rehacer el
formulario:

- Toda la persistencia pasa por **`js/storage.js`**, que expone un
  contrato fijo (`saveInspection`, `listInspections`, `savePhoto`, etc.)
  documentado al inicio del archivo.
- Para centralizar, basta con reemplazar el contenido de ese archivo por
  llamadas a un backend "serverless" como **Firebase Firestore** o
  **Supabase** (ambos tienen plan gratuito y funcionan junto con GitHub
  Pages sin necesidad de un servidor propio). El resto de la aplicación
  (formulario, exportaciones) no necesita cambios.
- Eso permitiría, por ejemplo, un panel de supervisor que muestre qué
  salas ya hicieron su autoinspección del mes, cuáles tienen hallazgos
  "NO" pendientes, etc.

## Marca Codere Colombia

El diseño usa la paleta corporativa (rojo/negro) de forma genérica, ya
que no se contaba con el manual de marca oficial (logo, tipografía
exacta) al momento de construir esta versión. Para ajustar la identidad
visual exacta:

- Reemplaza el bloque `.brand-logo` en `index.html` por el logo oficial
  (archivo de imagen) y ajusta las variables de color en
  `css/styles.css` (`--codere-red`, `--codere-black`, etc.) según el
  manual de marca.
- El mismo ajuste de color/logo se refleja automáticamente en el PDF
  exportado (ver `buildPdfHtml` en `js/export.js`).

## Aviso

Herramienta interna de autoinspección. El resultado de este checklist
**no implica** la aprobación del Concepto Técnico oficial de Bomberos
Bogotá; ese concepto solo lo emite la UAE Cuerpo Oficial de Bomberos tras
su propia visita y verificación.

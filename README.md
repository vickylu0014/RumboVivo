# Rumbo Vivo

**Viajá, descubrí y dejá una huella positiva.**

Una plataforma de turismo pensada para un trabajo universitario de Marketing. La idea es que elegir dónde alojarse también permita mirar qué pasa alrededor: quién trabaja ahí, qué comercios participan y cómo se cuida el entorno.

Es una demostración frontend completa, hecha con HTML, CSS y JavaScript. No requiere Node, compilación, cuentas, claves de acceso ni una base de datos. Las imágenes, los íconos y las tipografías se sirven desde el proyecto; no hay solicitudes a servicios externos al navegar.

## Cómo abrirla

### Descargar y abrir con doble clic

1. [Descargá el proyecto completo en ZIP](https://github.com/Maxi-Conte/Rumbo-Vivo/archive/refs/heads/main.zip).
2. Extraé el ZIP completo. No abras el HTML desde la vista comprimida.
3. Abrí **`Rumbo-Vivo.html`** con Chrome, Edge, Firefox o Safari. Incluye el CSS, el JavaScript, las imágenes y las fuentes dentro del mismo archivo; no necesita conexión a internet ni un servidor.

La vista de archivos de GitHub muestra código: para ver la página, descargala y abrila en un navegador. La versión dividida en carpetas sigue disponible en `index.html` para trabajar con Live Server. Si descargás únicamente ese `index.html`, le van a faltar el CSS y los demás recursos.

### Con Live Server

1. Abrí la carpeta `Rumbo-Vivo` en Visual Studio Code.
2. Instalá la extensión **Live Server**, de Ritwick Dey, si todavía no la tenés.
3. Hacé clic derecho sobre `index.html` y elegí **Open with Live Server**.

### Con Python

Desde la carpeta del proyecto:

```bash
python3 -m http.server 4173 --bind 0.0.0.0
```

Abrí el puerto 4173 en tu navegador local. Para detener el servidor, usá `Ctrl+C`. En el entorno en la nube, el agente puede usar el servidor para comprobar la aplicación; la interfaz de onboarding no ofrece una vista previa web.

Conviene usar un servidor estático en lugar de abrir el archivo directamente: así los favoritos tienen un origen consistente y se puede reproducir el comportamiento de la presentación.

## Qué se puede hacer

- Explorar Mendoza, Bariloche, Buenos Aires, Río de Janeiro, Roma y Cataratas del Iguazú.
- Buscar entre doce alojamientos ficticios; inicialmente se muestran seis y el botón de la lista permite ver el resto.
- Combinar destino, precio máximo por unidad y noche, tipo de alojamiento, capacidad y tres criterios de turismo responsable.
- Seleccionar entrada y salida. Las fechas incompletas, pasadas o invertidas muestran un error y no aplican la búsqueda.
- Ordenar por precio, guardar favoritos y recuperar las preferencias al volver al mismo navegador.
- Comparar entre dos y tres alojamientos, incluidos sus servicios y sus cinco indicadores conceptuales.
- Abrir una ficha con descripción, capacidad, servicios, prácticas declaradas y estado de la información.
- Calcular un plan ilustrativo: precio por noche multiplicado por noches, sin reservas ni pagos.
- Probar la validación del formulario de contacto. Los datos no se envían ni se guardan.
- Conocer a los siete integrantes del equipo y a Andi, el cóndor andino de la marca.

Las acciones de la sección de triple impacto aplican filtros reales a los alojamientos. Los accesos de cada destino también cambian los resultados.

## Cómo funciona la simulación

Todos los precios se expresan en **pesos argentinos (ARS), por unidad de alojamiento y noche**. Son importes ilustrativos para comparar propuestas, incluidos los destinos del exterior. El presupuesto del buscador también se interpreta por noche, no por persona ni por viaje completo.

Los períodos de ocupación son ficticios y se calculan respecto de la fecha local al cargar la página. Por ejemplo, Finca Raíz queda ocupada desde diez días después de hoy hasta catorce días después de hoy. La entrada de un viaje debe ser anterior a su salida; la fecha de salida de una ocupación no bloquea la entrada de la siguiente. Las estadías sin fechas se filtran por el resto de los criterios y muestran disponibilidad orientativa.

Los cinco indicadores son apoyo a la economía local, accesibilidad e inclusión, gestión de residuos, uso eficiente de recursos y vinculación con la comunidad. Cada uno muestra **Práctica declarada** o **Sin información**. Ninguno tiene verificación externa. No hay puntajes, certificaciones inventadas ni cifras de impacto real. La accesibilidad es una declaración de ejemplo, no una garantía universal.

## Dónde editar

```text
Rumbo-Vivo/
├── index.html            Secciones, textos, formularios e íconos SVG
├── Rumbo-Vivo.html       Copia lista para descargar y abrir con doble clic
├── css/
│   └── styles.css        Paleta, tipografías, componentes y adaptación a pantallas
├── js/
│   ├── data.js           Destinos, alojamientos y prácticas ilustrativas
│   └── app.js            Búsqueda, filtros, comparación, favoritos y validaciones
├── assets/
│   ├── favicon.svg       Recurso de la identidad anterior
│   ├── fonts/            DM Sans, Fraunces y sus licencias
│   └── images/           Fotografías, Andi en SVG e ilustración de respaldo
├── tests/
│   └── test_browser.py   Pruebas funcionales con navegador
├── scripts/
│   └── package_site.py   Genera el HTML autocontenido y el ZIP
├── CREDITS.md            Procedencia de los recursos visuales
└── README.md
```

Los siete nombres del equipo están escritos en `index.html`, en una lista de tarjetas fija. Se muestran sin JavaScript y no dependen de LocalStorage. Los textos de misión, visión y modelo de negocio también se editan en ese archivo.

Andi es un cóndor andino original de plumaje gris oscuro, collar blanco y pico dorado. Representa el cuidado de la biodiversidad y el turismo responsable. El recurso vectorial está en `assets/images/andi.svg`: el fragmento `#retrato` muestra su cara en el logo y el ícono de la pestaña, y la versión completa aparece en «Nosotros». La animación de alas y el balanceo se definen en el CSS del propio SVG y se desactivan con `prefers-reduced-motion: reduce`. Todas las rutas son relativas, compatibles con GitHub Pages. La entrega autocontenida también integra el SVG y su fragmento de retrato.

Para agregar alojamientos, mantené un `id` único en `js/data.js` y usá el identificador de uno de los destinos. El orden de los cinco valores de `indicators` coincide con `indicatorNames`. `blocked` contiene intervalos de días relativos a hoy, con inicio incluido y fin excluido. Las imágenes deben estar en `assets/images`; si falla una foto se muestra una ilustración local.

La interfaz usa DM Sans y Fraunces, distribuidas por Google Fonts, alojadas localmente. Respeta la preferencia de movimiento reducido, incluye acceso por teclado, etiquetas de formulario, estados de error y diálogos que se cierran con Escape. El diseño se comprobó desde 360 hasta 1920 px.

## Datos en el navegador

LocalStorage conserva exclusivamente estas claves:

| Clave                    | Contenido                                                           |
| ------------------------ | ------------------------------------------------------------------- |
| `rumbo-vivo:favorites`   | Identificadores de alojamientos favoritos                           |
| `rumbo-vivo:preferences` | Destino, presupuesto, tipo, criterios, orden y cantidad de viajeros |

Las fechas no se conservan para evitar búsquedas desactualizadas. El contacto no se persiste. Si el navegador bloquea LocalStorage, la página sigue funcionando durante la visita y avisa que no puede guardar. Las preferencias se comparten solo dentro del mismo origen: cambiar de puerto o de navegador no traslada los favoritos.

## Comprobaciones

Con el servidor estático iniciado, ejecutá:

```bash
python3 -m unittest discover -s tests -v
```

Las veinte pruebas cubren catálogo, imágenes y tipografías locales, destinos, filtros combinados, ordenamiento, fechas inválidas, disponibilidad simulada, capacidad, favoritos persistentes, modales, cálculo del plan, comparador, contacto, equipo, menú móvil, vínculos, anchos de pantalla, LocalStorage dañado o bloqueado, imagen de respaldo, equipo sin JavaScript y animación de Andi con movimiento reducido. También abren el HTML autocontenido en una carpeta vacía y verifican que el ZIP conserve los estilos y funcione después de extraerlo.

El entorno preparado ya incluye Python, Playwright y Chromium. Para usar las pruebas en otra máquina, instalá Playwright en un entorno virtual y su navegador:

```bash
python3 -m venv .venv
# Linux/macOS:
source .venv/bin/activate
# Windows PowerShell: .venv\Scripts\Activate.ps1
python -m pip install playwright
python -m playwright install chromium
python -m unittest discover -s tests -v
```

El runner usa `/usr/bin/chromium` si existe y, si no, el navegador instalado por Playwright. Se puede indicar otra ruta con `CHROMIUM_PATH` y otro servidor con `RUMBO_BASE_URL`.

La versión entregada pasó las 20 pruebas en Chromium. También se revisaron visualmente escritorio y móvil y se ejecutó axe-core sobre la página y el modal de detalles, sin infracciones automáticas detectadas de WCAG A/AA en esas vistas. Esto no reemplaza una auditoría manual completa de accesibilidad ni una prueba en todos los navegadores.

## Regenerar los archivos de entrega

Después de editar los archivos fuente, actualizá la copia autocontenida:

```bash
python3 scripts/package_site.py
```

Para generar también un ZIP con los archivos del proyecto:

```bash
python3 scripts/package_site.py --zip Rumbo-Vivo.zip
```

El script usa únicamente la biblioteca estándar de Python. El ZIP excluye los metadatos de Git y los cachés. `Rumbo-Vivo.html` es un archivo generado: los cambios de diseño o contenido se hacen en `index.html`, `css`, `js` y `assets`, y luego se vuelve a generar la entrega.

## Alcance

Rumbo Vivo es una startup ficticia. Los alojamientos, los precios, la disponibilidad y las prácticas de sus fichas son datos académicos. Las fotografías son referencias visuales y no corresponden a establecimientos contratables a través de esta página. No se gestionan reservas, pagos, comisiones ni mensajes de correo.

El modelo de negocio descrito propone comisiones transparentes mediante futuras alianzas, con visibilidad para los pequeños emprendimientos. Es una propuesta del trabajo, no una operación comercial implementada.

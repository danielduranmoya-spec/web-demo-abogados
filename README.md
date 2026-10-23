# Valdés & Moncayo Abogados · web interactiva 3D (concepto)

Web de un despacho de abogados **ficticio** en Mérida (Badajoz). Es un ejemplo de la tarifa *Web interactiva 3D (desde 1.690 €)* del portfolio: una balanza de latón en 3D, sobre una columna romana de mármol, que se inclina con lo que el visitante aporta a su caso.

Web publicada: https://danielduranmoya-spec.github.io/web-demo-abogados/

```
web-demo-abogados/
├── index.html          ← estructura, textos, SEO (JSON-LD LegalService y FAQPage)
├── style.css           ← estilos: colores, tipografías y espaciado al principio, en :root
├── script.js           ← menú, título animado, balanza del caso, vídeo interactivo, cita, cookies
├── escena.js           ← escena 3D con three.js: colocación, luces, física de la balanza
├── modelo.js           ← la columna, la balanza y los objetos 3D, hechos con código
├── media/              ← vídeo interactivo (mp4 + subtítulos), póster e imagen para redes
├── herramientas/       ← generador del vídeo (fotogramas con Playwright + música)
├── aviso-legal.html · privacidad.html · cookies.html   ← plantillas: completa los [PENDIENTE]
├── sitemap.xml
└── favicon.svg
```

## Diseño

- **Animación** (inspirada en *AKOR Security* de motionsites.ai): el título se revela palabra a palabra por máscara con desenfoque, un barrido de luz recorre las letras y los botones dorados, la columna aparece de abajo arriba con un plano de recorte y un foco barre el latón cada 9 segundos. Una rejilla dorada sigue al cursor en el inicio.
- **Tipografías**: Bodoni Moda (títulos) y Manrope (texto).
- **Colores**: verde botella `#0E2A24`, latón `#C9A15B`, marfil `#F3EEE4` y burdeos `#6E1F2B`.

## La escena 3D

1. **Inicio**: la columna (basa ática, fuste estriado con éntasis, capitel dórico e inscripción «IVSTITIA · EMERITA») se revela desde la base y gira despacio. El monumento sigue al ratón.
2. **La balanza de tu caso**: cada casilla deja caer un objeto en el platillo derecho (documentos con lacre, un móvil, dos figuras de testigos, un reloj de arena, una carpeta pericial). En el izquierdo están las pesas de «la otra parte». La balanza se mueve con un muelle amortiguado y los platillos se balancean con cada golpe.
3. Todo está hecho con geometría de three.js, sin modelos descargados: pesa poco y carga enseguida.

### En cualquier dispositivo

- Calidad automática (alta, media o baja): resolución, sombras y partículas. Si el móvil va lento, baja la resolución sobre la marcha.
- La escena no se dibuja cuando no se ve o la pestaña está oculta.
- Con **movimiento reducido** activado, no hay giros ni barridos y la balanza se coloca sin oscilar.
- **Sin WebGL**, se muestra una ilustración de la balanza y todo lo demás funciona igual.

## El vídeo interactivo

`media/consulta.mp4` (50 s) tiene seis capítulos. Al terminar la intro el vídeo se para y pregunta «¿Cuál es tu caso?»: según la respuesta salta a Familia, Despido, Denuncia o Empresa, y después al cierre, donde aparece el botón «Pedir esta cita». Si no se elige en 10 segundos, sigue con Familia. Los capítulos se cambian en la barra inferior y en `CAPITULOS` de `script.js`.

Para regenerarlo (cambiar textos o precios): edita `herramientas/consulta-video.html`, sirve la carpeta con un servidor local y ejecuta

```bash
node herramientas/fotogramas.mjs "http://localhost:8080/herramientas/consulta-video.html" fotogramas 1280 720 25 0 50
python3 herramientas/musica.py musica.wav 50 84 "8,17,26,35,44"
ffmpeg -framerate 25 -i fotogramas/f%05d.jpg -i musica.wav -c:v libx264 -crf 26 -pix_fmt yuv420p -movflags +faststart -c:a aac -shortest media/consulta.mp4
```

## Abrirla en VS Code

```bash
git clone https://github.com/danielduranmoya-spec/web-demo-abogados.git
code web-demo-abogados
```

Usa la extensión **Live Server** (clic derecho en `index.html` → *Open with Live Server*). La escena 3D es un módulo de JavaScript y los navegadores no lo cargan con doble clic (`file://`).

## Qué cambiar para un cliente real

- **Teléfono, WhatsApp, correo y horario**: `CONFIG` al principio de `script.js`, el JSON-LD del `<head>` y la sección de cita de `index.html`.
- **Pesos de la balanza**: `data-w` de cada casilla en `index.html` y `contrapeso` en `CONFIG`.
- **Encuadre del 3D**: `ENCUADRES` en `escena.js` y los elementos `data-anchor` (`.hero__anchor`, `.balanza__anchor`).
- **Colores**: variables de `:root` en `style.css`.
- **Indexación**: quita `noindex` del `<head>` y la barra «Concepto» (`.concept-bar`).

## Publicar

GitHub Pages desde la rama `main` (carpeta raíz). Cada `git push` a `main` actualiza la web en uno o dos minutos.

/* =========================================================
   Valdés & Moncayo · escena 3D (three.js r186)
   Una columna romana con una balanza de latón, fija detrás
   del contenido. Se coloca en el elemento [data-anchor] de la
   sección visible y se inclina con lo que se marca en
   «La balanza de tu caso» (evento vm:pesos de script.js).
   ========================================================= */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { crearMonumento, HUECOS, MEDIDAS } from './modelo.js';

const stage = document.querySelector('[data-stage]');
const canvas = document.querySelector('[data-canvas]');
const fallback = document.querySelector('[data-fallback]');
const etiquetaCalidad = document.querySelector('[data-quality]');
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Qué parte del monumento se encuadra en cada ancla (centro y alto, en metros)
const ENCUADRES = {
  hero: { centro: 2.45, alto: 5.1, ancho: 3.6, yaw: -0.5, pitch: 0.0 },
  balanza: { centro: 3.95, alto: 2.15, ancho: 3.9, yaw: 0, pitch: 0.06 }
};

function calidad() {
  const movil = matchMedia('(pointer: coarse)').matches || innerWidth < 760;
  const mem = navigator.deviceMemory || 8;
  if (movil && mem <= 4) return { nombre: 'bajo', dpr: 1.25, sombras: false };
  if (movil) return { nombre: 'medio', dpr: 1.75, sombras: false };
  return { nombre: 'alto', dpr: 2, sombras: true };
}

function mostrarFallback(err) {
  console.warn('[escena] sin 3D:', err);
  canvas.hidden = true; fallback.hidden = false;
}

function iniciar() {
  const nivel = calidad();
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: nivel.nombre !== 'bajo', alpha: true, powerPreference: 'high-performance' });
  } catch (e) { mostrarFallback(e); return; }
  renderer.setPixelRatio(Math.min(devicePixelRatio, nivel.dpr));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = nivel.sombras;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.localClippingEnabled = true;
  etiquetaCalidad.textContent = '3D · calidad ' + nivel.nombre;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.75;

  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  camera.position.set(0, 0, 14);

  // Luces: clave cálida, contraluz verde y un foco que barre el latón (AKOR)
  scene.add(new THREE.HemisphereLight(0xFFF1D6, 0x0B211C, 0.5));
  const clave = new THREE.DirectionalLight(0xFFE2B0, 2.4); clave.position.set(-4, 7, 6);
  clave.castShadow = nivel.sombras; clave.shadow.mapSize.set(1024, 1024);
  Object.assign(clave.shadow.camera, { left: -4, right: 4, top: 4, bottom: -4, near: 1, far: 30 });
  scene.add(clave);
  const contra = new THREE.DirectionalLight(0x6FD1B4, 1.6); contra.position.set(5, 3, -6); scene.add(contra);
  const barrido = new THREE.SpotLight(0xFFF3D6, 0, 30, 0.22, 0.6, 1.2); scene.add(barrido); scene.add(barrido.target);

  const mon = crearMonumento(nivel.nombre);
  const pivote = new THREE.Group(); // gira el monumento sobre su eje
  pivote.add(mon.raiz); scene.add(pivote);

  // Revelado por máscara: un plano de recorte sube desde la base
  const recorte = new THREE.Plane(new THREE.Vector3(0, -1, 0), 0);
  const conRecorte = [];
  mon.raiz.traverse(o => { if (o.isMesh) { o.material = o.material.clone(); o.material.clippingPlanes = [recorte]; conRecorte.push(o.material); } });

  // Polvo en suspensión iluminado
  const nPolvo = nivel.nombre === 'bajo' ? 120 : 260;
  const polvoGeo = new THREE.BufferGeometry();
  const pp = new Float32Array(nPolvo * 3);
  for (let i = 0; i < nPolvo; i++) { pp[i * 3] = (Math.random() - 0.5) * 7; pp[i * 3 + 1] = Math.random() * 6; pp[i * 3 + 2] = (Math.random() - 0.5) * 4; }
  polvoGeo.setAttribute('position', new THREE.BufferAttribute(pp, 3));
  const polvo = new THREE.Points(polvoGeo, new THREE.PointsMaterial({ color: 0xE3C68A, size: 0.025, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending }));
  mon.raiz.add(polvo);

  // Sombra de contacto falsa bajo el plinto
  const sc = document.createElement('canvas'); sc.width = sc.height = 128;
  const sg = sc.getContext('2d'); const gr = sg.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, 'rgba(0,0,0,.65)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); sg.fillStyle = gr; sg.fillRect(0, 0, 128, 128);
  const sombra = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 3.4), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(sc), transparent: true, depthWrite: false }));
  sombra.rotation.x = -Math.PI / 2; sombra.position.y = 0.002; mon.raiz.add(sombra);

  /* ---------- Objetos y física de la balanza ---------- */
  const enPlato = {};          // tipo → { obj, t0 }
  let objetivo = 0, angulo = 0, velocidad = 0, balanceo = 0, velBal = 0;
  const contrapeso = 5, maxPeso = 12;
  function calcularObjetivo(total) {
    return THREE.MathUtils.clamp((contrapeso - total) / (maxPeso - contrapeso), -1, 1) * MEDIDAS.anguloMax;
  }
  objetivo = calcularObjetivo(0);
  angulo = reduceMotion ? objetivo : 0;

  window.addEventListener('vm:pesos', (e) => {
    const { items, total } = e.detail;
    Object.keys(HUECOS).forEach(tipo => {
      const quiere = items.includes(tipo);
      if (quiere && !enPlato[tipo]) {
        const obj = mon.objeto(tipo);
        obj.traverse(o => { if (o.isMesh) { o.material = o.material.clone(); o.material.clippingPlanes = [recorte]; } });
        const [x, z] = HUECOS[tipo]; obj.position.set(x, reduceMotion ? 0 : 1.6, z);
        obj.userData.cae = !reduceMotion; obj.userData.vy = 0; obj.userData.giro = (Math.random() - 0.5) * 3;
        mon.lados.der.contenido.add(obj); enPlato[tipo] = obj;
        velBal += 0.05; // el golpe hace bailar el platillo
      } else if (!quiere && enPlato[tipo]) {
        const obj = enPlato[tipo]; delete enPlato[tipo];
        obj.userData.sale = true; obj.userData.vy = 2.2;
        if (reduceMotion) obj.parent.remove(obj);
      }
    });
    objetivo = calcularObjetivo(total);
    if (reduceMotion) angulo = objetivo;
  });

  /* ---------- Colocación según la sección ---------- */
  const anclas = [...document.querySelectorAll('[data-anchor]')].map(el => ({ el, enc: ENCUADRES[el.getAttribute('data-anchor')] }));
  const estado = { x: 0, y: 0, s: 1, yaw: ENCUADRES.hero.yaw, pitch: 0 };
  const destino = { ...estado };
  let primero = true, visible = true;
  const mouse = { x: 0, y: 0, sx: 0, sy: 0 };
  addEventListener('pointermove', e => { mouse.x = e.clientX / innerWidth - 0.5; mouse.y = e.clientY / innerHeight - 0.5; }, { passive: true });

  function mundoPorPixel() { return 2 * camera.position.z * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) / innerHeight; }
  function calcularDestino() {
    const vh = innerHeight, k = mundoPorPixel();
    let mejor = null, pesoTotal = 0; const acc = { x: 0, y: 0, s: 0, yaw: 0, pitch: 0 };
    anclas.forEach(a => {
      const r = a.el.getBoundingClientRect();
      // Peso según lo cerca que esté el ancla del centro de la pantalla
      const cy = r.top + r.height / 2; const d = Math.abs(cy - vh / 2) / vh;
      const w = Math.max(0, 1 - d * 1.4) ** 3 + 1e-4;
      const s = Math.min(r.height * k / a.enc.alto, r.width * k / a.enc.ancho);
      const x = (r.left + r.width / 2 - innerWidth / 2) * k;
      const y = -(cy - vh / 2) * k - a.enc.centro * s;
      acc.x += x * w; acc.y += y * w; acc.s += s * w; acc.yaw += a.enc.yaw * w; acc.pitch += a.enc.pitch * w; pesoTotal += w;
      if (!mejor || w > mejor.w) mejor = { w, r };
    });
    Object.keys(acc).forEach(key => { destino[key] = acc[key] / pesoTotal; });
    // ¿Se ve alguna ancla? Si no, se para el render
    const algunaVisible = anclas.some(a => { const r = a.el.getBoundingClientRect(); return r.bottom > -vh * 0.2 && r.top < vh * 1.2; });
    if (algunaVisible !== visible) { visible = algunaVisible; stage.classList.toggle('is-off', !visible); }
  }

  function redimensionar() {
    const w = innerWidth, h = innerHeight;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
    calcularDestino();
  }
  addEventListener('resize', redimensionar);
  addEventListener('scroll', calcularDestino, { passive: true });
  redimensionar();

  /* ---------- Bucle ---------- */
  let t = 0, antes = performance.now();
  const inicio = performance.now();
  const intro = { dur: reduceMotion ? 0 : 2.6 };
  let fpsLento = 0;
  function frame() {
    requestAnimationFrame(frame);
    const ahora = performance.now(); const dtReal = (ahora - antes) / 1000; antes = ahora;
    if (!visible || document.hidden) return;
    const dt = Math.min(dtReal, 0.05); t = (ahora - inicio) / 1000; // t: tiempo real, para que la intro dure lo mismo en un móvil lento
    if (dt > 0.034 && renderer.getPixelRatio() > 1) { if (++fpsLento > 90) { renderer.setPixelRatio(Math.max(1, renderer.getPixelRatio() - 0.25)); fpsLento = 0; } } else fpsLento = Math.max(0, fpsLento - 1);

    // Seguir el destino con suavidad
    const f = primero || reduceMotion ? 1 : 1 - Math.exp(-dt * 5);
    primero = false;
    ['x', 'y', 's', 'yaw', 'pitch'].forEach(k => { estado[k] += (destino[k] - estado[k]) * f; });
    mouse.sx += (mouse.x - mouse.sx) * (1 - Math.exp(-dt * 3)); mouse.sy += (mouse.y - mouse.sy) * (1 - Math.exp(-dt * 3));
    pivote.position.set(estado.x, estado.y, 0);
    pivote.scale.setScalar(estado.s);
    const enHero = Math.abs(estado.yaw - ENCUADRES.hero.yaw) < 0.25;
    const giroLento = reduceMotion ? 0 : Math.sin(t * 0.25) * 0.35 * (enHero ? 1 : 0.15);
    pivote.rotation.y = estado.yaw + giroLento + (reduceMotion ? 0 : mouse.sx * 0.35);
    pivote.rotation.x = estado.pitch + (reduceMotion ? 0 : mouse.sy * 0.08);

    // Intro: revelado de abajo arriba y barrido de luz
    const ki = intro.dur ? THREE.MathUtils.clamp(t / intro.dur, 0, 1) : 1;
    const ease = 1 - Math.pow(1 - ki, 3);
    recorte.constant = (-0.2 + ease * 5.4) * estado.s + estado.y; // el plano está en coordenadas de mundo
    if (ki >= 1) recorte.constant = 1e4;
    const ciclo = (t % 9) / 9; // un barrido cada 9 s
    const sweep = reduceMotion ? 0 : (ciclo < 0.3 ? Math.sin(ciclo / 0.3 * Math.PI) : 0);
    barrido.intensity = sweep * 260;
    barrido.position.set(estado.x + (-5 + ciclo / 0.3 * 10) * estado.s, estado.y + 7 * estado.s, 6);
    barrido.target.position.set(estado.x, estado.y + MEDIDAS.pivote * estado.s, 0);

    // Muelle amortiguado de la balanza
    if (!reduceMotion) {
      const fuerza = (objetivo - angulo) * 26 - velocidad * 5.2;
      velocidad += fuerza * dt; angulo += velocidad * dt;
      velBal += (-balanceo * 30 - velBal * 2.4 + velocidad * 3) * dt; balanceo += velBal * dt;
    }
    mon.inclinar(angulo, balanceo);

    // Objetos que caen al platillo o salen volando
    const cont = mon.lados.der.contenido;
    for (let i = cont.children.length - 1; i >= 0; i--) {
      const o = cont.children[i], u = o.userData;
      if (u.cae) {
        u.vy -= 9.8 * dt; o.position.y += u.vy * dt; o.rotation.y += u.giro * dt;
        if (o.position.y <= 0) { o.position.y = 0; if (Math.abs(u.vy) > 0.6) { u.vy *= -0.28; velBal += 0.04; } else { u.cae = false; u.vy = 0; } }
      } else if (u.sale) {
        u.vy -= 4 * dt; o.position.y += u.vy * dt; o.scale.multiplyScalar(1 - dt * 3);
        if (o.scale.x < 0.05) cont.remove(o);
      }
    }
    // Polvo flotando
    if (!reduceMotion) {
      const pa = polvoGeo.attributes.position;
      for (let i = 0; i < nPolvo; i++) { let y = pa.getY(i) + dt * 0.08; if (y > 6) y = 0; pa.setY(i, y); pa.setX(i, pa.getX(i) + Math.sin(t * 0.4 + i) * dt * 0.02); }
      pa.needsUpdate = true;
    }
    renderer.render(scene, camera);
  }
  frame();
  document.documentElement.classList.add('has-3d');
  window.VM = window.VM || {};
  window.VM.escena = { renderer, scene, camera, monumento: mon };
  if (window.VM.pesos) window.VM.pesos();
}

const retry = document.querySelector('[data-retry]');
if (retry) retry.addEventListener('click', () => location.reload());

// La inscripción del plinto usa Bodoni Moda: se espera a la fuente (como mucho 1,5 s)
try { await Promise.race([document.fonts.load('500 92px "Bodoni Moda"'), new Promise(r => setTimeout(r, 1500))]); } catch (e) { /* sigue con la fuente de reserva */ }

try {
  const test = document.createElement('canvas');
  const gl = test.getContext('webgl2') || test.getContext('webgl');
  if (!gl) throw new Error('WebGL no disponible');
  iniciar();
} catch (e) { mostrarFallback(e); }

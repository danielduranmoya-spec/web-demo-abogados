/* =========================================================
   Valdés & Moncayo · modelo 3D hecho con código
   Columna romana de mármol (Augusta Emerita) con una balanza
   de latón encima, y los objetos que se ponen en los platillos.
   Lo usan escena.js (la web) y el generador del vídeo.
   Medidas en metros aproximados; la base de la columna está en y = 0.
   ========================================================= */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export const MEDIDAS = {
  alturaColumna: 3.05,       // plinto + fuste + capitel
  pivote: 4.42,              // altura del eje de la balanza
  brazo: 1.28,               // media longitud del astil
  cuelgue: 1.02,             // de la punta del astil al fondo del platillo
  radioPlato: 0.56,
  anguloMax: 0.3             // radianes de inclinación con todo el peso a un lado
};

/* ---------- Texturas generadas en lienzo ---------- */
function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

function texturaMarmol(size) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  const g = c.getContext('2d'); const r = rng(7);
  g.fillStyle = '#EDE6D8'; g.fillRect(0, 0, size, size);
  // Nubes suaves
  for (let i = 0; i < 260; i++) {
    const x = r() * size, y = r() * size, rad = (0.03 + r() * 0.12) * size;
    const grd = g.createRadialGradient(x, y, 0, x, y, rad);
    const tono = r() < 0.5 ? '210,198,176' : '250,246,238';
    grd.addColorStop(0, `rgba(${tono},${0.08 + r() * 0.1})`); grd.addColorStop(1, `rgba(${tono},0)`);
    g.fillStyle = grd; g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
  // Vetas
  g.lineCap = 'round';
  for (let v = 0; v < 14; v++) {
    let x = r() * size, y = -20, a = Math.PI / 2 + (r() - 0.5) * 0.9;
    g.strokeStyle = `rgba(${120 + r() * 40},${110 + r() * 30},${95 + r() * 25},${0.18 + r() * 0.3})`;
    g.lineWidth = 0.6 + r() * 2.2; g.beginPath(); g.moveTo(x, y);
    while (y < size + 20) { a += (r() - 0.5) * 0.35; x += Math.cos(a) * 6; y += Math.abs(Math.sin(a)) * 6 + 1; g.lineTo(x, y); }
    g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4;
  return t;
}

function texturaInscripcion() {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#E9E1D1'; g.fillRect(0, 0, c.width, c.height);
  g.strokeStyle = 'rgba(90,75,55,.55)'; g.lineWidth = 6; g.strokeRect(26, 26, c.width - 52, c.height - 52);
  g.fillStyle = 'rgba(70,58,42,.85)';
  g.font = '500 92px "Bodoni Moda", Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText('IVSTITIA · EMERITA', c.width / 2, c.height / 2 + 4);
  // Sombra interior para que parezca grabado
  g.globalCompositeOperation = 'multiply'; g.fillStyle = 'rgba(0,0,0,.08)'; g.fillRect(0, 0, c.width, 34);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}

/* ---------- Materiales ---------- */
export function materiales(nivel = 'alto') {
  const marmol = texturaMarmol(nivel === 'bajo' ? 512 : 1024);
  return {
    marmol: new THREE.MeshStandardMaterial({ map: marmol, roughness: 0.42, metalness: 0, envMapIntensity: 0.7 }),
    inscripcion: new THREE.MeshStandardMaterial({ map: texturaInscripcion(), roughness: 0.55, envMapIntensity: 0.6 }),
    laton: new THREE.MeshPhysicalMaterial({ color: 0xD3A65C, metalness: 1, roughness: 0.24, clearcoat: 0.35, clearcoatRoughness: 0.3, envMapIntensity: 1.25 }),
    latonOscuro: new THREE.MeshStandardMaterial({ color: 0x9C7436, metalness: 1, roughness: 0.38, envMapIntensity: 1.1 }),
    papel: new THREE.MeshStandardMaterial({ color: 0xF4EEE2, roughness: 0.85 }),
    papelLinea: new THREE.MeshStandardMaterial({ color: 0xCFC4AE, roughness: 0.9 }),
    lacre: new THREE.MeshPhysicalMaterial({ color: 0x7A1F2C, roughness: 0.35, clearcoat: 0.6 }),
    vidrio: new THREE.MeshPhysicalMaterial({ color: 0xffffff, metalness: 0, roughness: 0.05, transmission: 0.9, thickness: 0.05, transparent: true, opacity: 0.55, envMapIntensity: 1.2 }),
    arena: new THREE.MeshStandardMaterial({ color: 0xD9B677, roughness: 0.95 }),
    pantalla: new THREE.MeshPhysicalMaterial({ color: 0x0C1A17, roughness: 0.15, metalness: 0.2, clearcoat: 1, emissive: 0x1D5A4A, emissiveIntensity: 0.35 }),
    carcasa: new THREE.MeshStandardMaterial({ color: 0x1D2624, roughness: 0.4, metalness: 0.6 }),
    figura: new THREE.MeshPhysicalMaterial({ color: 0x2A5A4E, roughness: 0.3, metalness: 0.1, clearcoat: 0.8, clearcoatRoughness: 0.2 }),
    carpeta: new THREE.MeshStandardMaterial({ color: 0x6E1F2B, roughness: 0.6 })
  };
}

/* ---------- Piezas ---------- */
function lathe(puntos, seg = 64) { return new THREE.LatheGeometry(puntos.map(p => new THREE.Vector2(p[0], p[1])), seg); }

function fusteEstriado(radioAbajo, radioArriba, alto, estrias, seg) {
  const geo = new THREE.CylinderGeometry(radioArriba, radioAbajo, alto, estrias * 6, seg, true);
  const pos = geo.attributes.position; const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const ang = Math.atan2(v.z, v.x);
    const r = Math.hypot(v.x, v.z);
    const k = 1 - 0.035 * Math.pow(Math.abs(Math.cos(ang * estrias / 2)), 1.6);
    // Éntasis: el fuste se ensancha un poco a un tercio de su altura
    const h = (v.y / alto) + 0.5; const entasis = 1 + 0.025 * Math.sin(Math.min(1, h * 1.4) * Math.PI);
    v.x = Math.cos(ang) * r * k * entasis; v.z = Math.sin(ang) * r * k * entasis;
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();
  return geo;
}

function cadena(desde, hasta, eslabones) {
  const geos = []; const dir = new THREE.Vector3().subVectors(hasta, desde); const len = dir.length();
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
  const paso = len / eslabones;
  for (let i = 0; i < eslabones; i++) {
    const t = new THREE.TorusGeometry(paso * 0.42, 0.0085, 6, 12);
    t.scale(0.62, 1, 1);
    const m = new THREE.Matrix4();
    const rot = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), i % 2 ? Math.PI / 2 : 0);
    const p = desde.clone().addScaledVector(dir, (i + 0.5) / eslabones);
    m.compose(p, q.clone().multiply(rot), new THREE.Vector3(1, 1, 1));
    t.applyMatrix4(m); geos.push(t);
  }
  return mergeGeometries(geos);
}

function platillo(mat, M) {
  const g = new THREE.Group();
  const R = M.radioPlato;
  const bowl = new THREE.Mesh(lathe([[0, 0], [R * 0.55, 0.012], [R * 0.86, 0.05], [R, 0.12], [R * 1.02, 0.13], [R * 0.99, 0.135], [R * 0.84, 0.065], [R * 0.54, 0.028], [0, 0.02]], 72), mat.laton);
  bowl.castShadow = true; g.add(bowl);
  // Cadenas: tres, desde el borde hasta el gancho
  const gancho = new THREE.Vector3(0, M.cuelgue, 0);
  const geos = [];
  for (let k = 0; k < 3; k++) {
    const a = k / 3 * Math.PI * 2 + Math.PI / 6;
    geos.push(cadena(new THREE.Vector3(Math.cos(a) * R * 0.97, 0.13, Math.sin(a) * R * 0.97), gancho, 22));
  }
  g.add(new THREE.Mesh(mergeGeometries(geos), mat.laton));
  const aro = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.011, 8, 20), mat.laton);
  aro.position.y = M.cuelgue + 0.03; g.add(aro);
  const contenido = new THREE.Group(); contenido.position.y = 0.03; g.add(contenido);
  g.userData.contenido = contenido;
  return g;
}

/* ---------- Objetos que pesan ---------- */
export function crearObjeto(tipo, mat) {
  const g = new THREE.Group();
  if (tipo === 'docs') {
    for (let i = 0; i < 6; i++) {
      const h = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.012, 0.3), mat.papel);
      h.position.y = 0.008 + i * 0.014; h.rotation.y = (i % 3 - 1) * 0.06; g.add(h);
    }
    const sello = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.055, 0.02, 24), mat.lacre);
    sello.position.set(0.11, 0.1, 0.07); g.add(sello);
    for (let l = 0; l < 4; l++) {
      const ln = new THREE.Mesh(new THREE.BoxGeometry(0.26 - (l === 3 ? 0.1 : 0), 0.002, 0.012), mat.papelLinea);
      ln.position.set(-0.04 - (l === 3 ? 0.05 : 0), 0.093, -0.08 + l * 0.045); g.add(ln);
    }
  } else if (tipo === 'mensajes') {
    const c = new THREE.Mesh(new RoundedBoxGeometry(0.2, 0.028, 0.4, 4, 0.03), mat.carcasa); c.position.y = 0.014; g.add(c);
    const p = new THREE.Mesh(new RoundedBoxGeometry(0.18, 0.004, 0.37, 2, 0.02), mat.pantalla); p.position.y = 0.03; g.add(p);
    for (let b = 0; b < 3; b++) {
      const bu = new THREE.Mesh(new RoundedBoxGeometry(0.11, 0.003, 0.05, 2, 0.012), b % 2 ? mat.laton : mat.papel);
      bu.position.set(b % 2 ? 0.025 : -0.025, 0.034, -0.1 + b * 0.075); g.add(bu);
    }
    g.rotation.y = 0.5;
  } else if (tipo === 'testigos') {
    // Dos personajes: figuras de testigo en esmalte verde
    const perfil = [[0, 0], [0.085, 0], [0.09, 0.02], [0.06, 0.035], [0.045, 0.09], [0.036, 0.16], [0.06, 0.175], [0.04, 0.19], [0.0, 0.19]];
    for (let k = 0; k < 2; k++) {
      const f = new THREE.Group();
      f.add(new THREE.Mesh(lathe(perfil, 40), mat.figura));
      const cabeza = new THREE.Mesh(new THREE.SphereGeometry(0.055, 32, 20), mat.figura); cabeza.position.y = 0.24; f.add(cabeza);
      const brazos = new THREE.Mesh(new THREE.CapsuleGeometry(0.018, 0.13, 4, 12), mat.figura);
      brazos.rotation.z = Math.PI / 2; brazos.position.y = 0.135; f.add(brazos);
      f.position.set(k ? 0.1 : -0.1, 0, k ? 0.04 : -0.03); f.scale.setScalar(k ? 0.92 : 1.05);
      f.rotation.y = k ? -0.4 : 0.3; g.add(f);
    }
  } else if (tipo === 'plazo') {
    // Reloj de arena
    const tapa = () => new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.022, 32), mat.laton);
    const a = tapa(); a.position.y = 0.011; g.add(a);
    const b = tapa(); b.position.y = 0.33; g.add(b);
    for (let k = 0; k < 3; k++) {
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.3, 8), mat.latonOscuro);
      const an = k / 3 * Math.PI * 2; col.position.set(Math.cos(an) * 0.088, 0.17, Math.sin(an) * 0.088); g.add(col);
    }
    const vid = new THREE.Mesh(lathe([[0.0, 0.025], [0.07, 0.04], [0.075, 0.09], [0.04, 0.15], [0.012, 0.17], [0.04, 0.19], [0.075, 0.25], [0.07, 0.3], [0.0, 0.318]], 40), mat.vidrio); g.add(vid);
    const arenaAbajo = new THREE.Mesh(new THREE.ConeGeometry(0.062, 0.06, 32), mat.arena); arenaAbajo.position.y = 0.065; g.add(arenaAbajo);
    const arenaArriba = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.05, 32), mat.arena); arenaArriba.rotation.x = Math.PI; arenaArriba.position.y = 0.205; g.add(arenaArriba);
  } else if (tipo === 'pericial') {
    const c = new THREE.Mesh(new RoundedBoxGeometry(0.36, 0.05, 0.27, 3, 0.012), mat.carpeta); c.position.y = 0.025; g.add(c);
    const et = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.002, 0.06), mat.papel); et.position.set(0, 0.051, -0.05); g.add(et);
    const cinta = new THREE.Mesh(new THREE.BoxGeometry(0.37, 0.052, 0.025), mat.laton); cinta.position.set(0, 0.026, 0.06); g.add(cinta);
    g.rotation.y = -0.35;
  } else if (tipo === 'pesas') {
    // Contrapeso de «la otra parte»: pesas de latón
    const pesa = (r, h) => new THREE.Mesh(lathe([[0, 0], [r, 0], [r, h * 0.7], [r * 0.7, h], [r * 0.3, h], [r * 0.3, h * 1.25], [r * 0.45, h * 1.4], [0, h * 1.45]], 48), mat.laton);
    const p1 = pesa(0.17, 0.16); g.add(p1);
    const p2 = pesa(0.11, 0.11); p2.position.set(0.24, 0, 0.12); g.add(p2);
    const p3 = pesa(0.09, 0.09); p3.position.set(-0.22, 0, 0.14); g.add(p3);
    const p4 = pesa(0.075, 0.075); p4.position.set(0.05, 0, -0.25); g.add(p4);
  }
  g.traverse(o => { if (o.isMesh) { o.castShadow = true; } });
  return g;
}

// Dónde cae cada objeto dentro del platillo
export const HUECOS = { docs: [0.0, 0.0], mensajes: [-0.27, 0.12], testigos: [0.24, -0.2], plazo: [0.25, 0.2], pericial: [-0.18, -0.24] };

/* ---------- Monumento completo ---------- */
export function crearMonumento(nivel = 'alto') {
  const M = MEDIDAS; const mat = materiales(nivel);
  const raiz = new THREE.Group(); raiz.name = 'monumento';
  const seg = nivel === 'bajo' ? 40 : 72;

  // Plinto con inscripción
  const plinto = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.34, 1.25), mat.marmol); plinto.position.y = 0.17; raiz.add(plinto);
  const plinto2 = new THREE.Mesh(new THREE.BoxGeometry(1.36, 0.06, 1.36), mat.marmol); plinto2.position.y = 0.03; raiz.add(plinto2);
  const insc = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.27), mat.inscripcion); insc.position.set(0, 0.18, 0.6251); raiz.add(insc);
  // Basa ática
  const basa = new THREE.Mesh(lathe([[0, 0.34], [0.55, 0.34], [0.55, 0.39], [0.5, 0.42], [0.5, 0.44], [0.46, 0.47], [0.47, 0.5], [0.43, 0.53], [0, 0.53]], seg), mat.marmol); raiz.add(basa);
  // Fuste
  const altoFuste = 2.18;
  const fuste = new THREE.Mesh(fusteEstriado(0.41, 0.36, altoFuste, 20, 24), mat.marmol); fuste.position.y = 0.53 + altoFuste / 2; raiz.add(fuste);
  const yCap = 0.53 + altoFuste;
  // Capitel dórico con equino y ábaco
  const capitel = new THREE.Mesh(lathe([[0, yCap], [0.37, yCap], [0.39, yCap + 0.03], [0.37, yCap + 0.05], [0.4, yCap + 0.07], [0.5, yCap + 0.15], [0.54, yCap + 0.2], [0, yCap + 0.2]], seg), mat.marmol); raiz.add(capitel);
  const abaco = new THREE.Mesh(new THREE.BoxGeometry(1.14, 0.13, 1.14), mat.marmol); abaco.position.y = yCap + 0.265; raiz.add(abaco);
  const yTop = yCap + 0.33; // ≈ 3.04

  // Balanza: pie, columna, eje
  const pie = new THREE.Mesh(lathe([[0, yTop], [0.3, yTop], [0.3, yTop + 0.03], [0.22, yTop + 0.07], [0.1, yTop + 0.12], [0.06, yTop + 0.2], [0, yTop + 0.2]], 64), mat.laton); raiz.add(pie);
  const vara = new THREE.Mesh(lathe([[0.045, yTop + 0.2], [0.04, yTop + 0.5], [0.07, yTop + 0.55], [0.04, yTop + 0.6], [0.032, M.pivote - 0.08], [0.06, M.pivote - 0.05], [0.0, M.pivote - 0.04]], 40), mat.laton); raiz.add(vara);
  const remate = new THREE.Group(); remate.position.y = M.pivote;
  const bola = new THREE.Mesh(new THREE.SphereGeometry(0.07, 32, 20), mat.laton); bola.position.y = 0.22; remate.add(bola);
  const aguja = new THREE.Mesh(new THREE.ConeGeometry(0.026, 0.2, 24), mat.laton); aguja.position.y = 0.37; remate.add(aguja);
  const horquilla = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.016, 10, 40, Math.PI), mat.laton); horquilla.rotation.z = Math.PI; horquilla.position.y = 0.04; remate.add(horquilla);
  const fiel = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.2, 10), mat.laton); fiel.position.y = 0.12; remate.add(fiel);
  raiz.add(remate);

  // Astil (gira) con dos platillos (siempre verticales)
  const astil = new THREE.Group(); astil.position.y = M.pivote; raiz.add(astil);
  const barra = new THREE.Mesh(lathe([[0, -M.brazo], [0.02, -M.brazo], [0.03, -M.brazo + 0.05], [0.026, -0.2], [0.05, -0.08], [0.05, 0.08], [0.026, 0.2], [0.03, M.brazo - 0.05], [0.02, M.brazo], [0, M.brazo]], 32), mat.laton);
  barra.rotation.z = Math.PI / 2; astil.add(barra);
  const eje = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.13, 24), mat.latonOscuro); eje.rotation.x = Math.PI / 2; astil.add(eje);
  const flecha = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.26, 16), mat.laton); flecha.position.y = 0.17; astil.add(flecha);
  const lados = {};
  ['izq', 'der'].forEach((lado, k) => {
    const x = (k ? 1 : -1) * M.brazo;
    const bolaFin = new THREE.Mesh(new THREE.SphereGeometry(0.045, 24, 16), mat.laton); bolaFin.position.x = x; astil.add(bolaFin);
    const colgador = new THREE.Group(); colgador.position.x = x; astil.add(colgador);
    const p = platillo(mat, M); p.position.y = -M.cuelgue - 0.05; colgador.add(p);
    lados[lado] = { colgador, platillo: p, contenido: p.userData.contenido };
  });
  // La otra parte siempre tiene su contrapeso
  lados.izq.contenido.add(crearObjeto('pesas', mat));

  raiz.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });

  return {
    raiz, astil, lados, mat,
    // Inclina el astil y mantiene los platillos colgando en vertical (y balanceándose un poco)
    inclinar(angulo, balanceo = 0) {
      astil.rotation.z = angulo;
      lados.izq.colgador.rotation.z = -angulo + balanceo;
      lados.der.colgador.rotation.z = -angulo - balanceo * 0.8;
    },
    objeto: (tipo) => crearObjeto(tipo, mat)
  };
}

"use client";

import { useEffect, useRef, useState, type PointerEvent as RPtr } from "react";
import { calcularHomografia, aplicarHomografia, type Punto } from "@/lib/homografia";
import { DIANA_25M, type Impacto, puntuacionDeImpacto, radioExterior } from "@/lib/diana";
import { DianaCanvas } from "@/components/diana-canvas";
import { ImpactosBoxes } from "@/components/impactos-boxes";
import { Card } from "@/components/ui";
import { formatPunt } from "@/lib/scoring";

type Fase = "inicio" | "activa";
type Color = "rojo" | "verde";

// Esquinas de destino en mm (y hacia arriba): TL, TR, BR, BL. El cuadrado de la
// diana reducida circunscribe el anillo 1 (radio 250 mm).
const R = radioExterior(DIANA_25M);
const DST: Punto[] = [
  { x: -R, y: R },
  { x: R, y: R },
  { x: R, y: -R },
  { x: -R, y: -R },
];
const ETIQUETAS = ["arriba-izquierda", "arriba-derecha", "abajo-derecha", "abajo-izquierda"];
const PROC_W = 480;
const LONG_PRESS = 320;
const MOVE_PX = 8;
const HIT_NORM = 0.07;

function clamp(v: number, a: number, b: number) {
  return Math.max(a, Math.min(b, v));
}

type Elipse = { cx: number; cy: number; A: number; B: number; phi: number };

/**
 * Ajusta la elipse de la zona negra (JS puro, instantáneo):
 * 1) considera solo píxeles oscuros DENTRO de la región `roi` (si se da),
 * 2) aísla el borrón negro más grande con componentes conexas (ignora números y
 *    líneas de anillos),
 * 3) rellena los huecos por fila y ajusta la elipse por momentos.
 * Devuelve centro, semiejes (px) y orientación, o null si no hay negro suficiente.
 */
function fitElipseNegro(
  data: Uint8ClampedArray,
  w: number,
  h: number,
  roi: Punto[] | null,
): Elipse | null {
  const N = w * h;
  const dark = new Uint8Array(N);
  let totalDark = 0;
  for (let p = 0; p < N; p++) {
    const i = p * 4;
    if (data[i] < 70 && data[i + 1] < 70 && data[i + 2] < 70) {
      if (roi) {
        const x = (p % w) / w, y = ((p / w) | 0) / h;
        if (!dentroQuad(x, y, roi)) continue;
      }
      dark[p] = 1;
      totalDark++;
    }
  }
  if (totalDark < N * 0.002) return null;

  // Componentes conexas (4-conexo). Nos quedamos con la de mayor área.
  const label = new Int32Array(N).fill(-1);
  const stack = new Int32Array(N);
  let bestId = -1, bestArea = 0;
  let idCount = 0;
  for (let p = 0; p < N; p++) {
    if (!dark[p] || label[p] !== -1) continue;
    const id = idCount++;
    let top = 0;
    stack[top++] = p;
    label[p] = id;
    let area = 0;
    while (top > 0) {
      const q = stack[--top];
      area++;
      const x = q % w, y = (q / w) | 0;
      if (x > 0 && dark[q - 1] && label[q - 1] === -1) { label[q - 1] = id; stack[top++] = q - 1; }
      if (x < w - 1 && dark[q + 1] && label[q + 1] === -1) { label[q + 1] = id; stack[top++] = q + 1; }
      if (y > 0 && dark[q - w] && label[q - w] === -1) { label[q - w] = id; stack[top++] = q - w; }
      if (y < h - 1 && dark[q + w] && label[q + w] === -1) { label[q + w] = id; stack[top++] = q + w; }
    }
    if (area > bestArea) { bestArea = area; bestId = id; }
  }
  if (bestId < 0 || bestArea < N * 0.002) return null;

  // Relleno por fila (tapa los huecos de las líneas/números blancos) + momentos.
  const rowMin = new Int32Array(h).fill(-1);
  const rowMax = new Int32Array(h).fill(-1);
  let ymin = h, ymax = -1;
  for (let p = 0; p < N; p++) {
    if (label[p] !== bestId) continue;
    const x = p % w, y = (p / w) | 0;
    if (rowMin[y] < 0 || x < rowMin[y]) rowMin[y] = x;
    if (x > rowMax[y]) rowMax[y] = x;
    if (y < ymin) ymin = y;
    if (y > ymax) ymax = y;
  }
  let Sx = 0, Sy = 0, Sxx = 0, Syy = 0, Sxy = 0, n2 = 0;
  for (let y = ymin; y <= ymax; y++) {
    if (rowMin[y] < 0) continue;
    for (let x = rowMin[y]; x <= rowMax[y]; x++) {
      Sx += x; Sy += y; Sxx += x * x; Syy += y * y; Sxy += x * y; n2++;
    }
  }
  if (n2 < 50) return null;
  const cx = Sx / n2, cy = Sy / n2;
  const mxx = Sxx / n2 - cx * cx;
  const myy = Syy / n2 - cy * cy;
  const mxy = Sxy / n2 - cx * cy;
  const tr = mxx + myy, det = mxx * myy - mxy * mxy;
  const disc = Math.sqrt(Math.max(0, (tr * tr) / 4 - det));
  const l1 = tr / 2 + disc, l2 = Math.max(tr / 2 - disc, 0);
  return {
    cx,
    cy,
    A: Math.max(2 * Math.sqrt(Math.max(l1, 0)), 1),
    B: Math.max(2 * Math.sqrt(l2), 1),
    phi: 0.5 * Math.atan2(2 * mxy, mxx - myy),
  };
}

/** De la elipse del negro deduce las 4 esquinas (normalizadas) de la diana. */
function esquinasDesdeElipse(el: Elipse, w: number, h: number): Punto[] | null {
  const c = Math.cos(el.phi), s = Math.sin(el.phi);
  const Rb = DIANA_25M.blackR;
  const sx = Rb / el.A, sy = Rb / el.B;
  const M11 = sx * c * c + sy * s * s;
  const M12 = (sx - sy) * c * s;
  const M22 = sx * s * s + sy * c * c;
  const det = M11 * M22 - M12 * M12;
  if (Math.abs(det) < 1e-9) return null;
  const iA = M22 / det, iB = -M12 / det, iC = -M12 / det, iD = M11 / det;
  const Rext = radioExterior(DIANA_25M);
  const fr = [
    { x: -Rext, y: -Rext },
    { x: Rext, y: -Rext },
    { x: Rext, y: Rext },
    { x: -Rext, y: Rext },
  ];
  const clampN = (v: number) => Math.max(0, Math.min(1, v));
  const pts = fr.map((t) => ({
    x: clampN((el.cx + (iA * t.x + iB * t.y)) / w),
    y: clampN((el.cy + (iC * t.x + iD * t.y)) / h),
  }));
  return ordenarQuad(pts);
}

/**
 * Deduce las 4 esquinas de la diana usando la PERSPECTIVA de la tarjeta (las 4
 * esquinas marcadas) para el keystone, y la elipse del negro solo para el centro
 * y la escala. Corrige la desviación del anillo exterior (no extrapola en plano).
 */
function esquinasPorTarjeta(
  el: Elipse,
  card: Punto[],
  w: number,
  h: number,
): Punto[] | null {
  const orden = ordenarQuad(card); // TL, TR, BR, BL
  const UNIT: Punto[] = [
    { x: -1, y: -1 },
    { x: 1, y: -1 },
    { x: 1, y: 1 },
    { x: -1, y: 1 },
  ];
  const Hcard = calcularHomografia(orden, UNIT); // imagen(norm) -> tarjeta frontal
  const Hinv = calcularHomografia(UNIT, orden); // tarjeta -> imagen(norm)
  if (!Hcard || !Hinv) return null;

  const Cc = aplicarHomografia(Hcard, el.cx / w, el.cy / h);
  const c = Math.cos(el.phi), s = Math.sin(el.phi);
  let Rc = 0;
  const K = 16;
  for (let k = 0; k < K; k++) {
    const t = (2 * Math.PI * k) / K;
    const ex = el.cx + el.A * Math.cos(t) * c - el.B * Math.sin(t) * s;
    const ey = el.cy + el.A * Math.cos(t) * s + el.B * Math.sin(t) * c;
    const cp = aplicarHomografia(Hcard, ex / w, ey / h);
    Rc += Math.hypot(cp.x - Cc.x, cp.y - Cc.y);
  }
  Rc /= K;
  if (Rc < 1e-6) return null;

  const f = (radioExterior(DIANA_25M) / DIANA_25M.blackR) * Rc; // 2.5·Rc
  const signos: Punto[] = [
    { x: -1, y: -1 },
    { x: 1, y: -1 },
    { x: 1, y: 1 },
    { x: -1, y: 1 },
  ];
  const pts = signos.map((sg) => {
    const ip = aplicarHomografia(Hinv, Cc.x + sg.x * f, Cc.y + sg.y * f);
    return { x: Math.max(0, Math.min(1, ip.x)), y: Math.max(0, Math.min(1, ip.y)) };
  });
  return ordenarQuad(pts);
}

/** Ordena 4 puntos en TL, TR, BR, BL (por suma/resta de coordenadas). */
function ordenarQuad(pts: Punto[]): Punto[] {
  let tl = pts[0], tr = pts[0], br = pts[0], bl = pts[0];
  for (const p of pts) {
    if (p.x + p.y < tl.x + tl.y) tl = p;
    if (p.x + p.y > br.x + br.y) br = p;
    if (p.x - p.y > tr.x - tr.y) tr = p;
    if (p.x - p.y < bl.x - bl.y) bl = p;
  }
  return [tl, tr, br, bl];
}

/** ¿Está el punto (normalizado) dentro del cuadrilátero de las 4 esquinas? */
function dentroQuad(x: number, y: number, q: Punto[]): boolean {
  let pos = false, neg = false;
  for (let i = 0; i < 4; i++) {
    const a = q[i], b = q[(i + 1) % 4];
    const cross = (b.x - a.x) * (y - a.y) - (b.y - a.y) * (x - a.x);
    if (cross > 0) pos = true;
    else if (cross < 0) neg = true;
    if (pos && neg) return false;
  }
  return true;
}

type Gesto = {
  startX: number;
  startY: number;
  lastX: number;
  lastY: number;
  moved: boolean;
  mode: "pending" | "creating" | "moving" | "idle";
  target: number;
  arr: Punto[];
};

export function LaserTrainer({
  onImpacto,
  compacto,
  onCerrar,
}: {
  onImpacto?: (imp: Impacto) => void;
  compacto?: boolean;
  onCerrar?: () => void;
} = {}) {
  const embebido = onImpacto != null;
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const procRef = useRef<HTMLCanvasElement | null>(null);
  const puntoRef = useRef<HTMLDivElement | null>(null);
  const contRef = useRef<HTMLDivElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);

  const [fase, setFase] = useState<Fase>("inicio");
  const [esquinas, setEsquinas] = useState<Punto[]>([]);
  const [impactos, setImpactos] = useState<Impacto[]>([]);
  const [escuchando, setEscuchando] = useState(false);
  const [color, setColor] = useState<Color>("rojo");
  const [sensibilidad, setSensibilidad] = useState(70);
  const [error, setError] = useState<string | null>(null);
  const [overlay, setOverlay] = useState<string | null>(null);
  const [resizeTick, setResizeTick] = useState(0);
  const [centro, setCentro] = useState<Punto>({ x: 0, y: 0 });
  const [verCamara, setVerCamara] = useState(true);

  // Refs espejo para el bucle y los gestos.
  const esquinasRef = useRef(esquinas);
  esquinasRef.current = esquinas;
  const homoR = useRef<number[] | null>(null);
  const escuchandoR = useRef(escuchando);
  escuchandoR.current = escuchando;
  const colorR = useRef(color);
  colorR.current = color;
  const umbralR = useRef(130 - sensibilidad);
  umbralR.current = 130 - sensibilidad;
  const activoR = useRef(false);
  const ultimoR = useRef(0);
  const centroR = useRef(centro);
  centroR.current = centro;
  const gestoR = useRef<Gesto | null>(null);
  const timerR = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Zoom por pinza (zoom real de la cámara donde el navegador lo permite).
  const trackR = useRef<MediaStreamTrack | null>(null);
  const punterosR = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinchR = useRef<{ dist: number; zoom: number } | null>(null);
  const zoomCapR = useRef<{ min: number; max: number } | null>(null);
  const zoomActualR = useRef(1);
  const zoomPendienteR = useRef<number | null>(null);
  const zoomBusyR = useRef(false);

  useEffect(() => {
    return () => detener();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const on = () => setResizeTick((t) => t + 1);
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, []);

  // Recalcula homografía (para puntuar) y la superposición de la diana.
  useEffect(() => {
    if (esquinas.length !== 4) {
      homoR.current = null;
      setOverlay(null);
      return;
    }
    homoR.current = calcularHomografia(esquinas, DST);
    const cont = contRef.current;
    if (!cont) return;
    const rect = cont.getBoundingClientRect();
    const S = 1000;
    const src: Punto[] = [
      { x: 0, y: 0 },
      { x: S, y: 0 },
      { x: S, y: S },
      { x: 0, y: S },
    ];
    const dst = esquinas.map((c) => ({ x: c.x * rect.width, y: c.y * rect.height }));
    const H = calcularHomografia(src, dst);
    if (!H) {
      setOverlay(null);
      return;
    }
    const [a, b, c, d, e, f, g, h] = H;
    setOverlay(`matrix3d(${a},${d},0,${g}, ${b},${e},0,${h}, 0,0,1,0, ${c},${f},0,1)`);
  }, [esquinas, resizeTick]);

  async function iniciar() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      streamRef.current = stream;
      const v = videoRef.current;
      if (v) {
        v.srcObject = stream;
        await v.play();
      }
      // Capacidad de zoom de la cámara (para la pinza).
      const track = stream.getVideoTracks()[0];
      trackR.current = track;
      try {
        const caps = (track.getCapabilities?.() ?? {}) as { zoom?: { min: number; max: number } };
        if (caps.zoom && typeof caps.zoom.min === "number") {
          zoomCapR.current = { min: caps.zoom.min, max: caps.zoom.max };
          const st = (track.getSettings?.() ?? {}) as { zoom?: number };
          zoomActualR.current = typeof st.zoom === "number" ? st.zoom : caps.zoom.min;
        } else {
          zoomCapR.current = null;
        }
      } catch {
        zoomCapR.current = null;
      }
      setEsquinas([]);
      homoR.current = null;
      setFase("activa");
      if (rafRef.current == null) rafRef.current = requestAnimationFrame(procesar);
    } catch (e) {
      console.error(e);
      setError(
        "No se pudo abrir la cámara. Da permiso y, en iPhone, abre la app instalada en la pantalla de inicio.",
      );
    }
  }

  function detener() {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (timerR.current) clearTimeout(timerR.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    trackR.current = null;
    punterosR.current.clear();
    pinchR.current = null;
    zoomCapR.current = null;
    zoomPendienteR.current = null;
    zoomBusyR.current = false;
    setEscuchando(false);
    setFase("inicio");
  }

  function registrarDisparo(nx: number, ny: number) {
    const H = homoR.current;
    if (!H) return;
    const p = aplicarHomografia(H, nx, ny);
    const x = p.x - centroR.current.x;
    const y = p.y - centroR.current.y;
    if (Math.hypot(x, y) > R + 60) return;
    const s = puntuacionDeImpacto(DIANA_25M, x, y);
    if (onImpacto) {
      onImpacto({ x, y, s });
      return;
    }
    setImpactos((prev) => [...prev, { x, y, s }]);
  }

  function procesar() {
    const v = videoRef.current;
    const canvas = procRef.current;
    if (v && canvas && v.videoWidth) {
      const procH = Math.max(1, Math.round((PROC_W * v.videoHeight) / v.videoWidth));
      if (canvas.width !== PROC_W || canvas.height !== procH) {
        canvas.width = PROC_W;
        canvas.height = procH;
      }
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (ctx) {
        ctx.drawImage(v, 0, 0, PROC_W, procH);
        const data = ctx.getImageData(0, 0, PROC_W, procH).data;
        const verde = colorR.current === "verde";
        const umbral = umbralR.current;
        // Si está calibrado, solo se busca DENTRO de la tarjeta (ignora lo de fuera).
        const quad = esquinasRef.current.length === 4 ? esquinasRef.current : null;
        let sumX = 0, sumY = 0, count = 0;
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i], g = data[i + 1], b = data[i + 2];
          const canal = verde ? g : r;
          const otros = verde ? (r + b) / 2 : (g + b) / 2;
          if (canal > 110 && canal - otros > umbral) {
            const idx = i / 4;
            const px = idx % PROC_W;
            const py = Math.floor(idx / PROC_W);
            if (quad && !dentroQuad(px / PROC_W, py / procH, quad)) continue;
            sumX += px;
            sumY += py;
            count++;
          }
        }
        if (count >= 3) {
          const nx = sumX / count / PROC_W;
          const ny = sumY / count / procH;
          pintarPunto({ x: nx, y: ny });
          if (escuchandoR.current && homoR.current) {
            const ahora = performance.now();
            if (!activoR.current && ahora - ultimoR.current > 250) {
              registrarDisparo(nx, ny);
              activoR.current = true;
              ultimoR.current = ahora;
            }
          }
        } else {
          pintarPunto(null);
          activoR.current = false;
        }
      }
    }
    rafRef.current = requestAnimationFrame(procesar);
  }

  function pintarPunto(p: { x: number; y: number } | null) {
    const el = puntoRef.current;
    if (!el) return;
    if (!p) {
      el.style.display = "none";
      return;
    }
    el.style.display = "block";
    el.style.left = `${p.x * 100}%`;
    el.style.top = `${p.y * 100}%`;
  }

  // ---- Gestos de calibración (pulsación larga = crear; arrastrar = mover) ----
  function toNorm(clientX: number, clientY: number): Punto {
    const rect = contRef.current!.getBoundingClientRect();
    return {
      x: clamp((clientX - rect.left) / rect.width, 0, 1),
      y: clamp((clientY - rect.top) / rect.height, 0, 1),
    };
  }
  function cercana(p: Punto, arr: Punto[]): number {
    let best = -1, bestD = HIT_NORM;
    arr.forEach((c, i) => {
      const d = Math.hypot(c.x - p.x, c.y - p.y);
      if (d <= bestD) {
        bestD = d;
        best = i;
      }
    });
    return best;
  }
  function limpiaTimer() {
    if (timerR.current) {
      clearTimeout(timerR.current);
      timerR.current = null;
    }
  }

  // Aplica el zoom de uno en uno (converge al último valor, sin encolar).
  function aplicarSiguienteZoom() {
    const t = trackR.current;
    const z = zoomPendienteR.current;
    if (!t || z == null) {
      zoomBusyR.current = false;
      return;
    }
    zoomPendienteR.current = null;
    zoomBusyR.current = true;
    t.applyConstraints({ advanced: [{ zoom: z }] } as unknown as MediaTrackConstraints)
      .catch(() => {})
      .finally(() => {
        zoomBusyR.current = false;
        if (zoomPendienteR.current != null) aplicarSiguienteZoom();
      });
  }
  function empujarZoom(z: number) {
    zoomPendienteR.current = z;
    if (!zoomBusyR.current) aplicarSiguienteZoom();
  }

  function onDown(e: RPtr<HTMLDivElement>) {
    if (fase !== "activa") return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    punterosR.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    // Dos dedos: pinza para hacer zoom (cancela el gesto de esquinas).
    if (punterosR.current.size >= 2) {
      limpiaTimer();
      gestoR.current = null;
      if (zoomCapR.current) {
        const pts = [...punterosR.current.values()];
        pinchR.current = {
          dist: Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) || 1,
          zoom: zoomActualR.current,
        };
      }
      return;
    }
    limpiaTimer();
    const arr = esquinasRef.current.map((c) => ({ ...c }));
    const p = toNorm(e.clientX, e.clientY);
    gestoR.current = {
      startX: e.clientX,
      startY: e.clientY,
      lastX: e.clientX,
      lastY: e.clientY,
      moved: false,
      mode: "pending",
      target: cercana(p, arr),
      arr,
    };
    timerR.current = setTimeout(() => {
      const g = gestoR.current;
      if (!g || g.mode !== "pending" || g.moved || g.arr.length >= 4) return;
      const pp = toNorm(g.startX, g.startY);
      g.arr = [...g.arr, pp];
      g.target = g.arr.length - 1;
      g.mode = "creating";
      setEsquinas(g.arr.map((c) => ({ ...c })));
    }, LONG_PRESS);
  }

  function onMove(e: RPtr<HTMLDivElement>) {
    if (punterosR.current.has(e.pointerId)) {
      punterosR.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    }
    // Pinza activa: ajusta el zoom de la cámara.
    if (punterosR.current.size >= 2) {
      e.preventDefault();
      if (pinchR.current && zoomCapR.current && trackR.current) {
        const pts = [...punterosR.current.values()];
        const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
        const { min, max } = zoomCapR.current;
        const z = Math.max(min, Math.min(max, pinchR.current.zoom * (dist / pinchR.current.dist)));
        zoomActualR.current = z;
        empujarZoom(z);
      }
      return;
    }
    const g = gestoR.current;
    if (!g) return;
    e.preventDefault();
    const rect = contRef.current!.getBoundingClientRect();
    const ddx = (e.clientX - g.lastX) / rect.width;
    const ddy = (e.clientY - g.lastY) / rect.height;
    g.lastX = e.clientX;
    g.lastY = e.clientY;
    if (!g.moved && Math.hypot(e.clientX - g.startX, e.clientY - g.startY) > MOVE_PX) {
      g.moved = true;
      if (g.mode === "pending") {
        limpiaTimer();
        g.mode = g.target >= 0 ? "moving" : "idle";
      }
    }
    if (g.mode === "creating" || g.mode === "moving") {
      const i = g.target;
      if (i < 0 || i >= g.arr.length) return;
      g.arr[i] = { x: clamp(g.arr[i].x + ddx, 0, 1), y: clamp(g.arr[i].y + ddy, 0, 1) };
      setEsquinas(g.arr.map((c) => ({ ...c })));
    }
  }

  function onUp(e?: RPtr<HTMLDivElement>) {
    if (e) punterosR.current.delete(e.pointerId);
    if (punterosR.current.size < 2) pinchR.current = null;
    limpiaTimer();
    gestoR.current = null;
  }

  function recalibrar() {
    setEscuchando(false);
    setEsquinas([]);
    setCentro({ x: 0, y: 0 });
    homoR.current = null;
  }

  /**
   * Auto-calibración con OpenCV (v1): ajusta la elipse de la zona negra y, con
   * su centro/orientación/escala, coloca las 4 esquinas de la diana. Corrige el
   * centro y la inclinación suave sin marcar a mano; luego se pueden retocar.
   */
  /**
   * Detecta la diana ajustando la elipse de la zona negra (momentos de imagen,
   * JS puro, instantáneo) y de ahí coloca las 4 esquinas, corrigiendo centro e
   * inclinación suave. Si no ve la zona negra, avisa para calibrar a mano.
   */
  function autoDetectar() {
    const canvas = procRef.current;
    if (!canvas || !canvas.width) {
      setError("Aún no hay imagen; espera un segundo y reintenta.");
      return;
    }
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;
    const w = canvas.width, h = canvas.height;
    const data = ctx.getImageData(0, 0, w, h).data;
    // Si ya marcaste las 4 esquinas de la tarjeta, se busca SOLO dentro de ellas
    // y se usa su perspectiva para el keystone (mejor en el anillo exterior).
    const roi = esquinas.length === 4 ? esquinas : null;
    const el = fitElipseNegro(data, w, h, roi);
    if (!el) {
      setError("No detecté la zona negra. Marca las 4 esquinas de la tarjeta y reintenta.");
      return;
    }
    const pts = roi ? esquinasPorTarjeta(el, roi, w, h) : esquinasDesdeElipse(el, w, h);
    if (!pts) {
      setError("No pude ajustar la diana; marca las 4 esquinas a mano.");
      return;
    }
    setError(null);
    setCentro({ x: 0, y: 0 });
    setEsquinas(pts);
  }

  const subtotal = impactos.reduce((a, i) => a + i.s, 0);
  const listo = esquinas.length === 4;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "0.7rem",
        ...(embebido ? { margin: "0.7rem 0 1rem" } : {}),
      }}
    >
      {!compacto ? (
        <p style={{ color: "var(--texto-suave)", fontSize: "0.85rem", margin: 0 }}>
          <strong>Prueba conceptual.</strong> Móvil fijo apuntando a tu diana (mejor
          en penumbra). Marca las <strong>4 esquinas de la tarjeta blanca</strong>{" "}
          (<strong>mantén pulsado</strong> para crear, <strong>arrastra</strong> para
          mover): definen la <strong>zona</strong> donde buscar. Pulsa entonces{" "}
          <strong>«Detectar diana»</strong> y ajustará la diana ahí dentro,
          ignorando el fondo; luego puedes retocar las esquinas. Los disparos solo
          se detectan dentro de la tarjeta.
        </p>
      ) : null}

      {error ? (
        <p style={{ color: "var(--rojo)", fontSize: "0.85rem", margin: 0 }}>{error}</p>
      ) : null}

      {fase === "inicio" ? (
        <button type="button" className="btn btn-primario btn-bloque" onClick={iniciar}>
          📷 Iniciar cámara
        </button>
      ) : null}

      <div
        ref={contRef}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        style={{
          position: "relative",
          width: "100%",
          maxWidth: compacto ? 380 : 520,
          margin: "0 auto",
          borderRadius: 12,
          overflow: "hidden",
          border: "1px solid var(--borde)",
          display: fase === "inicio" || !verCamara ? "none" : "block",
          touchAction: "none",
          cursor: "crosshair",
        }}
      >
        <video ref={videoRef} playsInline muted style={{ width: "100%", display: "block" }} />

        {/* Diana superpuesta (deformada con la homografía). */}
        {listo && overlay ? (
          <svg
            width={1000}
            height={1000}
            viewBox={`${-R} ${-R} ${2 * R} ${2 * R}`}
            preserveAspectRatio="none"
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              transformOrigin: "0 0",
              transform: overlay,
              pointerEvents: "none",
            }}
          >
            {Array.from({ length: 10 }, (_, i) => (i + 1) * DIANA_25M.ringStep).map((rad) => (
              <circle
                key={rad}
                cx={0}
                cy={0}
                r={rad}
                fill="none"
                stroke="#22d3ee"
                strokeWidth={3}
                opacity={0.55}
              />
            ))}
            <circle cx={0} cy={0} r={DIANA_25M.innerTenR} fill="none" stroke="#22d3ee" strokeWidth={2} opacity={0.55} />
            <g stroke="#22d3ee" strokeWidth={2} opacity={0.7}>
              <line x1={-16} y1={0} x2={16} y2={0} />
              <line x1={0} y1={-16} x2={0} y2={16} />
            </g>
          </svg>
        ) : null}

        {/* Esquinas marcadas. */}
        {esquinas.map((p, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              left: `${p.x * 100}%`,
              top: `${p.y * 100}%`,
              width: 16,
              height: 16,
              transform: "translate(-50%, -50%)",
              borderRadius: "50%",
              background: "var(--acento-fuerte)",
              border: "2px solid #fff",
              pointerEvents: "none",
            }}
          />
        ))}

        {/* Punto láser detectado en vivo. */}
        <div
          ref={puntoRef}
          style={{
            position: "absolute",
            display: "none",
            width: 16,
            height: 16,
            transform: "translate(-50%, -50%)",
            borderRadius: "50%",
            border: "2px solid #f43f5e",
            boxShadow: "0 0 8px #f43f5e",
            pointerEvents: "none",
          }}
        />
      </div>

      {fase === "activa" ? (
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button type="button" className="btn btn-primario" style={{ flex: 3 }} onClick={autoDetectar}>
            🎯 Detectar diana (auto)
          </button>
          <button type="button" className="btn" style={{ flex: 1 }} onClick={recalibrar}>
            Recalibrar
          </button>
        </div>
      ) : null}

      {fase === "activa" && !listo ? (
        <p style={{ fontSize: "0.85rem", margin: 0 }}>
          <strong>Mantén pulsado</strong> para poner la esquina{" "}
          <strong>{ETIQUETAS[esquinas.length] ?? ""}</strong> de la tarjeta ({esquinas.length}/4).
          Con <strong>dos dedos</strong> haces zoom. Con las 4 esquinas puestas,
          pulsa <strong>«Detectar diana»</strong> para ajustarla dentro de esa zona.
        </p>
      ) : null}

      {listo ? (
        <Card>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <button
              type="button"
              className={escuchando ? "btn btn-bloque" : "btn btn-primario btn-bloque"}
              onClick={() => setEscuchando((e) => !e)}
            >
              {escuchando ? "⏸ Parar escucha" : "🎯 Escuchar disparos"}
            </button>
            <button
              type="button"
              className="btn btn-bloque"
              onClick={embebido ? onCerrar : () => setVerCamara((v) => !v)}
            >
              {embebido || verCamara ? "🙈 Ocultar cámara" : "📷 Ver cámara"}
            </button>
            {!embebido ? (
              <button type="button" className="btn btn-bloque" onClick={() => setImpactos([])}>
                Limpiar
              </button>
            ) : null}
          </div>

          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginTop: "0.6rem", flexWrap: "wrap" }}>
            <span style={{ fontSize: "0.8rem", color: "var(--texto-suave)" }}>Láser:</span>
            {(["rojo", "verde"] as Color[]).map((c) => (
              <button
                key={c}
                type="button"
                className="btn"
                onClick={() => setColor(c)}
                style={{
                  borderColor: color === c ? "var(--acento-fuerte)" : "var(--borde)",
                  borderWidth: color === c ? 2 : 1,
                }}
              >
                {c === "rojo" ? "🔴 Rojo" : "🟢 Verde"}
              </button>
            ))}
          </div>

          <label style={{ display: "block", marginTop: "0.6rem", fontSize: "0.8rem", color: "var(--texto-suave)" }}>
            Sensibilidad: {sensibilidad}
            <input
              type="range"
              min={10}
              max={120}
              value={sensibilidad}
              onChange={(e) => setSensibilidad(Number(e.target.value))}
              style={{ width: "100%" }}
            />
          </label>
          <p style={{ margin: "0.2rem 0 0", fontSize: "0.75rem", color: "var(--texto-suave)" }}>
            Puedes seguir moviendo las esquinas para cuadrar la diana azul con la
            real. El punto rojo es lo que detecta; baja la sensibilidad si pilla
            brillos.
          </p>
        </Card>
      ) : null}

      {!embebido && fase !== "inicio" ? (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", fontSize: "0.9rem" }}>
            <span style={{ color: "var(--texto-suave)" }}>
              {impactos.length} disparo{impactos.length === 1 ? "" : "s"}
            </span>
            <strong style={{ fontSize: "1.3rem" }}>{formatPunt(subtotal)}</strong>
          </div>
          <DianaCanvas impacts={impactos} finalizada onChange={() => {}} />
          <ImpactosBoxes impacts={impactos} />
        </>
      ) : null}

      <canvas ref={procRef} style={{ display: "none" }} />
    </div>
  );
}

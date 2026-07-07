/**
 * Carga OpenCV.js (WASM) bajo demanda desde CDN. Devuelve el objeto `cv` cuando
 * el runtime está listo. Solo se usa en el cliente (modo láser, encargados).
 */

// El API de OpenCV.js no tiene tipos: se trabaja con `any` acotado aquí.
/* eslint-disable @typescript-eslint/no-explicit-any */
let promesa: Promise<any> | null = null;

export function cargarOpenCV(): Promise<any> {
  if (typeof window === "undefined") return Promise.reject(new Error("solo cliente"));
  const w = window as any;
  if (w.cv && w.cv.Mat) return Promise.resolve(w.cv);
  if (promesa) return promesa;

  promesa = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://docs.opencv.org/4.10.0/opencv.js";
    script.async = true;
    script.onload = async () => {
      const g = window as any;
      try {
        if (g.cv && typeof g.cv.then === "function") {
          const cv = await g.cv;
          resolve(cv);
        } else if (g.cv && g.cv.Mat) {
          resolve(g.cv);
        } else {
          g.cv = g.cv || {};
          g.cv.onRuntimeInitialized = () => resolve((window as any).cv);
        }
      } catch (e) {
        reject(e);
      }
    };
    script.onerror = () => reject(new Error("No se pudo cargar OpenCV"));
    document.body.appendChild(script);
  });
  return promesa;
}

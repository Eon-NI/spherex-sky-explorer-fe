/**
 * Operaciones entre observaciones de la misma región (todas del mismo tamaño):
 * - difference: B − A (celeste = apareció o brilló más, violeta = desapareció o se apagó)
 * - stack: promedio de todas (más profundidad, menos ruido; lo que se mueve se borra)
 *
 * Leer píxeles requiere que las imágenes vengan del mismo dominio o con CORS habilitado.
 */
function pixels(img: HTMLImageElement, w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0, w, h);
  return ctx.getImageData(0, 0, w, h).data;
}

const lum = (d: Uint8ClampedArray, i: number) => 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];

function toUrl(data: ImageData): Promise<string> {
  const c = document.createElement('canvas');
  c.width = data.width;
  c.height = data.height;
  c.getContext('2d')!.putImageData(data, 0, 0);
  return new Promise((resolve, reject) =>
    c.toBlob((b) => (b ? resolve(URL.createObjectURL(b)) : reject(new Error('No se pudo generar la imagen.'))), 'image/png'),
  );
}

export async function differenceImage(a: HTMLImageElement, b: HTMLImageElement, gain = 3) {
  const w = a.naturalWidth;
  const h = a.naturalHeight;
  const da = pixels(a, w, h);
  const db = pixels(b, w, h);
  const out = new ImageData(w, h);
  const o = out.data;

  for (let i = 0; i < o.length; i += 4) {
    const la = lum(da, i);
    const d = (lum(db, i) - la) * gain;
    const t = Math.min(1, Math.abs(d) / 255);
    const base = la * 0.12; // la imagen A muy tenue, para orientarse
    // celeste (sky-300) si aparece en B, violeta (violet-400) si estaba en A
    const [r, g, bl] = d >= 0 ? [125, 211, 252] : [167, 139, 250];
    o[i] = base + r * t;
    o[i + 1] = base + g * t;
    o[i + 2] = base + bl * t;
    o[i + 3] = 255;
  }
  return toUrl(out);
}

export async function stackImage(images: HTMLImageElement[]) {
  const w = images[0].naturalWidth;
  const h = images[0].naturalHeight;
  const sum = new Float32Array(w * h);

  for (const img of images) {
    const d = pixels(img, w, h);
    for (let p = 0, i = 0; p < sum.length; p++, i += 4) sum[p] += lum(d, i);
    await new Promise((r) => setTimeout(r, 0)); // no bloquear la página
  }

  const out = new ImageData(w, h);
  const o = out.data;
  for (let p = 0, i = 0; p < sum.length; p++, i += 4) {
    const v = Math.min(255, Math.max(0, (sum[p] / images.length - 6) * 1.35)); // leve estiramiento
    o[i] = v;
    o[i + 1] = v;
    o[i + 2] = v;
    o[i + 3] = 255;
  }
  return toUrl(out);
}

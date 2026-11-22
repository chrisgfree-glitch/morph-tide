import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'

const table = new Uint32Array(256)
for (let n = 0; n < 256; n++) {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  table[n] = c >>> 0
}

function crc32(buf) {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) c = table[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length, 0)
  const t = Buffer.from(type)
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(Buffer.concat([t, data])), 0)
  return Buffer.concat([len, t, data, crc])
}

function png(size, paint) {
  const stride = size * 4 + 1
  const raw = Buffer.alloc(stride * size)
  for (let y = 0; y < size; y++) {
    raw[y * stride] = 0
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = paint(x, y, size)
      const i = y * stride + 1 + x * 4
      raw[i] = r
      raw[i + 1] = g
      raw[i + 2] = b
      raw[i + 3] = a
    }
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8
  ihdr[9] = 6
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

function paint(x, y, size) {
  const u = x / size
  const v = y / size
  const inset = 0.08
  const rx = 0.22
  const cx = Math.min(Math.max(u, inset + rx), 1 - inset - rx)
  const cy = Math.min(Math.max(v, inset + rx), 1 - inset - rx)
  const dx = u - cx
  const dy = v - cy
  const inside = dx * dx + dy * dy <= rx * rx || (u > inset && u < 1 - inset && v > inset && v < 1 - inset)
  if (!inside) return [7, 16, 24, 0]

  const bx = (u - 0.56) / 0.22
  const by = (v - 0.56) / 0.13
  const body = bx * bx + by * by <= 1
  const belly = (u - 0.54) ** 2 / 0.16 ** 2 + (v - 0.6) ** 2 / 0.07 ** 2 <= 1
  const tail = u < 0.4 && v > 0.46 && v < 0.66 && u > 0.22 && (v - 0.56) ** 2 < ((0.4 - u) * 0.55) ** 2
  const eye = (u - 0.68) ** 2 + (v - 0.51) ** 2 < 0.018 ** 2
  const pupil = (u - 0.688) ** 2 + (v - 0.51) ** 2 < 0.009 ** 2
  if (pupil) return [16, 20, 24, 255]
  if (eye) return [244, 211, 94, 255]
  if (belly && body) return [215, 246, 234, 255]
  if (body) return [26, 158, 143, 255]
  if (tail) return [14, 92, 88, 255]
  const shade = 10 + Math.floor(v * 18)
  return [shade, 28 + Math.floor((1 - v) * 16), 40, 255]
}

const root = path.resolve(import.meta.dirname, '..', 'public', 'icons')
fs.mkdirSync(root, { recursive: true })
fs.writeFileSync(path.join(root, 'icon-192.png'), png(192, paint))
fs.writeFileSync(path.join(root, 'icon-512.png'), png(512, paint))
console.log('wrote icons')

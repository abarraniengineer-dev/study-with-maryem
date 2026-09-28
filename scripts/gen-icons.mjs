// Generates icon-192.png and icon-512.png: cream rounded square + 5-petal flower.
import { writeFileSync } from 'node:fs'
import { deflateSync } from 'node:zlib'

function crc32(buf) {
  let c, table = []
  for (let n = 0; n < 256; n++) {
    c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c >>> 0
  }
  let crc = 0xffffffff
  for (const b of buf) crc = table[(crc ^ b) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}

function makeIcon(size) {
  const S = size
  const R = S * 0.22 // corner radius
  const petals = []
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 - Math.PI / 2
    petals.push([S / 2 + Math.cos(a) * S * 0.16, S / 2 + Math.sin(a) * S * 0.16, S * 0.115])
  }
  const rows = []
  for (let y = 0; y < S; y++) {
    const row = Buffer.alloc(1 + S * 4)
    row[0] = 0
    for (let x = 0; x < S; x++) {
      let r = 251, g = 247, b = 241, a = 255 // cream
      // rounded-square mask
      const dx = Math.max(R - x, x - (S - R), 0)
      const dy = Math.max(R - y, y - (S - R), 0)
      if (Math.hypot(dx, dy) > R) a = 0
      // flower
      const d = Math.hypot(x - S / 2, y - S * 0.52)
      if (d < S * 0.062) { r = 169; g = 106; b = 118 } // deep rose center
      else {
        for (const [px, py, pr] of petals) {
          if (Math.hypot(x - px, y - py) < pr) { r = 201; g = 138; b = 148; break } // blush petal
        }
      }
      const off = 1 + x * 4
      row[off] = r; row[off + 1] = g; row[off + 2] = b; row[off + 3] = a
    }
    rows.push(row)
  }
  const raw = Buffer.concat(rows)
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(S, 0); ihdr.writeUInt32BE(S, 4)
  ihdr[8] = 8; ihdr[9] = 6 // 8-bit RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

writeFileSync('public/icons/icon-192.png', makeIcon(192))
writeFileSync('public/icons/icon-512.png', makeIcon(512))
console.log('icons written')

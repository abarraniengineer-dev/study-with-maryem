// Deploys ./dist to the linked Netlify site via the REST API.
// Reads the token the user authorized in `netlify login` from local CLI config.
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { createHash } from 'node:crypto'

const homedir = process.env.APPDATA || process.env.USERPROFILE || process.env.HOME
const cfg = JSON.parse(readFileSync(join(homedir, 'netlify', 'Config', 'config.json'), 'utf8'))
const userId = cfg.userId ?? Object.keys(cfg.users)[0]
const TOKEN = cfg.users[userId].auth.token
const SITE_ID = '643fa547-6e7b-4607-9473-c2f0da7fb32b'
const DIST = join(process.cwd(), 'dist')

const walk = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = join(dir, e.name)
    return e.isDirectory() ? walk(p) : [p]
  })

const files = {}
for (const p of walk(DIST)) {
  const rel = '/' + relative(DIST, p).split(sep).join('/')
  files[rel] = createHash('sha1').update(readFileSync(p)).digest('hex')
}
console.log('files:', Object.keys(files).length)

const api = (path, opts = {}) =>
  fetch(`https://api.netlify.com/api/v1${path}`, {
    ...opts,
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json', ...(opts.headers || {}) },
  }).then(async (r) => {
    const text = await r.text()
    if (!r.ok) throw new Error(`${r.status} ${text.slice(0, 300)}`)
    return text ? JSON.parse(text) : null
  })

const deploy = await api(`/sites/${SITE_ID}/deploys`, {
  method: 'POST',
  body: JSON.stringify({ files, async: false }),
})
console.log('deploy created:', deploy.id, deploy.state)

const required = deploy.required ?? []
console.log('uploading', required.length, 'file(s)')
for (const path of required) {
  const body = readFileSync(join(DIST, path.slice(1).split('/').join(sep)))
  const res = await fetch(`https://api.netlify.com/api/v1/deploys/${deploy.id}/files${path}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/octet-stream' },
    body,
  })
  if (!res.ok) throw new Error(`upload failed ${path}: ${res.status} ${await res.text()}`)
  console.log('  ✓', path)
}

// Poll until live
for (let i = 0; i < 60; i++) {
  await new Promise((r) => setTimeout(r, 3000))
  const d = await api(`/deploys/${deploy.id}`)
  console.log('state:', d.state)
  if (d.state === 'ready') {
    console.log('LIVE: https://study-with-maryem.netlify.app')
    break
  }
  if (['error', 'expired'].includes(d.state)) throw new Error('deploy ' + d.state)
}

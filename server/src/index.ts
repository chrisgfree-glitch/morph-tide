/**
 * Authoritative shard sim for EVO 2.0.
 * Not deployed from this repo. See README for `wrangler deploy`.
 * Alarms run at 10 Hz only while a socket is open, then the object hibernates.
 */
import { createWorld, step, type Frame, type World } from '../../shared/sim'
import { SHARD_CAP, TICK_MS } from '../../shared/catalog'

export interface Env {
  WORLD: DurableObjectNamespace
  DIRECTORY: DurableObjectNamespace
  CLANS: DurableObjectNamespace
}

const BAD = ['fuck', 'shit', 'bitch']

function clean(text: string): string {
  let out = text.slice(0, 80)
  for (const word of BAD) out = out.replace(new RegExp(word, 'ig'), '***')
  return out
}

export class Directory implements DurableObject {
  constructor(private ctx: DurableObjectState) {
    ctx.blockConcurrencyWhile(async () => {
      ctx.storage.sql.exec(`CREATE TABLE IF NOT EXISTS shards (name TEXT PRIMARY KEY, n INTEGER)`)
    })
  }

  async fetch(req: Request): Promise<Response> {
    const url = new URL(req.url)
    if (url.pathname.endsWith('/join')) {
      const name = url.searchParams.get('shard') ?? ''
      this.ctx.storage.sql.exec(`UPDATE shards SET n = n + 1 WHERE name = ?`, name)
      return Response.json({ ok: true })
    }
    if (url.pathname.endsWith('/leave')) {
      const name = url.searchParams.get('shard') ?? ''
      this.ctx.storage.sql.exec(`UPDATE shards SET n = MAX(0, n - 1) WHERE name = ?`, name)
      return Response.json({ ok: true })
    }
    const rows = this.ctx.storage.sql.exec(`SELECT name, n FROM shards ORDER BY name`).toArray() as { name: string; n: number }[]
    let pick = rows.find((row) => row.n < SHARD_CAP)
    if (!pick) {
      const name = `eden-${rows.length + 1}`
      this.ctx.storage.sql.exec(`INSERT INTO shards (name, n) VALUES (?, 0)`, name)
      pick = { name, n: 0 }
    }
    return Response.json({ shard: pick.name })
  }
}

export class ClanBook implements DurableObject {
  constructor(private ctx: DurableObjectState) {
    ctx.blockConcurrencyWhile(async () => {
      ctx.storage.sql.exec(`CREATE TABLE IF NOT EXISTS clans (
        name TEXT PRIMARY KEY, tag TEXT, color TEXT, code TEXT, leader TEXT, created INTEGER
      )`)
      ctx.storage.sql.exec(`CREATE TABLE IF NOT EXISTS members (
        pid TEXT PRIMARY KEY, clan TEXT, name TEXT, x REAL, size REAL, online INTEGER
      )`)
    })
  }

  async fetch(req: Request): Promise<Response> {
    const body = (await req.json().catch(() => ({}))) as Record<string, string>
    const op = body.op
    if (op === 'create') {
      const name = (body.name ?? '').slice(0, 24)
      const tag = (body.tag ?? '').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4)
      if (tag.length < 3) return Response.json({ error: 'Tag needs 3-4 letters' }, { status: 400 })
      const code = Math.random().toString(36).slice(2, 8)
      this.ctx.storage.sql.exec(
        `INSERT INTO clans (name, tag, color, code, leader, created) VALUES (?, ?, ?, ?, ?, ?)`,
        name, tag, body.color ?? '#ffb703', code, body.pid ?? '', Date.now(),
      )
      this.ctx.storage.sql.exec(
        `INSERT OR REPLACE INTO members (pid, clan, name, x, size, online) VALUES (?, ?, ?, 0, 1, 1)`,
        body.pid ?? '', name, body.who ?? 'kin',
      )
      return Response.json({ name, tag, code })
    }
    if (op === 'join') {
      const rows = this.ctx.storage.sql.exec(
        `SELECT name, tag FROM clans WHERE name = ? OR code = ? LIMIT 1`,
        body.name ?? '', body.code ?? '',
      ).toArray() as { name: string; tag: string }[]
      const clan = rows[0]
      if (!clan) return Response.json({ error: 'No such clan' }, { status: 404 })
      this.ctx.storage.sql.exec(
        `INSERT OR REPLACE INTO members (pid, clan, name, x, size, online) VALUES (?, ?, ?, 0, 1, 1)`,
        body.pid ?? '', clan.name, body.who ?? 'kin',
      )
      return Response.json(clan)
    }
    if (op === 'leave') {
      this.ctx.storage.sql.exec(`DELETE FROM members WHERE pid = ?`, body.pid ?? '')
      return Response.json({ ok: true })
    }
    if (op === 'where') {
      this.ctx.storage.sql.exec(
        `UPDATE members SET x = ?, size = ?, online = 1, name = ? WHERE pid = ?`,
        Number(body.x ?? 0), Number(body.size ?? 1), body.who ?? '', body.pid ?? '',
      )
      return Response.json({ ok: true })
    }
    const clan = body.name ?? ''
    const members = this.ctx.storage.sql.exec(
      `SELECT pid, name, x, size, online FROM members WHERE clan = ?`,
      clan,
    ).toArray()
    return Response.json({ members })
  }
}

interface Sock {
  id: string
  name: string
  clan: string
  input: Frame
  chat: number
}

export class WorldShard implements DurableObject {
  private world: World
  private shard = 'eden-1'
  private lastSave = 0

  constructor(private ctx: DurableObjectState) {
    this.world = createWorld()
    ctx.blockConcurrencyWhile(async () => {
      ctx.storage.sql.exec(`CREATE TABLE IF NOT EXISTS kv (k TEXT PRIMARY KEY, v TEXT)`)
      const saved = ctx.storage.sql.exec(`SELECT v FROM kv WHERE k = 'world'`).toArray() as { v: string }[]
      if (saved[0]?.v) {
        try {
          const data = JSON.parse(saved[0].v) as { bases: World['bases']; columns: World['columns']; score: World['score']; pvp: boolean }
          this.world.bases = data.bases
          this.world.columns = data.columns
          this.world.score = data.score
          this.world.pvp = data.pvp
        } catch {
          /* keep the fresh sea */
        }
      }
    })
  }

  async fetch(req: Request): Promise<Response> {
    if (req.headers.get('Upgrade') !== 'websocket') {
      const url = new URL(req.url)
      if (url.pathname.endsWith('/pvp')) {
        this.world.pvp = url.searchParams.get('on') !== '0'
        return Response.json({ pvp: this.world.pvp })
      }
      return Response.json({
        shard: this.shard,
        players: this.ctx.getWebSockets().length,
        pvp: this.world.pvp,
        raids: this.world.score.raids,
        defenses: this.world.score.defenses,
      })
    }
    const pair = new WebSocketPair()
    this.ctx.acceptWebSocket(pair[1])
    pair[1].serializeAttachment({ id: crypto.randomUUID(), name: 'kin', clan: '', input: blank(), chat: 0 } satisfies Sock)
    if (this.ctx.getWebSockets().length === 1) this.ctx.storage.setAlarm(Date.now() + TICK_MS)
    return new Response(null, { status: 101, webSocket: pair[0] })
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    const sock = (ws.deserializeAttachment() ?? {}) as Sock
    const text = typeof message === 'string' ? message : new TextDecoder().decode(message)
    let data: Record<string, unknown> = {}
    try {
      data = JSON.parse(text) as Record<string, unknown>
    } catch {
      return
    }
    if (data.t === 'hi') {
      sock.name = String(data.name ?? 'kin').slice(0, 16)
      sock.clan = String(data.clan ?? '').slice(0, 4)
      ws.serializeAttachment(sock)
    } else if (data.t === 'in') {
      sock.input = {
        ax: Number(data.ax ?? 0),
        ay: Number(data.ay ?? 0),
        jump: !!data.jump,
        bite: !!data.bite,
        dig: !!data.dig,
        use: !!data.use,
        ink: false,
      }
      ws.serializeAttachment(sock)
    } else if (data.t === 'chat') {
      const now = Date.now()
      if (now - sock.chat < 2000) return
      sock.chat = now
      ws.serializeAttachment(sock)
      const line = clean(String(data.text ?? ''))
      for (const peer of this.ctx.getWebSockets()) {
        const other = peer.deserializeAttachment() as Sock
        if (other?.clan && other.clan === sock.clan) peer.send(JSON.stringify({ t: 'chat', from: sock.name, text: line }))
      }
    } else if (data.t === 'ping') {
      const body = JSON.stringify({ t: 'ping', x: data.x, text: clean(String(data.text ?? 'here')), from: sock.name })
      for (const peer of this.ctx.getWebSockets()) peer.send(body)
    }
  }

  async webSocketClose(ws: WebSocket): Promise<void> {
    ws.close()
    if (this.ctx.getWebSockets().length === 0) await this.ctx.storage.deleteAlarm()
  }

  async alarm(): Promise<void> {
    const sockets = this.ctx.getWebSockets()
    if (sockets.length === 0) return
    const you = this.world.ents[0]
    if (you) {
      const first = sockets[0]?.deserializeAttachment() as Sock | undefined
      if (first?.input) {
        you.online = true
        you.name = first.name
        you.clan = first.clan
        step(this.world, TICK_MS / 1000, first.input)
      }
    }
    const snap = JSON.stringify({
      t: 's',
      pvp: this.world.pvp,
      raiders: this.world.raiders.length,
      banner: this.world.bannerT > 0 ? this.world.banner : '',
      score: this.world.score,
    })
    for (const peer of sockets) peer.send(snap)
    if (this.world.time - this.lastSave > 5) {
      this.lastSave = this.world.time
      this.ctx.storage.sql.exec(
        `INSERT INTO kv (k, v) VALUES ('world', ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v`,
        JSON.stringify({ bases: this.world.bases, columns: this.world.columns, score: this.world.score, pvp: this.world.pvp }),
      )
    }
    if (sockets.length > 0) this.ctx.storage.setAlarm(Date.now() + TICK_MS)
  }
}

function blank(): Frame {
  return { ax: 0, ay: 0, jump: false, bite: false, dig: false, use: false, ink: false }
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url)
    if (url.pathname === '/clan') return env.CLANS.get(env.CLANS.idFromName('global')).fetch(req)
    if (url.pathname !== '/ws') return new Response('Morph Tide shard router', { headers: { 'access-control-allow-origin': '*' } })
    const dir = env.DIRECTORY.get(env.DIRECTORY.idFromName('global'))
    const assigned = await dir.fetch('https://do/assign')
    const { shard } = (await assigned.json()) as { shard: string }
    await dir.fetch(`https://do/join?shard=${shard}`)
    return env.WORLD.get(env.WORLD.idFromName(shard)).fetch(req)
  },
}

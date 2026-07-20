import { createReadStream } from 'node:fs'
import { access, stat } from 'node:fs/promises'
import { createServer } from 'node:http'
import { extname, join, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  ACTIONS,
  createGame,
  deleteGame,
  loadGame,
  runAutomaticHour,
  runManualAction,
  runUntilNextDay,
  saveGame,
} from './game.mjs'

const ROOT_DIR = join(fileURLToPath(new URL('.', import.meta.url)), '..')
const DIST_DIR = join(ROOT_DIR, 'dist')
const isProduction = process.argv.includes('--production')
const port = Number(process.env.PORT || 5173)

const MIME_TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
}

function sendJson(response, statusCode, data) {
  response.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' })
  response.end(JSON.stringify(data))
}

async function readJson(request) {
  const chunks = []
  let size = 0
  for await (const chunk of request) {
    size += chunk.length
    if (size > 100_000) throw new Error('요청이 너무 큽니다.')
    chunks.push(chunk)
  }
  if (!chunks.length) return {}
  return JSON.parse(Buffer.concat(chunks).toString('utf8'))
}

async function handleApi(request, response) {
  const url = new URL(request.url, `http://${request.headers.host}`)
  if (!url.pathname.startsWith('/api/')) return false

  try {
    if (request.method === 'GET' && url.pathname === '/api/game') {
      sendJson(response, 200, { game: await loadGame(), actions: ACTIONS })
      return true
    }

    if (request.method === 'POST' && url.pathname === '/api/game') {
      const game = await saveGame(createGame(await readJson(request)))
      sendJson(response, 201, { game, actions: ACTIONS })
      return true
    }

    if (request.method === 'POST' && url.pathname === '/api/game/action') {
      const game = await loadGame()
      if (!game) throw new Error('먼저 피플을 만들어 주세요.')
      const { action } = await readJson(request)
      sendJson(response, 200, { game: await saveGame(runManualAction(game, action)), actions: ACTIONS })
      return true
    }

    if (request.method === 'POST' && url.pathname === '/api/game/tick') {
      const game = await loadGame()
      if (!game) throw new Error('먼저 피플을 만들어 주세요.')
      sendJson(response, 200, { game: await saveGame(runAutomaticHour(game)), actions: ACTIONS })
      return true
    }

    if (request.method === 'POST' && url.pathname === '/api/game/day') {
      const game = await loadGame()
      if (!game) throw new Error('먼저 피플을 만들어 주세요.')
      sendJson(response, 200, { game: await saveGame(runUntilNextDay(game)), actions: ACTIONS })
      return true
    }

    if (request.method === 'DELETE' && url.pathname === '/api/game') {
      await deleteGame()
      sendJson(response, 200, { ok: true })
      return true
    }

    sendJson(response, 404, { error: 'API를 찾을 수 없습니다.' })
    return true
  } catch (error) {
    sendJson(response, 400, { error: error.message || '요청을 처리하지 못했습니다.' })
    return true
  }
}

async function serveStatic(request, response) {
  const url = new URL(request.url, `http://${request.headers.host}`)
  const relativePath = normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, '')
  let filePath = join(DIST_DIR, relativePath === '/' ? 'index.html' : relativePath)

  try {
    if ((await stat(filePath)).isDirectory()) filePath = join(filePath, 'index.html')
    await access(filePath)
  } catch {
    filePath = join(DIST_DIR, 'index.html')
  }

  response.writeHead(200, { 'Content-Type': MIME_TYPES[extname(filePath)] || 'application/octet-stream' })
  createReadStream(filePath).pipe(response)
}

let vite
if (!isProduction) {
  const { createServer: createViteServer } = await import('vite')
  vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' })
}

const server = createServer(async (request, response) => {
  if (await handleApi(request, response)) return
  if (vite) {
    vite.middlewares(request, response, () => {})
    return
  }
  await serveStatic(request, response)
})

server.listen(port, '127.0.0.1', () => {
  console.log(`피플 게임이 http://127.0.0.1:${port} 에서 실행 중입니다.`)
})

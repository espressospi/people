import { spawn } from 'node:child_process'

const baseEnvironment = { ...process.env }
const pnpmCommand = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm'

function startApi() {
  return new Promise((resolve, reject) => {
    const api = spawn(process.execPath, ['--watch', 'apps/api/src/server.mjs'], {
      env: baseEnvironment,
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    let resolved = false
    let output = ''

    api.stdout.on('data', (chunk) => {
      const text = chunk.toString()
      process.stdout.write(`[api] ${text}`)
      output += text
      const match = output.match(/127\.0\.0\.1:(\d+)\/graphql/)
      if (match && !resolved) {
        resolved = true
        resolve({ api, port: Number(match[1]) })
      }
    })
    api.stderr.on('data', (chunk) => process.stderr.write(`[api] ${chunk}`))
    api.once('error', reject)
    api.once('exit', (code) => {
      if (!resolved) reject(new Error(`API가 시작되지 않았습니다. 종료 코드: ${code}`))
    })
  })
}

const { api, port } = await startApi()
const web = spawn(pnpmCommand, ['--filter', '@people/web', 'dev'], {
  env: {
    ...baseEnvironment,
    API_PORT: String(port),
    VITE_GRAPHQL_URL: `http://127.0.0.1:${port}/graphql`,
  },
  stdio: 'inherit',
  // Windows의 .cmd 실행 파일은 셸을 통해 실행해야 spawn EINVAL을 피할 수 있다.
  shell: process.platform === 'win32',
})

console.log(`[dev] API가 ${port}번 포트를 사용합니다. 웹은 5173부터 빈 포트를 찾습니다.`)

function shutdown() {
  if (!api.killed) api.kill('SIGTERM')
  if (!web.killed) web.kill('SIGTERM')
}

process.once('SIGINT', shutdown)
process.once('SIGTERM', shutdown)
web.once('exit', (code) => {
  shutdown()
  process.exit(code ?? 0)
})

import { createServer } from 'node:http'
import { createYoga } from 'graphql-yoga'
import { schema } from './schema.mjs'

const port = Number(process.env.PORT || 4000)

const yoga = createYoga({
  schema,
  graphqlEndpoint: '/graphql',
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'OPTIONS'],
  },
})

function listenWithFallback(startPort) {
  return new Promise((resolve, reject) => {
    const server = createServer(yoga)
    const tryPort = (candidatePort) => {
      const onError = (error) => {
        server.removeListener('listening', onListening)
        // Windows에서는 예약되었거나 다른 프로세스가 점유한 포트가 EACCES로도 보고될 수 있다.
        if (error.code === 'EADDRINUSE' || error.code === 'EACCES') {
          tryPort(candidatePort + 1)
          return
        }
        reject(error)
      }
      const onListening = () => {
        server.removeListener('error', onError)
        resolve({ server, port: candidatePort })
      }
      server.once('error', onError)
      server.once('listening', onListening)
      server.listen(candidatePort, '127.0.0.1')
    }
    tryPort(startPort)
  })
}

const { port: actualPort } = await listenWithFallback(port)
console.log(`피플 GraphQL API: http://127.0.0.1:${actualPort}/graphql`)

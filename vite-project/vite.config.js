import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), gutenbergReaderTextPlugin()],
})

function gutenbergReaderTextPlugin() {
  return {
    name: 'gutenberg-reader-text',
    configureServer(server) {
      server.middlewares.use('/api/reader-text', async (request, response, next) => {
        const requestUrl = new URL(request.url || '/', 'http://127.0.0.1')
        const queryId = requestUrl.searchParams.get('id')
        const queryType = requestUrl.searchParams.get('type')
        const queryFile = requestUrl.searchParams.get('file') || ''
        const parts = requestUrl.pathname.split('/').filter(Boolean)
        const gutenbergId = queryId || parts[0]
        const sourceType = queryType || parts[1]
        const fileName = queryFile || parts.slice(2).join('/')

        if (!/^\d+$/.test(gutenbergId) || !sourceType) {
          next()
          return
        }

        const sourcePaths =
          sourceType === 'plain'
            ? [
                `/cache/epub/${gutenbergId}/pg${gutenbergId}.txt`,
                `/cache/epub/${gutenbergId}/pg${gutenbergId}-0.txt`,
                `/files/${gutenbergId}/${gutenbergId}-0.txt`,
                `/files/${gutenbergId}/${gutenbergId}.txt`,
                `/files/${gutenbergId}/${gutenbergId}-8.txt`,
              ]
            : [`/files/${gutenbergId}/${fileName}`]

        try {
          let lastStatus = 404

          for (const sourcePath of sourcePaths) {
            const sourceResponse = await fetch(`https://www.gutenberg.org${sourcePath}`)
            lastStatus = sourceResponse.status

            if (!sourceResponse.ok) continue

            response.setHeader('content-type', sourceResponse.headers.get('content-type') || 'text/plain; charset=utf-8')
            response.end(await sourceResponse.text())
            return
          }

          response.statusCode = lastStatus
          response.end(`Reader source returned ${lastStatus}`)
        } catch {
          response.statusCode = 502
          response.end('Could not load reader text source.')
        }
      })
    },
  }
}

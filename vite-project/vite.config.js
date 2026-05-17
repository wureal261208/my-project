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
        const parts = requestUrl.pathname.split('/').filter(Boolean)
        const gutenbergId = parts[0]
        const sourceType = parts[1]
        const fileName = parts.slice(2).join('/')

        if (!/^\d+$/.test(gutenbergId) || !sourceType) {
          next()
          return
        }

        const sourcePath =
          sourceType === 'plain'
            ? `/cache/epub/${gutenbergId}/pg${gutenbergId}.txt`
            : `/files/${gutenbergId}/${fileName}`

        try {
          const sourceResponse = await fetch(`https://www.gutenberg.org${sourcePath}`)
          if (!sourceResponse.ok) {
            response.statusCode = sourceResponse.status
            response.end(`Reader source returned ${sourceResponse.status}`)
            return
          }

          response.setHeader('content-type', sourceResponse.headers.get('content-type') || 'text/plain; charset=utf-8')
          response.end(await sourceResponse.text())
        } catch {
          response.statusCode = 502
          response.end('Could not load reader text source.')
        }
      })
    },
  }
}

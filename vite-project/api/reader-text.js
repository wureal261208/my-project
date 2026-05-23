export default async function handler(request, response) {
  const requestUrl = new URL(request.url || '/', 'http://127.0.0.1')
  const queryId = requestUrl.searchParams.get('id')
  const queryType = requestUrl.searchParams.get('type')
  const queryFile = requestUrl.searchParams.get('file') || ''
  const parts = requestUrl.pathname
    .replace(/^\/api\/reader-text\/?/, '')
    .split('/')
    .filter(Boolean)
  const gutenbergId = queryId || parts[0]
  const sourceType = queryType || parts[1]
  const fileName = queryFile || parts.slice(2).join('/')

  if (!/^\d+$/.test(gutenbergId || '') || !sourceType) {
    response.status(400).send('Missing reader text source.')
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
      response.status(200).send(await sourceResponse.text())
      return
    }

    response.status(lastStatus).send(`Reader source returned ${lastStatus}`)
  } catch {
    response.status(502).send('Could not load reader text source.')
  }
}

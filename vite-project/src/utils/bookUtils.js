export function getCover(book) {
  return book.formats?.['image/jpeg'] || book.cover || 'https://www.gutenberg.org/cache/epub/2701/pg2701.cover.medium.jpg'
}

export function getAuthor(book) {
  return book.authors?.map((author) => author.name).join(', ') || book.author || 'Unknown author'
}

export function getReaderUrl(book) {
  const formats = book.formats || {}

  return (
    formats['text/html'] ||
    formats['text/html; charset=utf-8'] ||
    formats['text/plain'] ||
    formats['text/plain; charset=utf-8'] ||
    book.readerUrl ||
    ''
  )
}

export function getCategory(book) {
  return book.bookshelves?.[0] || book.subjects?.[0]?.split('--')[0].trim() || book.category || 'Classic'
}

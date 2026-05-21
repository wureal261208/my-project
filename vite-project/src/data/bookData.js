export const API_URL = 'https://gutendex.com/books'

export const fallbackBooks = [
  {
    id: 84,
    title: 'Frankenstein; Or, The Modern Prometheus',
    authors: [{ name: 'Mary Wollstonecraft Shelley' }],
    subjects: ['Gothic fiction', 'Science fiction'],
    languages: ['en'],
    download_count: 106943,
    formats: {
      'image/jpeg': 'https://www.gutenberg.org/cache/epub/84/pg84.cover.medium.jpg',
      'text/html': 'https://www.gutenberg.org/files/84/84-h/84-h.htm',
      'text/plain': 'https://www.gutenberg.org/cache/epub/84/pg84.txt',
    },
  },
  {
    id: 1342,
    title: 'Pride and Prejudice',
    authors: [{ name: 'Jane Austen' }],
    subjects: ['Courtship -- Fiction', 'England -- Fiction'],
    languages: ['en'],
    download_count: 73721,
    formats: {
      'image/jpeg': 'https://www.gutenberg.org/cache/epub/1342/pg1342.cover.medium.jpg',
      'text/html': 'https://www.gutenberg.org/files/1342/1342-h/1342-h.htm',
      'text/plain': 'https://www.gutenberg.org/cache/epub/1342/pg1342.txt',
    },
  },
  {
    id: 11,
    title: "Alice's Adventures in Wonderland",
    authors: [{ name: 'Lewis Carroll' }],
    subjects: ['Fantasy fiction', 'Children stories'],
    languages: ['en'],
    download_count: 42856,
    formats: {
      'image/jpeg': 'https://www.gutenberg.org/cache/epub/11/pg11.cover.medium.jpg',
      'text/html': 'https://www.gutenberg.org/files/11/11-h/11-h.htm',
      'text/plain': 'https://www.gutenberg.org/cache/epub/11/pg11.txt',
    },
  },
  {
    id: 1661,
    title: 'The Adventures of Sherlock Holmes',
    authors: [{ name: 'Arthur Conan Doyle' }],
    subjects: ['Detective and mystery stories'],
    languages: ['en'],
    download_count: 38722,
    formats: {
      'image/jpeg': 'https://www.gutenberg.org/cache/epub/1661/pg1661.cover.medium.jpg',
      'text/html': 'https://www.gutenberg.org/files/1661/1661-h/1661-h.htm',
      'text/plain': 'https://www.gutenberg.org/cache/epub/1661/pg1661.txt',
    },
  },
]

export const starterAccounts = [
  { name: 'Reader Demo', email: 'reader@bookworm.test', password: 'reader123', role: 'user' },
  { name: 'Admin Demo', email: 'admin@bookworm.test', password: 'admin123', role: 'admin' },
]

export const ADMIN_EMAIL = 'adminbookworm2026@gmail.com'
export const ADMIN_PASSWORD = 'Admin123'
export const STAFF_DEFAULT_PASSWORD = 'Admin123'
export const ADMIN_EMAILS = [ADMIN_EMAIL]

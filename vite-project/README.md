# BookWorm Reading Platform

BookWorm is a modern React reading web app built for browsing, discovering, saving, and reading public-domain books. The interface focuses on a smooth reader experience, lightweight personalization, and small interactive details that make the site feel active instead of static.

## Features

- Home page with animated featured-book carousel, hot books, recommendations, and continue-reading books.
- Discover page with dropdown search suggestions, book covers, recent search history, filtering, and pagination.
- Book detail page with metadata, chapters, similar-book recommendations, reads count, and reader comments.
- Reader page with checkpoint saving, chapter/page navigation, guest preview limits, reading themes, highlights, and finished status.
- Profile page with saved books, reading progress, reading streak, quote highlights, and reading history.
- Guest and member behavior split: guests can preview limited chapters, while logged-in accounts can read without that limit.
- Local-first persistence for checkpoints, comments, favorites, highlights, reads, reader settings, and search history.

## Tech Stack

- React 19
- Vite 8
- Bootstrap Icons
- ESLint
- LocalStorage for client-side persistence
- Lazy-loaded route pages for a lighter initial app load

## React Hooks Used

- `useState`: manages UI state such as active hero book, paused carousel state, comment text, reader controls, search state, pagination, and account-driven data.
- `useEffect`: handles side effects such as carousel timing, checkpoint persistence, reader progress updates, localStorage synchronization, and page lifecycle behavior.
- `lazy` and `Suspense`: split page-level components so Home, Discover, Detail, Reader, Profile, and Admin can load on demand.
- Context provider pattern: centralizes navigation behavior so nested components can move between pages without prop chains becoming too noisy.

## Tools Used

- `npm.cmd run dev`: runs the local Vite development server.
- `npm.cmd run lint`: checks code style and React hook correctness with ESLint.
- `npm.cmd run build`: creates a production-ready Vite build.
- Browser verification: used to confirm UI behavior such as carousel movement, comment submission, and rendered page state.
- PowerShell: used for local file inspection, build commands, and project verification inside the shared workspace.

## Project Structure

```text
src/
  components/
    auth/          Authentication UI
    books/         Reusable book grid and book card components
    layout/        App shell, header, footer, and global layout
    pages/         Home, Discover, Detail, Reader, Profile, and Admin pages
  context/         Shared navigation context
  data/            Fallback book data and storage key constants
  utils/           Book formatting and helper utilities
  App.jsx          Main app state, routing, persistence, and permissions
  App.css          Global styling and responsive UI
```

## Getting Started

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Open the app:

```text
http://127.0.0.1:5173/
```

## Quality Checks

Run lint:

```bash
npm run lint
```

Create a production build:

```bash
npm run build
```

## Persistence Model

BookWorm currently uses browser localStorage to keep the demo app fast and easy to run without a backend. Stored data includes:

- Account/session state
- Favorites and saved books
- Reading checkpoints
- Reading progress and finished status
- Book reads count
- Comments
- Quote highlights
- Reading streak activity
- Search history and reader theme

This makes the project suitable for frontend prototyping. For production, these storage flows can be moved to Firebase, Supabase, or a custom API while keeping the same UI contracts.

## Reader Permissions

- Guest users can preview the first three chapters of a book.
- Logged-in users can access all chapters and keep unlimited checkpoints.
- Chapter links in the detail page respect the same access rules as the reader.

## Design Direction

The UI is designed to feel calm, editorial, and easy to scan. Book covers carry most of the visual energy, while motion is used for transitions, lazy loading, carousel movement, and page state changes. The goal is to make the site feel inspiring without making common reading workflows harder.

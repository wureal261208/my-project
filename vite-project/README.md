# BookWorm Reading Platform

BookWorm is a React reading web app for browsing public-domain books, reading by chapter/page, saving notes, tracking progress, and managing book data. The project is structured to match the MindX React course flow: React fundamentals, state/props, UI styling, async data, useEffect, Context, routing behavior, deployment, and final product presentation.

## Current Status

- Data is stored in Firebase Firestore, not browser storage.
- Firebase Authentication handles login, signup, logout, and password reset with in-memory auth state instead of browser storage.
- React state controls the current page, selected book, reader settings, forms, and all UI updates.
- Guest users can browse and preview limited chapters.
- Logged-in users can keep private reading progress, favorites, notes, highlights, checkpoints, and reader theme.
- Admin/staff users can access management features from the app role flow.
- The reader checks real book text, splits chapters by chapter markers, and adapts page count per chapter.

## Tech Stack

- React 19 with Vite 8
- React Router
- Firebase Authentication
- Firebase Firestore
- Bootstrap Icons
- ESLint
- Vite development middleware for Gutenberg reader text proxy

## MindX Course Mapping

- JavaScript and ES6+: array/object helpers, async functions, module imports, data transformation utilities.
- ReactJS: component-based UI in `src/components`.
- State and props: app state is owned in `src/App.jsx` and passed to page components.
- UI/CSS library: Bootstrap Icons plus custom responsive CSS in `src/App.css`.
- Async and useEffect: Firebase subscriptions, auth session checking, book loading, and reader text loading.
- Context: `src/context/NavigationContext.jsx` shares navigation behavior across nested components.
- Routing: React state controls which page renders, while `react-router-dom` mirrors that state into browser URLs for Home, Discover, Detail, Reader, Profile, Admin, and Auth.
- Custom utilities/hooks style: book/chapter parsing lives in `src/utils`.
- Deployment: `npm run build` creates the production build. The reader text proxy needs a server/serverless endpoint for real production hosting.

## System Flow

```text
Open app
  -> Firebase checks current session
  -> Guest account is used if no session exists
  -> Global Firestore data loads books, views, comments, staff, and known users
  -> User Firestore data loads only after login
  -> User browses books or opens reader
  -> Reader loads text, detects chapters, paginates each chapter, then saves progress
```

## Login Flow

```text
Guest
  -> Login or signup
  -> Firebase Authentication validates account
  -> App maps role: admin, staff, or user
  -> Firestore subscribes to bookwormUsers/{uid}
  -> Private data is saved under that uid
```

## Firestore Data

```text
bookwormData/global
  managedBooks
  viewCounts
  bookReaders
  comments
  staff
  knownUsers

bookwormUsers/{uid}
  favorites
  history
  readingActivity
  progress
  checkpoints
  notes
  highlights
  searchHistory
  accountSettings
  websiteTheme
  readerTheme
```

## Run On Another Machine

Install dependencies:

```bash
npm install
```

Use Node.js 20.19+ or 22.12+ so Vite 8 and React Router run correctly.

Create Firebase config when needed:

```bash
cp .env.example .env
```

Then fill the `VITE_FIREBASE_*` values from Firebase Project Settings. The app also keeps the current Firebase config as a fallback for local demo runs.

Start the app:

```bash
npm run dev
```

Open:

```text
http://127.0.0.1:5173/
```

## Firebase Setup

Enable these services in Firebase Console:

- Authentication: Email/Password provider
- Firestore Database

Use `firestore.rules` as the prototype rule file. The current rule allows public writes to `bookwormData/global` so guest view counts and guest comments still work. Before production, split public counters/comments from admin-only book/staff data or move writes behind a backend API.

## Quality Checks

```bash
npm run lint
npm run build
```

## Production Note

`/api/reader-text` is available in local development through `vite.config.js` and on Vercel through `api/reader-text/[...path].js`. `vercel.json` rewrites client routes such as `/reader`, `/profile`, and `/admin` back to the React app so direct links and refreshes do not 404.

For Vercel, set the project root directory to `vite-project`, build command to `npm run build`, and output directory to `dist`.

import { getReaderUrl } from '../../utils/bookUtils'

function ReaderPage({
  book,
  favorites,
  fontScale,
  notes,
  onBack,
  onFavorite,
  progress,
  readerTheme,
  setFontScale,
  setNotes,
  setProgress,
  setReaderTheme,
}) {
  if (!book) return <div className="empty-state">No book selected.</div>

  const readerUrl = getReaderUrl(book)

  return (
    <section className={`reader-page reader-${readerTheme}`}>
      <header className="reader-topbar">
        <button className="ghost-button" onClick={onBack} type="button">
          <i className="bi bi-arrow-left" />
          Exit reader
        </button>
        <div>
          <p className="mono-eyebrow">Now reading</p>
          <h1>{book.title}</h1>
        </div>
        <button className="ghost-button" onClick={() => onFavorite(book.id)} type="button">
          <i className={`bi ${favorites.includes(book.id) ? 'bi-bookmark-fill' : 'bi-bookmark'}`} />
          Bookmark
        </button>
      </header>

      <div className="reader-controls">
        <label>
          Theme
          <select value={readerTheme} onChange={(event) => setReaderTheme(event.target.value)}>
            <option value="paper">White</option>
            <option value="night">Black</option>
          </select>
        </label>
        <label>
          Font size
          <input
            type="range"
            min="15"
            max="24"
            value={fontScale}
            onChange={(event) => setFontScale(Number(event.target.value))}
          />
        </label>
        <label>
          Progress
          <input
            type="range"
            min="0"
            max="100"
            value={progress[book.id] || 0}
            onChange={(event) => setProgress((current) => ({ ...current, [book.id]: Number(event.target.value) }))}
          />
        </label>
      </div>

      <div className="reader-main">
        <article className="reader-frame" style={{ fontSize: `${fontScale}px` }}>
          {readerUrl ? (
            <iframe src={readerUrl} title={`Read ${book.title}`} />
          ) : (
            <p>This book does not include a readable text link.</p>
          )}
        </article>
        <aside className="notes-panel">
          <h2>Notes</h2>
          <textarea
            value={notes[book.id] || ''}
            onChange={(event) => setNotes((current) => ({ ...current, [book.id]: event.target.value }))}
            placeholder="Save quotes, thoughts, or chapter notes..."
          />
        </aside>
      </div>
    </section>
  )
}

export default ReaderPage

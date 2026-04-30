import { getReaderUrl } from '../../utils/bookUtils'

function ReaderPage({
  book,
  fontScale,
  notes,
  progress,
  readerTheme,
  setFontScale,
  setNotes,
  setProgress,
  setReaderTheme,
}) {
  const readerUrl = getReaderUrl(book)

  return (
    <section className={`reader reader-${readerTheme}`}>
      <div className="reader-toolbar">
        <div>
          <p className="eyebrow">Now reading</p>
          <h2>{book.title}</h2>
        </div>
        <label>
          Theme
          <select value={readerTheme} onChange={(event) => setReaderTheme(event.target.value)}>
            <option value="paper">Paper</option>
            <option value="night">Night</option>
          </select>
        </label>
        <label>
          Font
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
      <div className="reader-layout">
        <article className="reader-frame" style={{ fontSize: `${fontScale}px` }}>
          {readerUrl ? (
            <iframe src={readerUrl} title={`Read ${book.title}`} />
          ) : (
            <p>This book does not include a readable Gutenberg text link.</p>
          )}
        </article>
        <aside className="notes-panel">
          <h3>Reading notes</h3>
          <textarea
            value={notes[book.id] || ''}
            onChange={(event) => setNotes((current) => ({ ...current, [book.id]: event.target.value }))}
            placeholder="Write thoughts, quotes, vocabulary, or chapter notes..."
          />
        </aside>
      </div>
    </section>
  )
}

export default ReaderPage

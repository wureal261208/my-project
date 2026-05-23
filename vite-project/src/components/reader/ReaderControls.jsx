function ReaderControls({
  chapterPage,
  chapterProgressValue,
  currentChapter,
  guestChapterLimit,
  isFinished,
  isGuest,
  onMarkChapterDone,
  onReaderTheme,
  progressValue,
  readerTheme,
}) {
  return (
    <div className="reader-controls">
      <div className="reader-control-card reader-theme-control">
        <label>
          Theme
          <select value={readerTheme} onChange={(event) => onReaderTheme(event.target.value)}>
            <option value="sepia">Sepia</option>
            <option value="focus">Focus</option>
            <option value="night">Night</option>
          </select>
        </label>
      </div>
      <div className="reader-page-meter">
        <span>{currentChapter.label} - Page {chapterPage} / {currentChapter.pages}</span>
        <progress max="100" value={chapterProgressValue} />
        <div className="reader-progress-meta">
          <small>Chapter {chapterProgressValue}%</small>
          <small>Book {progressValue}%</small>
          {isGuest && <small>Guest preview: first {guestChapterLimit} chapters</small>}
          {isFinished && <small className="finished-status">Finished</small>}
        </div>
      </div>
      <div className="reader-control-card reader-quick-actions">
        <button disabled={chapterPage >= currentChapter.pages} onClick={onMarkChapterDone} type="button">
          <i className="bi bi-check2-circle" />
          Mark chapter done
        </button>
      </div>
    </div>
  )
}

export default ReaderControls

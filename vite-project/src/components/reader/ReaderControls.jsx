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
      <label>
        Theme
        <select value={readerTheme} onChange={(event) => onReaderTheme(event.target.value)}>
          <option value="sepia">Sepia</option>
          <option value="focus">Focus</option>
          <option value="night">Night</option>
        </select>
      </label>
      <div className="reader-page-meter">
        <span>{currentChapter.label} - Page {chapterPage} / {currentChapter.pages}</span>
        <progress max="100" value={chapterProgressValue} />
        <small>Chapter progress: {chapterProgressValue}%</small>
        <button disabled={chapterPage >= currentChapter.pages} onClick={onMarkChapterDone} type="button">
          Mark chapter done
        </button>
        {isGuest && <small>Guest preview: first {guestChapterLimit} chapters</small>}
        <small>Book progress: {progressValue}%</small>
        {isFinished && <small className="finished-status">Finished</small>}
      </div>
    </div>
  )
}

export default ReaderControls

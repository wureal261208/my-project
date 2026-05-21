function ReaderChapterStrip({ chapters, currentChapterIndex, isGuest, guestChapterLimit, onChapter }) {
  return (
    <div className="reader-chapter-strip" aria-label="Nearby chapters">
      {chapters.map((item) => (
        <button
          className={item.index === currentChapterIndex ? 'active' : ''}
          key={item.id}
          onClick={() => onChapter(item.index)}
          type="button"
        >
          <small>{item.position}</small>
          <span>{item.chapter.number || item.index + 1}</span>
          <strong>{item.chapter.label}</strong>
          {isGuest && item.index + 1 > guestChapterLimit && <i className="bi bi-lock-fill" />}
        </button>
      ))}
    </div>
  )
}

export default ReaderChapterStrip

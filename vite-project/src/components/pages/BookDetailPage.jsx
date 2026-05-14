import { useState } from 'react'
import BookGrid from '../books/BookGrid'
import { getAuthor, getCategory, getCover, getDescription } from '../../utils/bookUtils'
import { getBookChapters, getTotalPages } from '../../utils/chapterUtils'

function BookDetailPage({
  account,
  book,
  books = [],
  checkpoints = {},
  comments = [],
  favorites,
  onBack,
  onChapter,
  onComment,
  onDetail,
  onFavorite,
  onRead,
  viewCount = 0,
  viewCounts = {},
  viewerCounts = {},
}) {
  const [commentText, setCommentText] = useState('')

  if (!book) {
    return (
      <div className="empty-state">
        Select a book first.
        <button className="primary-button" onClick={onBack} type="button">Back to library</button>
      </div>
    )
  }

  const totalReads = (book.download_count || 0) + viewCount
  const totalPages = getTotalPages(book)
  const detailChapters = getBookChapters(book, totalPages)
  const totalChapters = detailChapters.length
  const language = book.languages?.join(', ').toUpperCase() || 'EN'
  const readingTime = Math.max(1, Math.round(totalPages * 2.2))
  const rating = Math.min(5, Math.max(3.8, (book.download_count || 1000) / 25000 + 3.6)).toFixed(1)
  const checkpointKey = getCheckpointKey(account, book)
  const checkpoint = checkpoints[checkpointKey]
  const recommendations = books
    .filter((item) => item.id !== book.id)
    .map((item) => ({
      book: item,
      score:
        Number(getCategory(item) === getCategory(book)) * 3 +
        Number(getAuthor(item) === getAuthor(book)) * 2 +
        Number(Boolean(item.subjects?.some((subject) => book.subjects?.includes(subject)))),
    }))
    .filter((item) => item.score > 0)
    .sort((first, second) => second.score - first.score || (second.book.download_count || 0) - (first.book.download_count || 0))
    .map((item) => item.book)
    .slice(0, 4)

  const submitComment = () => {
    const text = commentText.trim()

    if (!text) {
      return
    }

    onComment(book.id, text)
    setCommentText('')
  }

  return (
    <section className="detail-page">
      <button className="ghost-button back-button" onClick={onBack} type="button">
        <i className="bi bi-arrow-left" />
        Back
      </button>

      <div className="detail-layout">
        <img loading="lazy" src={getCover(book)} alt={`${book.title} cover`} />
        <div className="detail-copy">
          <p className="mono-eyebrow">{getCategory(book)}</p>
          <h1>{book.title}</h1>
          <p className="detail-author">{getAuthor(book)}</p>
          <div className="rating-row" aria-label={`${rating} out of 5 stars`}>
            <span>{rating}</span>
            {[1, 2, 3, 4, 5].map((star) => (
              <i className={`bi ${star <= Math.round(rating) ? 'bi-star-fill' : 'bi-star'}`} key={star} />
            ))}
            <small>{totalReads.toLocaleString()} reads</small>
          </div>
          <div className="detail-meta-grid">
            <article>
              <i className="bi bi-file-earmark-text" />
              <strong>{totalPages}</strong>
              <span>Pages</span>
            </article>
            <article>
              <i className="bi bi-list-ol" />
              <strong>{totalChapters}</strong>
              <span>Chapters</span>
            </article>
            <article>
              <i className="bi bi-translate" />
              <strong>{language}</strong>
              <span>Language</span>
            </article>
            <article>
              <i className="bi bi-clock-history" />
              <strong>{readingTime}m</strong>
              <span>Est. read</span>
            </article>
          </div>
          <p className="book-description">{getDescription(book)}</p>
          {checkpoint && (
            <div className="checkpoint-chip">
              <i className="bi bi-bookmark-check" />
              Continue from page {checkpoint.page}
            </div>
          )}
          <div className="hero-actions">
            <button className="primary-button" onClick={() => onRead(book)} type="button">
              <i className="bi bi-journal-text" />
              Read now
            </button>
            <button className="ghost-button" onClick={() => onFavorite(book.id)} type="button">
              <i className={`bi ${favorites.includes(book.id) ? 'bi-bookmark-fill' : 'bi-bookmark'}`} />
              {favorites.includes(book.id) ? 'Saved' : 'Save book'}
            </button>
          </div>
        </div>
      </div>

      <section className="section-block detail-chapters-section">
        <div className="section-heading">
          <div>
            <p className="mono-eyebrow">Table of contents</p>
            <h2>Chapters</h2>
          </div>
          {account?.role === 'guest' && <span>Guest preview includes chapters 1-3</span>}
        </div>
        <div className="detail-chapter-grid">
          {detailChapters.map((chapter) => (
            <button key={chapter.id} onClick={() => onChapter(book, chapter)} type="button">
              <span>{chapter.number}</span>
              <div>
                <strong>{chapter.title}</strong>
                <small>{chapter.pages} pages · starts page {chapter.startPage}</small>
              </div>
              <i className={`bi ${account?.role === 'guest' && chapter.number > 3 ? 'bi-lock-fill' : 'bi-arrow-right'}`} />
            </button>
          ))}
        </div>
      </section>

      <section className="section-block comments-section">
        <div className="section-heading">
          <div>
            <p className="mono-eyebrow">Reader voices</p>
            <h2>Comments</h2>
          </div>
          <span>{comments.length} comments</span>
        </div>
        <form
          className="comment-form"
          onSubmit={(event) => {
            event.preventDefault()
            submitComment()
          }}
        >
          <label>
            {account?.role === 'guest' ? 'Comment as guest' : `Comment as ${account.name}`}
            <textarea
              value={commentText}
              onChange={(event) => setCommentText(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault()
                  submitComment()
                }
              }}
              placeholder="Share what you think about this book..."
            />
          </label>
          <button className="primary-button" disabled={!commentText.trim()} type="submit">
            <i className="bi bi-chat-left-text" />
            Post comment
          </button>
        </form>
        {comments.length ? (
          <div className="comment-list">
            {comments.map((comment) => (
              <article className="comment-item" key={comment.id}>
                <div>
                  <strong>{comment.author}</strong>
                  <span>{comment.role === 'guest' ? 'Guest reader' : 'Member'}</span>
                </div>
                <p>{comment.text}</p>
                <time dateTime={comment.createdAt}>{new Date(comment.createdAt).toLocaleDateString()}</time>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-state">No comments yet. Start the conversation.</div>
        )}
      </section>

      <section className="section-block recommendations-section">
        <div className="section-heading">
          <h2>More Books You Might Like</h2>
        </div>
        {recommendations.length ? (
          <BookGrid
            books={recommendations}
            favorites={favorites}
            onDetail={onDetail}
            onFavorite={onFavorite}
            onRead={onRead}
            viewCounts={viewCounts}
            viewerCounts={viewerCounts}
          />
        ) : (
          <div className="empty-state">No similar books yet. Load more books in Discover to expand recommendations.</div>
        )}
      </section>
    </section>
  )
}

function getCheckpointKey(account, book) {
  const accountKey = account?.role === 'guest' ? 'guest' : account?.id || account?.email || 'user'
  return `${accountKey}:${book.id}`
}

export default BookDetailPage

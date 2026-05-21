import { useState } from 'react'
import DetailChapters from '../detail/DetailChapters'
import DetailComments, { COMMENT_PREVIEW_LIMIT } from '../detail/DetailComments'
import DetailHero from '../detail/DetailHero'
import DetailRecommendations from '../detail/DetailRecommendations'
import DetailTabs from '../detail/DetailTabs'
import MembershipRequiredModal from '../detail/MembershipRequiredModal'
import { getAuthor, getCategory } from '../../utils/bookUtils'
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
  onHome,
  onAuth,
  onRead,
  viewCount = 0,
  viewCounts = {},
  viewerCounts = {},
}) {
  const [commentText, setCommentText] = useState('')
  const [showAllComments, setShowAllComments] = useState(false)
  const [showSavePrompt, setShowSavePrompt] = useState(false)
  const [showChapterPrompt, setShowChapterPrompt] = useState(false)
  const [activeDetailTab, setActiveDetailTab] = useState('chapters')
  const [commentSort, setCommentSort] = useState('newest')

  if (!book) {
    return (
      <div className="empty-state">
        Select a book first.
        <button className="primary-button" onClick={onHome || onBack} type="button">Go home</button>
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
  const checkpoint = account?.role === 'guest' ? null : checkpoints[checkpointKey]
  const sortedComments = [...comments].sort((first, second) => {
    const firstTime = new Date(first.createdAt).getTime()
    const secondTime = new Date(second.createdAt).getTime()

    return commentSort === 'newest' ? secondTime - firstTime : firstTime - secondTime
  })
  const visibleComments = showAllComments ? sortedComments : sortedComments.slice(0, COMMENT_PREVIEW_LIMIT)
  const hasMoreComments = sortedComments.length > COMMENT_PREVIEW_LIMIT
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

  const handleSaveBook = () => {
    if (account?.role === 'guest') {
      setShowSavePrompt(true)
      return
    }

    onFavorite(book.id)
  }

  const handleChapterClick = (chapter) => {
    if (account?.role === 'guest' && chapter.number > 3) {
      setShowChapterPrompt(true)
      return
    }

    onChapter(book, chapter)
  }

  return (
    <section className="detail-page">
      <DetailHero
        book={book}
        checkpoint={checkpoint}
        favorites={favorites}
        language={language}
        onAuth={onAuth}
        onRead={onRead}
        onSaveBook={handleSaveBook}
        onToggleSavePrompt={setShowSavePrompt}
        rating={rating}
        readingTime={readingTime}
        showSavePrompt={showSavePrompt}
        totalChapters={totalChapters}
        totalPages={totalPages}
        totalReads={totalReads}
      />

      <DetailTabs activeTab={activeDetailTab} onChange={setActiveDetailTab} />

      {activeDetailTab === 'chapters' && (
        <DetailChapters account={account} chapters={detailChapters} onChapterClick={handleChapterClick} />
      )}

      {activeDetailTab === 'comments' && (
        <DetailComments
          account={account}
          commentSort={commentSort}
          commentText={commentText}
          comments={sortedComments}
          hasMoreComments={hasMoreComments}
          onCommentSort={setCommentSort}
          onCommentText={setCommentText}
          onSubmitComment={submitComment}
          onToggleComments={() => setShowAllComments((current) => !current)}
          showAllComments={showAllComments}
          visibleComments={visibleComments}
        />
      )}

      {activeDetailTab === 'more' && (
        <DetailRecommendations
          books={recommendations}
          favorites={favorites}
          onDetail={onDetail}
          onFavorite={onFavorite}
          onRead={onRead}
          viewCounts={viewCounts}
          viewerCounts={viewerCounts}
        />
      )}
      {showChapterPrompt && (
        <MembershipRequiredModal
          id="detail-member-required-title"
          onClose={() => setShowChapterPrompt(false)}
          onLogin={onAuth}
        />
      )}
    </section>
  )
}

function getCheckpointKey(account, book) {
  const accountKey = account?.role === 'guest' ? 'guest' : account?.id || account?.email || 'user'
  return `${accountKey}:${book.id}`
}

export default BookDetailPage

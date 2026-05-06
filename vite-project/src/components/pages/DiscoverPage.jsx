import BookGrid from '../books/BookGrid'

function DiscoverPage({
  books,
  booksLoading,
  canLoadMore,
  favorites,
  onLoadMore,
  onDetail,
  onFavorite,
  onRead,
  query,
  setQuery,
  setTopic,
  topic,
  topics,
}) {
  return (
    <div className="discover-page">
      <section className="page-title">
        <p className="mono-eyebrow">Discover / Library</p>
        <h1>Find your next book</h1>
      </section>

      <section className="tool-panel">
        <label className="search-box">
          <i className="bi bi-search" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search title or author..."
          />
        </label>
        <div className="topic-row">
          {topics.map((item) => (
            <button className={topic === item ? 'active' : ''} onClick={() => setTopic(item)} key={item} type="button">
              {item}
            </button>
          ))}
        </div>
      </section>

      {books.length ? (
        <>
          <BookGrid books={books} favorites={favorites} onDetail={onDetail} onFavorite={onFavorite} onRead={onRead} />
          {canLoadMore && (
            <div className="load-more-row">
              <button className="primary-button" disabled={booksLoading} onClick={onLoadMore} type="button">
                <i className="bi bi-arrow-down-circle" />
                {booksLoading ? 'Loading Gutendex...' : 'Load more books'}
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="empty-state">No books match your search.</div>
      )}
    </div>
  )
}

export default DiscoverPage

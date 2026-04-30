import BookGrid from '../BookGrid'

function LibraryPage({
  books,
  favorites,
  onFavorite,
  onRead,
  query,
  setQuery,
  setTopic,
  topic,
  topics,
}) {
  return (
    <>
      <section className="tool-panel">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search title or author..."
        />
        <div className="topic-row">
          {topics.map((item) => (
            <button className={topic === item ? 'active' : ''} onClick={() => setTopic(item)} key={item}>
              {item}
            </button>
          ))}
        </div>
      </section>
      <BookGrid books={books} favorites={favorites} onRead={onRead} onFavorite={onFavorite} />
    </>
  )
}

export default LibraryPage

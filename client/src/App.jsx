import { useEffect, useMemo, useState } from "react";
import { getHome, searchMovies, getTrailer, tmdbImg } from "./api/tmdb";
import "./styles/app.css";

function Row({ title, items, onPick }) {
  return (
    <section className="row">
      <h2 className="row__title">{title}</h2>
      <div className="row__scroller">
        {items.map((m) => (
          <button
            key={m.id}
            className="card"
            onClick={() => onPick(m)}
            title={m.title || m.name}
          >
            <img
              className="card__img"
              src={tmdbImg(m.poster_path, "w342")}
              alt={m.title || m.name}
              loading="lazy"
            />
          </button>
        ))}
      </div>
    </section>
  );
}

function Modal({ movie, onClose }) {
  const [trailerKey, setTrailerKey] = useState(null);
  const [loadingTrailer, setLoadingTrailer] = useState(false);

  useEffect(() => {
    let alive = true;

    (async () => {
      if (!movie?.id) return;
      setLoadingTrailer(true);
      setTrailerKey(null);

      try {
        const t = await getTrailer(movie.id);
        if (!alive) return;
        setTrailerKey(t.key || null);
      } catch {
        if (!alive) return;
        setTrailerKey(null);
      } finally {
        if (!alive) return;
        setLoadingTrailer(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [movie?.id]);

  if (!movie) return null;

  return (
    <div className="modal" onMouseDown={onClose}>
      <div className="modal__panel" onMouseDown={(e) => e.stopPropagation()}>
        <button className="modal__close" onClick={onClose} aria-label="Close">
          ✕
        </button>

        <div className="modal__top">
          {loadingTrailer ? (
            <div className="trailer__loading">Loading trailer…</div>
          ) : trailerKey ? (
            <div className="trailer">
              <iframe
                src={`https://www.youtube.com/embed/${trailerKey}?autoplay=1&mute=1&controls=1&rel=0`}
                title="Trailer"
                allow="autoplay; encrypted-media"
                allowFullScreen
              />
            </div>
          ) : (
            <div
              className="trailer trailer--fallback"
              style={{
                backgroundImage: movie.backdrop_path
                  ? `linear-gradient(to top, rgba(0,0,0,.7), rgba(0,0,0,.25)), url(${tmdbImg(
                      movie.backdrop_path,
                      "w1280"
                    )})`
                  : undefined,
              }}
            >
              <div className="trailer__fallbackText">Trailer not available</div>
            </div>
          )}
        </div>

        <div className="modal__body">
          <h3 className="modal__title">{movie.title || movie.name}</h3>
          <p className="modal__meta">
            ⭐ {movie.vote_average?.toFixed?.(1) ?? "—"} •{" "}
            {movie.release_date || "—"}
          </p>
          <p className="modal__overview">{movie.overview}</p>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [data, setData] = useState(null);
  const [picked, setPicked] = useState(null);

  const [q, setQ] = useState("");
  const [search, setSearch] = useState(null);
  const [typing, setTyping] = useState(false);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const hero = useMemo(() => {
    const list = data?.trending || [];
    return list[Math.floor(Math.random() * Math.max(list.length, 1))];
  }, [data]);

  // Load homepage rows
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const d = await getHome();
        if (!alive) return;
        setData(d);
        setErr("");
      } catch (e) {
        if (!alive) return;
        setErr(e.message || "Failed to load");
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  // Live search (debounced)
  useEffect(() => {
    const term = q.trim();

    if (!term) {
      setSearch(null);
      setTyping(false);
      return;
    }

    setTyping(true);

    const t = setTimeout(async () => {
      try {
        const res = await searchMovies(term);
        setSearch(res.results || []);
        setErr("");
      } catch (e) {
        setErr(e.message || "Search failed");
      } finally {
        setTyping(false);
      }
    }, 350);

    return () => clearTimeout(t);
  }, [q]);

  function onSearchSubmit(e) {
    e.preventDefault(); // keep page from reloading
  }

  return (
    <div className="app">
      <header className="nav">
        <div className="nav__left">
          <div className="logo">NETFLIX</div>
        </div>

        <form className="nav__search" onSubmit={onSearchSubmit}>
          <input
            className="nav__input"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search movies..."
            aria-label="Search movies"
          />
          <button className="nav__btn" type="submit">
            Search
          </button>
        </form>
      </header>

      <main>
        <section
          className="hero"
          style={{
            backgroundImage: hero?.backdrop_path
              ? `linear-gradient(to top, rgba(0,0,0,.85), rgba(0,0,0,.2)), url(${tmdbImg(
                  hero.backdrop_path,
                  "w1280"
                )})`
              : undefined,
          }}
        >
          <div className="hero__content">
            <h1 className="hero__title">{hero?.title || "Netflix Clone"}</h1>
            <p className="hero__desc">{hero?.overview}</p>
            <div className="hero__actions">
              <button className="btn btn--primary" onClick={() => setPicked(hero)}>
                ▶ Play
              </button>
              <button className="btn btn--ghost" onClick={() => setPicked(hero)}>
                More Info
              </button>
            </div>
          </div>
        </section>

        {err && <div className="error">{err}</div>}
        {typing && <div className="status">Searching…</div>}
        {loading && <div className="status">Loading…</div>}

        {!loading && (
          <>
            {search ? (
              <Row
                title={`Search results (${search.length})`}
                items={search}
                onPick={setPicked}
              />
            ) : (
              <>
                <Row title="Trending Now" items={data?.trending || []} onPick={setPicked} />
                <Row title="Top Rated" items={data?.topRated || []} onPick={setPicked} />
                <Row title="Action" items={data?.action || []} onPick={setPicked} />
                <Row title="Comedy" items={data?.comedy || []} onPick={setPicked} />
              </>
            )}
          </>
        )}
      </main>

      <Modal movie={picked} onClose={() => setPicked(null)} />
    </div>
  );
}

const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

dotenv.config();

const app = express();
app.use(express.json());

app.use(
  cors({
    origin: ["http://localhost:5173"],
    methods: ["GET"],
  })
);

const PORT = process.env.PORT || 5000;
const TMDB_API_KEY = process.env.TMDB_API_KEY;

if (!TMDB_API_KEY) {
  console.error("❌ Missing TMDB_API_KEY in server/.env");
}

const TMDB_BASE = "https://api.themoviedb.org/3";

async function tmdb(path, params = {}) {
  const url = new URL(`${TMDB_BASE}${path}`);
  url.searchParams.set("api_key", TMDB_API_KEY);
  url.searchParams.set("language", "en-US");

  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") {
      url.searchParams.set(k, String(v));
    }
  }

  const res = await fetch(url.toString());
  const text = await res.text();

  if (!res.ok) {
    throw new Error(`TMDB error ${res.status}: ${text}`);
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function pickTrailerKey(results = []) {
  // Prefer YouTube official trailers, then any YouTube trailer, then any YouTube video.
  const yt = results.filter((v) => v.site === "YouTube");
  const officialTrailer = yt.find((v) => v.type === "Trailer" && v.official);
  const anyTrailer = yt.find((v) => v.type === "Trailer");
  const anyYt = yt[0];
  return officialTrailer?.key || anyTrailer?.key || anyYt?.key || null;
}

app.get("/api/health", (req, res) => {
  res.json({ ok: true });
});

app.get("/api/home", async (req, res) => {
  try {
    const [trending, topRated, action, comedy] = await Promise.all([
      tmdb("/trending/movie/week"),
      tmdb("/movie/top_rated"),
      tmdb("/discover/movie", { with_genres: 28, sort_by: "popularity.desc" }),
      tmdb("/discover/movie", { with_genres: 35, sort_by: "popularity.desc" }),
    ]);

    res.json({
      trending: trending.results || [],
      topRated: topRated.results || [],
      action: action.results || [],
      comedy: comedy.results || [],
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to load home", detail: err.message });
  }
});

app.get("/api/search", async (req, res) => {
  try {
    const q = (req.query.q || "").trim();
    if (!q) return res.json({ results: [] });

    const data = await tmdb("/search/movie", { query: q, include_adult: false });
    res.json({ results: data.results || [] });
  } catch (err) {
    res.status(500).json({ error: "Search failed", detail: err.message });
  }
});

app.get("/api/movie/:id", async (req, res) => {
  try {
    const data = await tmdb(`/movie/${req.params.id}`);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Movie failed", detail: err.message });
  }
});

app.get("/api/movie/:id/trailer", async (req, res) => {
  try {
    const videos = await tmdb(`/movie/${req.params.id}/videos`);
    const key = pickTrailerKey(videos.results || []);
    res.json({ key });
  } catch (err) {
    res.status(500).json({ error: "Trailer failed", detail: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});

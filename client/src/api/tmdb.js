const BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";

export async function getHome() {
  const res = await fetch(`${BASE}/api/home`);
  if (!res.ok) throw new Error(`Home failed: ${res.status}`);
  return res.json();
}

export async function searchMovies(q) {
  const res = await fetch(`${BASE}/api/search?q=${encodeURIComponent(q)}`);
  if (!res.ok) throw new Error(`Search failed: ${res.status}`);
  return res.json();
}

export async function getTrailer(id) {
  const res = await fetch(`${BASE}/api/movie/${id}/trailer`);
  if (!res.ok) throw new Error(`Trailer failed: ${res.status}`);
  return res.json();
}

export function tmdbImg(path, size = "w500") {
  if (!path) return "";
  return `https://image.tmdb.org/t/p/${size}${path}`;
}

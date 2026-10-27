# AgriHerd AI API

This service keeps `GEMINI_API_KEY` on the server and exposes:

- `GET /api/ai/health`
- `POST /api/ai/triage`

Run locally with `npm run start:server` after loading the backend environment variables. The API intentionally falls back to a safe deterministic message when Gemini is not configured or unavailable.

# Google Reviews Dynamic Data — Setup Guide

This project fetches live Google review data (rating, count, and reviews) from the Google Places API and displays it across the site via Next.js ISR (Incremental Static Regeneration).

## Prerequisites

- A Google Cloud account
- Access to the [Google Cloud Console](https://console.cloud.google.com/)

## Step 1: Create or Select a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click the project dropdown at the top and select **ApartmentHub** (or create a new project)

## Step 2: Enable the Places API

1. In the left sidebar, go to **APIs & Services** → **Library**
2. Search for **"Places API"**
3. Click on it and press **Enable**

> **Note:** Use the classic "Places API", not "Places API (New)". The New version uses a different endpoint format.

## Step 3: Create an API Key

1. Go to **APIs & Services** → **Credentials**
2. Click **+ Create Credentials** → **API Key**
3. Copy the generated key (starts with `AIzaSy...`)
4. **Restrict the key** (highly recommended):
   - Click on the key to edit it
   - Under **Application restrictions**, choose **HTTP referrers**
   - Add: `apartmenthub.nl/*` and `www.apartmenthub.nl/*`
   - Under **API restrictions**, choose **Restrict key** and select **Places API**
   - Click **Save**

## Step 4: Get the Place ID for ApartmentHub

1. Open the [Place ID Finder](https://developers.google.com/maps/documentation/places/web-service/place-id)
2. In the search box, type **"ApartmentHub Amsterdam"**
3. The Place ID appears below the search bar (format: `ChIJ...`)
4. Copy it

> **Tip:** If the Place ID finder doesn't find it, try searching on [Google Maps](https://maps.google.com) first. Once you find the business listing, the Place ID can be extracted from the URL or by using the [Places Details API](https://developers.google.com/maps/documentation/places/web-service/details) with a text search.

### Alternative: Find Place ID via API

```bash
curl - "https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=ApartmentHub%20Amsterdam&inputtype=textquery&fields=place_id&key=YOUR_API_KEY"
```

## Step 5: Add Environment Variables

Add these to `.env.local`:

```env
# Google Places API (server-side only — never expose in browser)
GOOGLE_PLACES_API_KEY=AIzaSy...your-key-here

# Google Place ID for ApartmentHub (safe to expose — just an identifier)
NEXT_PUBLIC_GOOGLE_PLACE_ID=ChIJ...your-place-id-here
```

> **Security:** `GOOGLE_PLACES_API_KEY` is **server-side only** — it's only used in the API route (`/api/google-reviews`) and is never sent to the browser. `NEXT_PUBLIC_GOOGLE_PLACE_ID` is just a public identifier and is safe to expose.

## Step 6: Verify It Works

Start the dev server and test the endpoint:

```bash
npm run dev
```

Then visit: `http://localhost:3000/api/google-reviews`

You should see JSON like:

```json
{
  "rating": 4.9,
  "reviewCount": 73,
  "reviews": [
    {
      "authorName": "Eva Hofman",
      "rating": 5,
      "text": "We had been searching for months...",
      "photoUrl": "https://lh3.googleusercontent.com/...",
      "relativeTime": "2 months ago"
    }
  ]
}
```

If the API key or Place ID is missing, the endpoint returns fallback defaults (rating: 4.9, reviewCount: 73, empty reviews) — the site never breaks.

## How It Works

### Architecture

```
Google Places API
       ↓
/api/google-reviews  (Route Handler, cached 24h via Next.js ISR)
       ↓
useGoogleReviews()   (Client hook with instant fallback)
       ↓
Sell.jsx · Buy.jsx · GoogleReviews.jsx · MetaLeadFormB.jsx · DiscoverMore.jsx · TestimonialSection.jsx
```

### ISR Caching

- The API route uses `export const revalidate = 86400` (24 hours)
- Next.js caches the response and revalidates in the background
- Review count and rating update within 24 hours of a change on Google
- No external caching service needed

### Fallback Strategy

- **Server-side**: If the Google API call fails or the key is missing, the route returns hardcoded defaults
- **Client-side**: `useGoogleReviews()` renders immediately with defaults, then swaps in live data when the fetch completes
- This ensures zero flash of missing content (FOUC) and the site always works offline or during API outages

### Review Texts

Google Places API returns a maximum of 5 reviews per request. The site currently has 10 hand-written review texts for richer display. The implementation merges both:
- When a Google review author matches a hand-written review, the hand-written text is used (more polished)
- Otherwise, the Google API review text is displayed as-is
- The review carousel always has content regardless of API response

## Troubleshooting

| Issue | Solution |
|-------|----------|
| `REQUEST_DENIED` from Google | Check that the Places API is enabled and the API key is correct |
| `INVALID_REQUEST` | Verify the Place ID format (should start with `ChIJ` or `0x`) |
| Always getting fallback data | Check `.env.local` has both `GOOGLE_PLACES_API_KEY` and `NEXT_PUBLIC_GOOGLE_PLACE_ID` |
| Key works in browser but not in prod | Ensure HTTP referrer restrictions include your production domain |
| Reviews show but rating is wrong | The Place ID might be for a different listing — verify it's the correct one |

## Updating Fallback Defaults

When the live data is confirmed working, update the fallback constants in `src/config/googleReviews.js` to match the current live values. This ensures the instant-render fallback is close to accurate.
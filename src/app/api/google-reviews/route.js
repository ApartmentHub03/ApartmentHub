import { NextResponse } from 'next/server';
import { DEFAULT_RATING, DEFAULT_REVIEW_COUNT, REVIEW_TEXTS, REVIEW_AUTHORS } from '@/config/googleReviews';

export const revalidate = 86400;

export async function GET() {
    const apiKey = process.env.GOOGLE_PLACES_API_KEY;
    const placeId = process.env.NEXT_PUBLIC_GOOGLE_PLACE_ID;

    if (!apiKey || !placeId) {
        return NextResponse.json({
            rating: DEFAULT_RATING,
            reviewCount: DEFAULT_REVIEW_COUNT,
            reviews: REVIEW_AUTHORS.map((author) => ({
                ...author,
                text: REVIEW_TEXTS[author.id]?.en || '',
                relativeTime: '',
            })),
        });
    }

    try {
        const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=rating,user_ratings_total,reviews&key=${apiKey}&language=en`;
        const res = await fetch(url, { next: { revalidate: 86400 } });

        if (!res.ok) {
            throw new Error(`Google Places API returned ${res.status}`);
        }

        const data = await res.json();

        if (data.status !== 'OK' || !data.result) {
            throw new Error(`Google Places API status: ${data.status}`);
        }

        const { rating, user_ratings_total, reviews: googleReviews } = data.result;

        const reviews = (googleReviews || []).map((review) => {
            const authorId = REVIEW_AUTHORS.find(
                (a) => a.name.toLowerCase() === (review.author_name || '').toLowerCase()
            )?.id;

            return {
                id: authorId || null,
                authorName: review.author_name || 'Anonymous',
                rating: review.rating || 5,
                text: (authorId && REVIEW_TEXTS[authorId]?.en) || review.text || '',
                photoUrl: review.profile_photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(review.author_name || 'A')}&background=random&size=96`,
                relativeTime: review.relative_time_description || '',
                location: authorId ? REVIEW_AUTHORS.find((a) => a.id === authorId)?.location : '',
            };
        });

        return NextResponse.json({
            rating: rating ?? DEFAULT_RATING,
            reviewCount: user_ratings_total ?? DEFAULT_REVIEW_COUNT,
            reviews,
        });
    } catch (err) {
        console.error('Google Places API error:', err.message);
        return NextResponse.json({
            rating: DEFAULT_RATING,
            reviewCount: DEFAULT_REVIEW_COUNT,
            reviews: REVIEW_AUTHORS.map((author) => ({
                ...author,
                text: REVIEW_TEXTS[author.id]?.en || '',
                relativeTime: '',
            })),
        });
    }
}
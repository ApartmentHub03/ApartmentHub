'use client';

import { useState, useEffect } from 'react';
import { DEFAULT_RATING, DEFAULT_REVIEW_COUNT, REVIEW_TEXTS, REVIEW_AUTHORS } from '@/config/googleReviews';

let cachedData = null;
let fetchPromise = null;

function getFallbackReviews(lang) {
    return REVIEW_AUTHORS.map((author) => ({
        ...author,
        text: REVIEW_TEXTS[author.id]?.[lang] || REVIEW_TEXTS[author.id]?.en || '',
        relativeTime: '',
    }));
}

export default function useGoogleReviews(lang = 'en') {
    const [data, setData] = useState(() => ({
        rating: DEFAULT_RATING,
        reviewCount: DEFAULT_REVIEW_COUNT,
        reviews: getFallbackReviews(lang),
        loading: !cachedData,
    }));

    useEffect(() => {
        if (cachedData) {
            setData({ ...cachedData, reviews: mergeWithLocalTexts(cachedData.reviews, lang), loading: false });
            return;
        }

        if (!fetchPromise) {
            fetchPromise = fetch('/api/google-reviews')
                .then((res) => res.json())
                .then((json) => {
                    cachedData = json;
                    fetchPromise = null;
                    return json;
                })
                .catch(() => {
                    const fallback = {
                        rating: DEFAULT_RATING,
                        reviewCount: DEFAULT_REVIEW_COUNT,
                        reviews: getFallbackReviews(lang),
                    };
                    cachedData = fallback;
                    fetchPromise = null;
                    return fallback;
                });
        }

        fetchPromise.then((json) => {
            setData({ ...json, reviews: mergeWithLocalTexts(json.reviews, lang), loading: false });
        });
    }, [lang]);

    return data;
}

function mergeWithLocalTexts(apiReviews, lang) {
    const localTexts = REVIEW_TEXTS;
    const localAuthors = REVIEW_AUTHORS;

    const apiWithLocal = (apiReviews || []).map((review) => {
        const authorId = review.id || localAuthors.find((a) => a.name.toLowerCase() === (review.authorName || '').toLowerCase())?.id;
        const localText = authorId && localTexts[authorId]?.[lang];
        return {
            ...review,
            text: localText || review.text || '',
        };
    });

    const coveredIds = new Set(apiWithLocal.map((r) => r.id).filter(Boolean));
    const remaining = localAuthors.filter((a) => !coveredIds.has(a.id));

    const fallbackAuthors = remaining.map((author) => ({
        id: author.id,
        authorName: author.name,
        name: author.name,
        location: author.location,
        rating: author.rating,
        photo: author.photo,
        photoUrl: author.photo,
        text: localTexts[author.id]?.[lang] || localTexts[author.id]?.en || '',
        relativeTime: '',
    }));

    return [...apiWithLocal, ...fallbackAuthors];
}
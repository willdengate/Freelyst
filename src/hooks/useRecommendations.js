import { useMemo } from 'react';

export function useRecommendations(listings, interests) {
  return useMemo(() => {
    if (!listings?.length) return [];
    if (!interests?.length) return listings;

    // Build interest profile
    const categoryScores = {};
    const keywordSet = new Set();
    const viewedIds = new Set();

    interests.forEach(interest => {
      if (interest.category) {
        categoryScores[interest.category] = (categoryScores[interest.category] || 0) + 
          (interest.type === 'save' ? 3 : interest.type === 'view' ? 2 : 1);
      }
      if (interest.keyword) {
        interest.keyword.toLowerCase().split(/\s+/).forEach(w => {
          if (w.length > 2) keywordSet.add(w);
        });
      }
      if (interest.listing_id) viewedIds.add(interest.listing_id);
    });

    // Score each listing
    const scored = listings.map(listing => {
      let score = 0;

      // Category match
      if (listing.category && categoryScores[listing.category]) {
        score += categoryScores[listing.category] * 10;
      }

      // Keyword relevance
      const titleWords = listing.title?.toLowerCase().split(/\s+/) || [];
      titleWords.forEach(word => {
        if (keywordSet.has(word)) score += 5;
      });

      // Recency boost
      if (listing.created_date) {
        const ageHours = (Date.now() - new Date(listing.created_date).getTime()) / 3600000;
        if (ageHours < 24) score += 15;
        else if (ageHours < 72) score += 8;
        else if (ageHours < 168) score += 3;
      }

      // Penalize already viewed
      if (viewedIds.has(listing.id)) score -= 5;

      // Small random factor
      score += Math.random() * 3;

      return { ...listing, _score: score };
    });

    return scored.sort((a, b) => b._score - a._score);
  }, [listings, interests]);
}
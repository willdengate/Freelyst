const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import { useState, useEffect, useCallback } from 'react';

export function useUserData() {
  const [user, setUser] = useState(null);
  const [savedIds, setSavedIds] = useState([]);
  const [interests, setInterests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const me = await db.auth.me();
      setUser(me);

      const [saved, userInterests] = await Promise.all([
        db.entities.SavedListing.filter({ user_email: me.email }),
        db.entities.UserInterest.filter({ user_email: me.email }, '-created_date', 50),
      ]);

      setSavedIds(saved.map(s => s.listing_id));
      setInterests(userInterests);
      setLoading(false);
    };
    load();
  }, []);

  const toggleSave = useCallback(async (listingId, price) => {
    if (!user) return;
    const isSaved = savedIds.includes(listingId);

    if (isSaved) {
      const saved = await db.entities.SavedListing.filter({
        user_email: user.email,
        listing_id: listingId,
      });
      if (saved.length > 0) {
        await db.entities.SavedListing.delete(saved[0].id);
      }
      setSavedIds(prev => prev.filter(id => id !== listingId));
    } else {
      await db.entities.SavedListing.create({
        user_email: user.email,
        listing_id: listingId,
        ...(price !== undefined && { saved_price: price }),
      });
      setSavedIds(prev => [...prev, listingId]);
      // Track interest
      await db.entities.UserInterest.create({
        user_email: user.email,
        type: 'save',
        listing_id: listingId,
      });
    }
  }, [user, savedIds]);

  const trackSearch = useCallback(async (keyword) => {
    if (!user || !keyword) return;
    await db.entities.UserInterest.create({
      user_email: user.email,
      type: 'search',
      keyword,
    });
  }, [user]);

  return { user, savedIds, interests, loading, toggleSave, trackSearch };
}
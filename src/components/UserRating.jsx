const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import { useState, useEffect } from 'react';

import StarRating from './StarRating';

// canRate is only true if the current user has actually messaged this person
export default function UserRating({ userEmail, role, currentUserEmail, listingId, requireMessaged = false }) {
  const [avg, setAvg] = useState(null);
  const [count, setCount] = useState(0);
  const [myRating, setMyRating] = useState(null);
  const [saving, setSaving] = useState(false);
  const [hasMessaged, setHasMessaged] = useState(!requireMessaged);

  useEffect(() => {
    if (!userEmail) return;
    const load = async () => {
      const ratings = await db.entities.Rating.filter({ rated_email: userEmail, role });
      setCount(ratings.length);
      if (ratings.length) {
        setAvg(ratings.reduce((s, r) => s + r.score, 0) / ratings.length);
      }
      if (currentUserEmail && currentUserEmail !== userEmail) {
        const mine = ratings.find(r => r.rater_email === currentUserEmail);
        if (mine) setMyRating(mine);
      }

      // Check if current user has exchanged messages with this person
      if (requireMessaged && currentUserEmail && currentUserEmail !== userEmail) {
        const [sent, received] = await Promise.all([
          db.entities.Message.filter({ sender_email: currentUserEmail, receiver_email: userEmail }),
          db.entities.Message.filter({ sender_email: userEmail, receiver_email: currentUserEmail }),
        ]);
        setHasMessaged(sent.length > 0 || received.length > 0);
      }
    };
    load();
  }, [userEmail, role, currentUserEmail, requireMessaged]);

  const handleRate = async (score) => {
    if (!currentUserEmail || currentUserEmail === userEmail || saving || !hasMessaged) return;
    setSaving(true);
    if (myRating) {
      await db.entities.Rating.update(myRating.id, { score });
      setMyRating(prev => ({ ...prev, score }));
    } else {
      const created = await db.entities.Rating.create({
        rater_email: currentUserEmail,
        rated_email: userEmail,
        role,
        score,
        listing_id: listingId || '',
      });
      setMyRating(created);
    }
    const ratings = await db.entities.Rating.filter({ rated_email: userEmail, role });
    setCount(ratings.length);
    setAvg(ratings.reduce((s, r) => s + r.score, 0) / ratings.length);
    setSaving(false);
  };

  const canRate = currentUserEmail && currentUserEmail !== userEmail && hasMessaged;

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{role} rating</span>
        {count > 0 && (
          <span className="text-xs text-muted-foreground">({avg?.toFixed(1)} · {count})</span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <StarRating
          score={myRating?.score ?? avg ?? 0}
          onRate={canRate ? handleRate : undefined}
          size="sm"
        />
        {canRate && (
          <span className="text-[10px] text-muted-foreground">
            {myRating ? 'Your rating' : 'Tap to rate'}
          </span>
        )}
        {!canRate && requireMessaged && !hasMessaged && currentUserEmail && currentUserEmail !== userEmail && (
          <span className="text-[10px] text-muted-foreground">Message first to rate</span>
        )}
        {count === 0 && !canRate && !requireMessaged && (
          <span className="text-xs text-muted-foreground">No ratings yet</span>
        )}
      </div>
    </div>
  );
}
const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import { useState, useEffect } from 'react';

import { Link } from 'react-router-dom';
import { formatPrice } from '@/lib/currencies';
import { Gift } from 'lucide-react';
import moment from 'moment';

export default function SharedListings({ user, onRead }) {
  const [shares, setShares] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadShares();
  }, [user]);

  const loadShares = async () => {
    setLoading(true);
    const data = await db.entities.ListingShare.filter(
      { receiver_email: user.email },
      '-created_date',
      50
    );
    setShares(data);
    // Mark all unread as read
    const unread = data.filter(s => !s.read);
    await Promise.all(unread.map(s => db.entities.ListingShare.update(s.id, { read: true })));
    if (unread.length > 0) onRead?.();
    setLoading(false);
  };

  if (loading) {
    return <div className="flex justify-center py-12"><div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  if (shares.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Gift className="w-10 h-10 text-muted-foreground/30 mb-3" />
        <p className="font-semibold">No shared listings</p>
        <p className="text-sm text-muted-foreground mt-1">When friends share listings with you, they'll appear here</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {shares.map(share => (
        <Link
          key={share.id}
          to={`/listing/${share.listing_id}`}
          className={`flex gap-3 p-3 border rounded-2xl transition-shadow hover:shadow-md ${
            !share.read ? 'bg-primary/5 border-primary/20' : 'bg-card border-border'
          }`}
        >
          <div className="w-16 h-16 rounded-xl overflow-hidden bg-muted flex-shrink-0">
            {share.listing_image ? (
              <img src={share.listing_image} alt={share.listing_title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-2xl">📦</div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground font-medium">{share.sender_name} shared with you</p>
            <p className="font-semibold text-sm line-clamp-1 mt-0.5">{share.listing_title}</p>
            {share.listing_price && (
              <p className="font-bold text-primary text-sm">{formatPrice(share.listing_price, share.listing_currency)}</p>
            )}
            {share.message && (
              <p className="text-xs text-muted-foreground mt-1 italic line-clamp-1">"{share.message}"</p>
            )}
            <p className="text-[10px] text-muted-foreground mt-1">{moment(share.created_date).fromNow()}</p>
          </div>
        </Link>
      ))}
    </div>
  );
}
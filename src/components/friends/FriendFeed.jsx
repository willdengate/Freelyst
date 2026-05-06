const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import { useState, useEffect } from 'react';

import { Link } from 'react-router-dom';
import { formatPrice } from '@/lib/currencies';
import { MapPin } from 'lucide-react';
import moment from 'moment';

export default function FriendFeed({ user }) {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFeed();
  }, [user]);

  const loadFeed = async () => {
    setLoading(true);
    // Get all accepted friendships
    const [sent, received] = await Promise.all([
      db.entities.Friendship.filter({ requester_email: user.email, status: 'accepted' }),
      db.entities.Friendship.filter({ receiver_email: user.email, status: 'accepted' }),
    ]);

    const friendEmails = [
      ...sent.map(f => f.receiver_email),
      ...received.map(f => f.requester_email),
    ];

    if (friendEmails.length === 0) {
      setListings([]);
      setLoading(false);
      return;
    }

    // Fetch recent listings from friends
    const allListings = await db.entities.Listing.list('-created_date', 100);
    const friendListings = allListings.filter(l =>
      friendEmails.includes(l.seller_email) && l.status === 'active'
    );

    setListings(friendListings);
    setLoading(false);
  };

  if (loading) {
    return <div className="flex justify-center py-12"><div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  if (listings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <span className="text-4xl mb-3">👥</span>
        <p className="font-semibold">Nothing here yet</p>
        <p className="text-sm text-muted-foreground mt-1">Add friends to see their listings in your feed</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground font-medium">Recent listings from your friends</p>
      {listings.map(listing => (
        <Link
          key={listing.id}
          to={`/listing/${listing.id}`}
          className="flex gap-3 p-3 bg-card border border-border rounded-2xl hover:shadow-md transition-shadow"
        >
          <div className="w-20 h-20 rounded-xl overflow-hidden bg-muted flex-shrink-0">
            {listing.images?.[0] ? (
              <img src={listing.images[0]} alt={listing.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-2xl">📦</div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground font-medium">{listing.seller_name}</p>
            <p className="font-bold text-primary text-base mt-0.5">{formatPrice(listing.price, listing.currency)}</p>
            <p className="text-sm font-medium line-clamp-1">{listing.title}</p>
            {listing.location_name && (
              <div className="flex items-center gap-1 mt-1 text-muted-foreground">
                <MapPin className="w-3 h-3" />
                <span className="text-xs">{listing.location_name}</span>
              </div>
            )}
            <p className="text-[10px] text-muted-foreground mt-1">{moment(listing.created_date).fromNow()}</p>
          </div>
        </Link>
      ))}
    </div>
  );
}
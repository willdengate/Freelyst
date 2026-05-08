import { db } from '@/api/base44client';
import { Heart, MapPin, MessageCircle, Send } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
import { useState } from 'react';
import ChatSheet from './ChatSheet';
import { formatPrice } from '@/lib/currencies';

const placeholderImages = [
  'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&q=80',
  'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&q=80',
  'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=400&q=80',
];

export default function ListingCard({ listing, isSaved, onToggleSave, compact = false }) {
  const [imageError, setImageError] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const image = listing.images?.[0] || placeholderImages[listing.id?.charCodeAt(0) % 3 || 0];

  const handleSave = async (e) => { e.preventDefault(); e.stopPropagation(); onToggleSave?.(listing.id, listing.price); };

  const handleMessage = async (e) => {
    e.preventDefault(); e.stopPropagation();
    const me = await db.auth.me();
    setCurrentUser(me);
    setChatOpen(true);
  };

  const trackView = async () => {
    const user = await db.auth.me();
    if (!user) return;
    db.entities.UserInterest.create({ user_email: user.email, type: 'view', keyword: listing.title, category: listing.category, listing_id: listing.id });
  };

  return (
    <>
      <Link to={`/listing/${listing.id}`} onClick={trackView} className={cn("group block rounded-2xl overflow-hidden bg-card border border-border/50 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5", compact ? "flex gap-3 p-3" : "")}>
        <div className={cn("relative overflow-hidden bg-muted", compact ? "w-24 h-24 rounded-xl flex-shrink-0" : "aspect-square")}>
          <img src={imageError ? placeholderImages[0] : image} alt={listing.title} onError={() => setImageError(true)} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
          {!compact && (
            <button onClick={handleSave} className={cn("absolute top-2.5 right-2.5 w-8 h-8 rounded-full flex items-center justify-center transition-all", isSaved ? "bg-primary text-primary-foreground shadow-md" : "bg-black/30 backdrop-blur-sm text-white hover:bg-black/50")}>
              <Heart className={cn("w-4 h-4", isSaved && "fill-current")} />
            </button>
          )}
          {listing.condition === 'New' && !compact && <span className="absolute top-2.5 left-2.5 px-2 py-0.5 text-[10px] font-semibold bg-primary text-primary-foreground rounded-full">NEW</span>}
        </div>
        <div className={cn(compact ? "flex-1 py-0.5" : "p-3")}>
          <p className="font-bold text-base text-foreground">{formatPrice(listing.price, listing.currency)}</p>
          <p className="text-sm text-foreground/80 line-clamp-1 mt-0.5">{listing.title}</p>
          {listing.location_name && <div className="flex items-center gap-1 mt-1.5 text-muted-foreground"><MapPin className="w-3 h-3" /><span className="text-xs">{listing.location_name}</span></div>}
          {!compact && (
            <div className="mt-2 flex gap-1.5">
              <button onClick={handleMessage} className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary text-xs font-semibold transition-colors">
                <MessageCircle className="w-3.5 h-3.5" /> Message
              </button>
            </div>
          )}
        </div>
      </Link>
      {chatOpen && currentUser && currentUser.email !== listing.seller_email && (
        <ChatSheet open={chatOpen} onOpenChange={setChatOpen} listing={listing} currentUser={currentUser} />
      )}
    </>
  );
}

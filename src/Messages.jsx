import { db } from '@/api/base44client';
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Heart, MapPin, MessageCircle, ChevronLeft, ChevronRight, Tag } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import UserRating from '../components/UserRating';
import ChatSheet from '../components/ChatSheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import moment from 'moment';
import { formatPrice } from '@/lib/currencies';

const placeholderImages = [
  'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&q=80',
  'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&q=80',
];

export default function ListingDetail() {
  const { listingId } = useParams();
  const navigate = useNavigate();
  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSaved, setIsSaved] = useState(false);
  const [currentImage, setCurrentImage] = useState(0);
  const [user, setUser] = useState(null);
  const [offerOpen, setOfferOpen] = useState(false);
  const [offerAmount, setOfferAmount] = useState('');
  const [offerSending, setOfferSending] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);

  useEffect(() => {
    const load = async () => {
      const [data, me] = await Promise.all([
        db.entities.Listing.get(listingId),
        db.auth.me(),
      ]);
      setListing(data);
      setUser(me);
      if (me && data) {
        const saved = await db.entities.SavedListing.filter({ user_email: me.email, listing_id: listingId });
        setIsSaved(saved.length > 0);
        try {
          await db.entities.UserInterest.create({ user_email: me.email, type: 'view', keyword: data?.title, category: data?.category, listing_id: listingId });
        } catch {}
      }
      setLoading(false);
    };
    load();
  }, [listingId]);

  const toggleSave = async () => {
    if (!user) { toast.error('Please log in to save listings'); return; }
    if (isSaved) {
      const saved = await db.entities.SavedListing.filter({ user_email: user.email, listing_id: listingId });
      if (saved.length > 0) await db.entities.SavedListing.delete(saved[0].id);
      setIsSaved(false);
    } else {
      await db.entities.SavedListing.create({ user_email: user.email, listing_id: listingId, saved_price: listing.price });
      setIsSaved(true);
    }
  };

  const sendOffer = async () => {
    if (!offerAmount || isNaN(offerAmount) || !user) return;
    setOfferSending(true);
    const offerValue = parseFloat(offerAmount);
    const minAcceptable = listing.price * 0.5;
    if (offerValue < minAcceptable) {
      await db.entities.Message.create({ listing_id: listingId, listing_title: listing.title, sender_email: listing.seller_email, sender_name: listing.seller_name, receiver_email: user.email, content: `Sorry, your offer of ${formatPrice(offerValue, listing.currency)} for "${listing.title}" is too low and has been automatically declined.` });
      toast.error('Offer declined: too low. Check your messages.');
    } else {
      await db.entities.Message.create({ listing_id: listingId, listing_title: listing.title, sender_email: user.email, sender_name: user.full_name || user.email, receiver_email: listing.seller_email, content: `Hi! I'd like to make an offer of ${formatPrice(offerValue, listing.currency)} for "${listing.title}".` });
      toast.success('Offer sent!');
    }
    setOfferSending(false);
    setOfferOpen(false);
    setOfferAmount('');
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  if (!listing) return <div className="flex items-center justify-center min-h-screen"><p className="text-muted-foreground">Listing not found</p></div>;

  const images = listing.images?.length > 0 ? listing.images : placeholderImages;
  const isOwner = user?.email === listing.seller_email;

  return (
    <div className="pb-24">
      <div className="sticky top-0 z-40 flex items-center justify-between px-4 h-14 bg-background/80 backdrop-blur-xl">
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-black/20 backdrop-blur-sm flex items-center justify-center"><ArrowLeft className="w-4 h-4 text-white" /></button>
        <button onClick={toggleSave} className={cn("w-9 h-9 rounded-full flex items-center justify-center", isSaved ? "bg-primary text-primary-foreground" : "bg-black/20 backdrop-blur-sm text-white")}>
          <Heart className={cn("w-4 h-4", isSaved && "fill-current")} />
        </button>
      </div>
      <div className="relative -mt-14">
        <div className="aspect-square bg-muted relative overflow-hidden">
          <img src={images[currentImage]} alt={listing.title} className="w-full h-full object-cover" />
          {images.length > 1 && (
            <>
              <button onClick={() => setCurrentImage(i => (i - 1 + images.length) % images.length)} className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 flex items-center justify-center"><ChevronLeft className="w-4 h-4 text-white" /></button>
              <button onClick={() => setCurrentImage(i => (i + 1) % images.length)} className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 flex items-center justify-center"><ChevronRight className="w-4 h-4 text-white" /></button>
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1">
                {images.map((_, i) => <div key={i} className={cn("w-1.5 h-1.5 rounded-full", i === currentImage ? "bg-white" : "bg-white/40")} />)}
              </div>
            </>
          )}
        </div>
      </div>
      <div className="px-4 pt-4 space-y-4">
        <div>
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-2xl font-extrabold text-primary">{formatPrice(listing.price, listing.currency)}</p>
              <h1 className="text-lg font-bold mt-0.5">{listing.title}</h1>
            </div>
            <span className="px-3 py-1 rounded-full bg-secondary text-xs font-semibold capitalize flex-shrink-0 mt-1">{listing.condition}</span>
          </div>
          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
            {listing.location_name && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{listing.location_name}</span>}
            <span>{moment(listing.created_date).fromNow()}</span>
          </div>
        </div>
        {listing.description && <div><h3 className="font-semibold text-sm mb-1">Description</h3><p className="text-sm text-muted-foreground leading-relaxed">{listing.description}</p></div>}
        <div className="bg-card border border-border rounded-2xl p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center"><span className="text-primary font-bold">{listing.seller_name?.[0]?.toUpperCase() || '?'}</span></div>
            <div><p className="font-semibold text-sm">{listing.seller_name || 'Seller'}</p><p className="text-xs text-muted-foreground">{listing.seller_email}</p></div>
          </div>
          <UserRating userEmail={listing.seller_email} role="seller" currentUserEmail={user?.email} />
        </div>
      </div>
      {!isOwner && user && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/90 backdrop-blur-xl border-t border-border flex gap-3">
          <Button variant="outline" className="flex-1 rounded-full h-12" onClick={() => setOfferOpen(true)}><Tag className="w-4 h-4 mr-2" />Make Offer</Button>
          <Button className="flex-1 rounded-full h-12" onClick={() => setChatOpen(true)}><MessageCircle className="w-4 h-4 mr-2" />Message</Button>
        </div>
      )}
      {isOwner && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/90 backdrop-blur-xl border-t border-border">
          <Button className="w-full rounded-full h-12" onClick={() => navigate(`/listing/${listingId}/edit`)}>Edit Listing</Button>
        </div>
      )}
      <Dialog open={offerOpen} onOpenChange={setOfferOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader><DialogTitle>Make an Offer</DialogTitle></DialogHeader>
          <div className="py-2">
            <p className="text-sm text-muted-foreground mb-3">Asking price: {formatPrice(listing.price, listing.currency)}</p>
            <Input type="number" value={offerAmount} onChange={e => setOfferAmount(e.target.value)} placeholder="Your offer amount" className="rounded-xl h-11" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOfferOpen(false)} className="rounded-full">Cancel</Button>
            <Button onClick={sendOffer} disabled={offerSending || !offerAmount} className="rounded-full">{offerSending ? 'Sending...' : 'Send Offer'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {chatOpen && user && <ChatSheet open={chatOpen} onOpenChange={setChatOpen} listing={listing} currentUser={user} />}
    </div>
  );
}

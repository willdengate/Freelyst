const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Heart, Share2, MapPin, Clock, MessageCircle, ChevronLeft, ChevronRight, CheckCircle2, Tag, Send, UserPlus, UserCheck } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import UserRating from '../components/UserRating';
import ChatSheet from '../components/ChatSheet';
import SendToFriendSheet from '../components/friends/SendToFriendSheet';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
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
  const [shareOpen, setShareOpen] = useState(false);
  const [friendStatus, setFriendStatus] = useState(null); // null | 'pending' | 'accepted'

  useEffect(() => {
    const load = async () => {
      const [data, me] = await Promise.all([
        db.entities.Listing.get(listingId),
        db.auth.me(),
      ]);
      setListing(data);
      setUser(me);

      const saved = await db.entities.SavedListing.filter({
        user_email: me.email,
        listing_id: listingId,
      });
      setIsSaved(saved.length > 0);

      // Check friendship status with seller
      if (me.email !== data.seller_email) {
        const [sent, received] = await Promise.all([
          db.entities.Friendship.filter({ requester_email: me.email, receiver_email: data.seller_email }),
          db.entities.Friendship.filter({ requester_email: data.seller_email, receiver_email: me.email }),
        ]);
        const all = [...sent, ...received];
        if (all.find(f => f.status === 'accepted')) setFriendStatus('accepted');
        else if (all.length > 0) setFriendStatus('pending');
        else setFriendStatus(null);
      }

      // Track view
      await db.entities.UserInterest.create({
        user_email: me.email,
        type: 'view',
        keyword: data.title,
        category: data.category,
        listing_id: listingId,
      });

      setLoading(false);
    };
    load();
  }, [listingId]);

  const toggleSave = async () => {
    if (!user) return;
    if (isSaved) {
      const saved = await db.entities.SavedListing.filter({
        user_email: user.email,
        listing_id: listingId,
      });
      if (saved.length > 0) await db.entities.SavedListing.delete(saved[0].id);
      setIsSaved(false);
    } else {
      await db.entities.SavedListing.create({
        user_email: user.email,
        listing_id: listingId,
        saved_price: listing.price,
      });
      setIsSaved(true);
    }
  };

  const sendOffer = async () => {
    if (!offerAmount || isNaN(offerAmount)) return;
    setOfferSending(true);

    const offerValue = parseFloat(offerAmount);
    const minAcceptable = listing.price * 0.5;

    if (offerValue < minAcceptable) {
      // Auto-decline: send a message back to the buyer
      await db.entities.Message.create({
        listing_id: listingId,
        listing_title: listing.title,
        sender_email: listing.seller_email,
        sender_name: listing.seller_name,
        receiver_email: user.email,
        content: `Sorry, your offer of ${formatPrice(offerValue, listing.currency)} for "${listing.title}" is too low and has been automatically declined. The asking price is ${formatPrice(listing.price, listing.currency)}.`,
      });
      setOfferSending(false);
      setOfferOpen(false);
      setOfferAmount('');
      toast.error(`Offer declined: ${formatPrice(offerValue, listing.currency)} is below the minimum accepted price. Check your messages for details.`, {
        duration: 5000,
      });
      return;
    }

    await db.entities.Message.create({
      listing_id: listingId,
      listing_title: listing.title,
      sender_email: user.email,
      sender_name: user.full_name,
      receiver_email: listing.seller_email,
      content: `Hi! I'd like to make an offer of ${formatPrice(offerValue, listing.currency)} for your listing "${listing.title}".`,
    });
    setOfferSending(false);
    setOfferOpen(false);
    setOfferAmount('');
    toast.success('Offer sent!');
  };

  const handleContact = () => setChatOpen(true);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!listing) return null;

  const images = listing.images?.length ? listing.images : placeholderImages;

  return (
    <div className="pb-28">
      {/* Image Gallery */}
      <div className="relative aspect-square bg-muted">
        <img
          src={images[currentImage]}
          alt={listing.title}
          className="w-full h-full object-cover"
        />

        {/* Nav overlay */}
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full bg-black/30 backdrop-blur-md flex items-center justify-center text-white"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex gap-2">
            <button
              onClick={toggleSave}
              className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-md",
                isSaved ? "bg-primary text-white" : "bg-black/30 text-white"
              )}
            >
              <Heart className={cn("w-5 h-5", isSaved && "fill-current")} />
            </button>
            <button className="w-10 h-10 rounded-full bg-black/30 backdrop-blur-md flex items-center justify-center text-white">
              <Share2 className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Image dots */}
        {images.length > 1 && (
          <>
            <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-1.5">
              {images.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentImage(idx)}
                  className={cn(
                    "w-2 h-2 rounded-full transition-all",
                    idx === currentImage ? "bg-white w-5" : "bg-white/50"
                  )}
                />
              ))}
            </div>
            {currentImage > 0 && (
              <button onClick={() => setCurrentImage(i => i - 1)} className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/20 backdrop-blur flex items-center justify-center text-white">
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}
            {currentImage < images.length - 1 && (
              <button onClick={() => setCurrentImage(i => i + 1)} className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/20 backdrop-blur flex items-center justify-center text-white">
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </>
        )}
      </div>

      {/* Content */}
      <div className="px-4 pt-5 space-y-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="secondary" className="rounded-full text-xs font-medium">
              {listing.category}
            </Badge>
            <Badge variant="outline" className="rounded-full text-xs">
              {listing.condition}
            </Badge>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight mt-2">{listing.title}</h1>
          <p className="text-3xl font-extrabold text-primary mt-1">
            {formatPrice(listing.price, listing.currency)}
          </p>
        </div>

        {/* Meta */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          {listing.location_name && (
            <div className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" />
              <span>{listing.location_name}</span>
            </div>
          )}
          <div className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            <span>{moment(listing.created_date).fromNow()}</span>
          </div>
        </div>

        {/* Description */}
        <div className="bg-secondary/50 rounded-2xl p-4">
          <h3 className="font-semibold text-sm mb-2">Description</h3>
          <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">
            {listing.description || 'No description provided.'}
          </p>
        </div>

        {/* Seller */}
        <div className="p-4 bg-card border border-border rounded-2xl space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-primary font-bold text-lg">
                {listing.seller_name?.charAt(0)?.toUpperCase() || '?'}
              </span>
            </div>
            <div className="flex-1">
              <p className="font-semibold text-sm">{listing.seller_name || 'Seller'}</p>
              <p className="text-xs text-muted-foreground">Member since {moment(listing.created_date).format('MMM YYYY')}</p>
            </div>
            {user && user.email !== listing.seller_email && (
              friendStatus === 'accepted' ? (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary text-muted-foreground text-xs font-semibold">
                  <UserCheck className="w-3.5 h-3.5" />
                  Friends
                </div>
              ) : friendStatus === 'pending' ? (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary text-muted-foreground text-xs font-semibold">
                  <Clock className="w-3.5 h-3.5" />
                  Pending
                </div>
              ) : (
                <button
                  onClick={async () => {
                    await db.entities.Friendship.create({
                      requester_email: user.email,
                      requester_name: user.full_name,
                      receiver_email: listing.seller_email,
                      receiver_name: listing.seller_name,
                      status: 'pending',
                    });
                    setFriendStatus('pending');
                    toast.success('Friend request sent!');
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 hover:bg-primary/20 text-primary text-xs font-semibold transition-colors"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  Add Friend
                </button>
              )
            )}
          </div>
          <UserRating
            userEmail={listing.seller_email}
            role="seller"
            currentUserEmail={user?.email}
            listingId={listingId}
            requireMessaged={true}
          />
        </div>
      </div>

      {/* Fixed Bottom CTA */}
      {user && listing.seller_email === user?.email && (
    <div className="fixed bottom-16 left-0 right-0 p-4 bg-background/95 backdrop-blur-lg border-t border-border">
      <div className="max-w-lg mx-auto flex gap-3">
        <Button
          variant="outline"
          className="rounded-full h-12 flex-1"
          onClick={() => navigate(`/listing/${listing.id}/edit`)}
        >
          Edit Listing
        </Button>
        <Button
          className={`rounded-full h-12 flex-1 font-semibold ${
            listing.status === 'sold'
              ? 'bg-green-600 hover:bg-green-700'
              : 'bg-muted text-foreground hover:bg-green-100'
          }`}
          onClick={async () => {
            const newStatus = listing.status === 'sold' ? 'active' : 'sold';
            await db.entities.Listing.update(listing.id, { status: newStatus });
            setListing(prev => ({ ...prev, status: newStatus }));
          }}
        >
          <CheckCircle2 className="w-4 h-4 mr-2" />
          {listing.status === 'sold' ? 'Mark as Active' : 'Mark as Sold'}
        </Button>
      </div>
    </div>
  )}
  {(!user || listing.seller_email !== user?.email) && (
    <>
      <div className="fixed bottom-16 left-0 right-0 p-4 bg-background/95 backdrop-blur-lg border-t border-border">
        <div className="max-w-lg mx-auto flex gap-2">
          <Button
            variant="outline"
            className="rounded-full h-12 flex-1 font-semibold"
            onClick={() => setOfferOpen(true)}
          >
            <Tag className="w-4 h-4 mr-2" />
            Send Offer
          </Button>
          <Button
            className="rounded-full h-12 flex-1 font-semibold"
            onClick={handleContact}
          >
            <MessageCircle className="w-4 h-4 mr-2" />
            Message
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="rounded-full h-12 w-12 flex-shrink-0"
            onClick={() => setShareOpen(true)}
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <SendToFriendSheet open={shareOpen} onOpenChange={setShareOpen} listing={listing} />

      <Dialog open={offerOpen} onOpenChange={setOfferOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Send an Offer</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Listed at <span className="font-semibold text-foreground">{formatPrice(listing.price, listing.currency)}</span></p>
          <div className="relative mt-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold">$</span>
            <Input
              type="number"
              value={offerAmount}
              onChange={(e) => setOfferAmount(e.target.value)}
              placeholder="Your offer"
              className="pl-7 h-11 rounded-xl"
              autoFocus
            />
          </div>
          <DialogFooter className="mt-2">
            <Button variant="outline" className="rounded-full" onClick={() => setOfferOpen(false)}>Cancel</Button>
            <Button className="rounded-full" onClick={sendOffer} disabled={offerSending || !offerAmount}>
              {offerSending ? 'Sending...' : 'Send Offer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )}
      <ChatSheet
        open={chatOpen}
        onOpenChange={setChatOpen}
        listing={listing}
        currentUser={user}
      />
    </div>
  );
}
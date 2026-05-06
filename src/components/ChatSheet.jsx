const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import { useState, useEffect, useRef } from 'react';
import { Send, MessageCircle, MapPin, Tag, ChevronDown } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import moment from 'moment';
import UserRating from './UserRating';

const QUICK_REPLIES = [
  { label: '💰 Offer price', text: "Would you accept a lower price? I'm interested!" },
  { label: '📍 Meetup?', text: "Where would you like to meet up for the exchange?" },
  { label: '🕐 Still available?', text: "Is this item still available?" },
  { label: '📦 Condition?', text: "Can you tell me more about the condition of the item?" },
];

export default function ChatSheet({ open, onOpenChange, listing, currentUser }) {
  const [messages, setMessages] = useState([]);
  const [newMsg, setNewMsg] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef(null);
  const pollRef = useRef(null);

  const [buyerEmail, setBuyerEmail] = useState(null);

  const otherParty = listing?.seller_email;
  const otherName = listing?.seller_name || 'Seller';

  const fetchMessages = async () => {
    if (!listing || !currentUser) return;
    const [sent, received] = await Promise.all([
      db.entities.Message.filter({ sender_email: currentUser.email, listing_id: listing.id }),
      db.entities.Message.filter({ receiver_email: currentUser.email, listing_id: listing.id }),
    ]);
    const all = [...sent, ...received].sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
    setMessages(all);
    setLoading(false);

    // Identify buyer email for seller view
    if (currentUser?.email === listing?.seller_email && all.length > 0) {
      const buyer = all.find(m => m.sender_email !== listing.seller_email);
      if (buyer) setBuyerEmail(buyer.sender_email);
    }

    // Mark received as read
    received.filter(m => !m.read).forEach(m =>
      db.entities.Message.update(m.id, { read: true })
    );
  };

  useEffect(() => {
    if (!open) {
      clearInterval(pollRef.current);
      return;
    }
    setLoading(true);
    fetchMessages();
    pollRef.current = setInterval(fetchMessages, 4000);
    return () => clearInterval(pollRef.current);
  }, [open, listing?.id]);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  const sendMessage = async (text) => {
    const content = (text || newMsg).trim();
    if (!content || !listing || !currentUser) return;
    setSending(true);
    setNewMsg('');
    const msg = await db.entities.Message.create({
      listing_id: listing.id,
      listing_title: listing.title,
      sender_email: currentUser.email,
      sender_name: currentUser.full_name,
      receiver_email: otherParty,
      content,
      read: false,
    });
    setMessages(prev => [...prev, msg]);
    setSending(false);
  };

  const isSeller = currentUser?.email === listing?.seller_email;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl h-[85vh] flex flex-col p-0">
        {/* Header */}
        <SheetHeader className="px-4 pt-4 pb-3 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-primary font-bold text-base">
                {otherName.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <SheetTitle className="text-base text-left">{isSeller ? 'Buyer' : otherName}</SheetTitle>
              <p className="text-xs text-primary font-medium truncate">{listing?.title}</p>
            </div>
            {listing?.price && (
              <div className="text-right">
                <p className="font-bold text-primary text-sm">${listing.price?.toLocaleString()}</p>
                <p className="text-[10px] text-muted-foreground">{listing.currency || 'USD'}</p>
              </div>
            )}
          </div>
          {/* Seller sees buyer rating + can rate buyer after messaging */}
          {isSeller && buyerEmail && (
            <div className="mt-2 pt-2 border-t border-border/50 flex items-center justify-between">
              <UserRating
                userEmail={buyerEmail}
                role="buyer"
                currentUserEmail={currentUser?.email}
                requireMessaged={true}
              />
            </div>
          )}
          {/* Buyer can rate seller after messaging */}
          {!isSeller && messages.length > 0 && (
            <div className="mt-2 pt-2 border-t border-border/50">
              <UserRating
                userEmail={listing?.seller_email}
                role="seller"
                currentUserEmail={currentUser?.email}
                listingId={listing?.id}
                requireMessaged={true}
              />
            </div>
          )}
        </SheetHeader>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center gap-2 pb-4">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                <MessageCircle className="w-6 h-6 text-primary" />
              </div>
              <p className="font-semibold text-sm">Start the conversation</p>
              <p className="text-xs text-muted-foreground">Ask about the item, negotiate a price, or arrange a meetup</p>
            </div>
          ) : (
            messages.map((msg, idx) => {
              const isMe = msg.sender_email === currentUser?.email;
              const showDate = idx === 0 || moment(msg.created_date).diff(moment(messages[idx - 1].created_date), 'minutes') > 10;
              return (
                <div key={msg.id || idx}>
                  {showDate && (
                    <p className="text-center text-[10px] text-muted-foreground my-2">
                      {moment(msg.created_date).calendar()}
                    </p>
                  )}
                  <div className={cn("flex", isMe ? "justify-end" : "justify-start")}>
                    <div className={cn(
                      "max-w-[78%] rounded-2xl px-3.5 py-2.5",
                      isMe
                        ? "bg-primary text-primary-foreground rounded-br-sm"
                        : "bg-secondary rounded-bl-sm"
                    )}>
                      <p className="text-sm leading-relaxed">{msg.content}</p>
                      <p className={cn("text-[10px] mt-1", isMe ? "text-primary-foreground/60 text-right" : "text-muted-foreground")}>
                        {moment(msg.created_date).format('h:mm A')}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>

        {/* Quick replies — only show if no messages yet or last message was from other party */}
        {!isSeller && (messages.length === 0 || messages[messages.length - 1]?.sender_email !== currentUser?.email) && (
          <div className="flex gap-2 px-4 pb-2 overflow-x-auto flex-shrink-0">
            {QUICK_REPLIES.map((qr) => (
              <button
                key={qr.label}
                onClick={() => sendMessage(qr.text)}
                className="whitespace-nowrap text-xs px-3 py-1.5 rounded-full bg-secondary hover:bg-primary/10 hover:text-primary transition-colors border border-border flex-shrink-0"
              >
                {qr.label}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div className="flex-shrink-0 px-4 pb-6 pt-2 border-t border-border bg-background">
          <div className="flex items-center gap-2">
            <Input
              value={newMsg}
              onChange={(e) => setNewMsg(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
              placeholder="Type a message..."
              className="rounded-full h-11 flex-1"
            />
            <button
              onClick={() => sendMessage()}
              disabled={!newMsg.trim() || sending}
              className={cn(
                "w-11 h-11 rounded-full flex items-center justify-center transition-colors flex-shrink-0",
                newMsg.trim() ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              )}
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
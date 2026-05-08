import { db } from '@/api/base44client';
import { useState, useEffect, useRef } from 'react';
import { Send } from 'lucide-react';
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
  const [buyerEmail, setBuyerEmail] = useState(null);
  const bottomRef = useRef(null);
  const pollRef = useRef(null);
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
    if (currentUser?.email === listing?.seller_email && all.length > 0) {
      const buyer = all.find(m => m.sender_email !== listing.seller_email);
      if (buyer) setBuyerEmail(buyer.sender_email);
    }
    received.filter(m => !m.read).forEach(m => db.entities.Message.update(m.id, { read: true }));
  };

  useEffect(() => {
    if (!open) { clearInterval(pollRef.current); return; }
    setLoading(true);
    fetchMessages();
    pollRef.current = setInterval(fetchMessages, 4000);
    return () => clearInterval(pollRef.current);
  }, [open, listing?.id]);

  useEffect(() => { if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, open]);

  const sendMessage = async (text) => {
    const content = (text || newMsg).trim();
    if (!content || !listing || !currentUser) return;
    setSending(true);
    setNewMsg('');
    const msg = await db.entities.Message.create({ listing_id: listing.id, listing_title: listing.title, sender_email: currentUser.email, sender_name: currentUser.full_name, receiver_email: otherParty, content, read: false });
    setMessages(prev => [...prev, msg]);
    setSending(false);
  };

  const isSeller = currentUser?.email === listing?.seller_email;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl h-[85vh] flex flex-col p-0">
        <SheetHeader className="px-4 pt-4 pb-3 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-primary font-bold text-base">{otherName.charAt(0).toUpperCase()}</span>
            </div>
            <div className="flex-1 min-w-0">
              <SheetTitle className="text-base text-left">{isSeller ? 'Buyer' : otherName}</SheetTitle>
              <p className="text-xs text-primary font-medium truncate">{listing?.title}</p>
            </div>
            {listing?.price && <p className="font-bold text-primary text-sm">${listing.price?.toLocaleString()}</p>}
          </div>
          {isSeller && buyerEmail && <UserRating userEmail={buyerEmail} role="buyer" currentUserEmail={currentUser?.email} requireMessaged={true} />}
          {!isSeller && messages.length > 0 && <UserRating userEmail={listing?.seller_email} role="seller" currentUserEmail={currentUser?.email} requireMessaged={true} />}
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {loading ? <div className="flex justify-center py-8"><div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div> :
            messages.map(msg => (
              <div key={msg.id} className={cn('flex', msg.sender_email === currentUser.email ? 'justify-end' : 'justify-start')}>
                <div className={cn('max-w-[75%] px-4 py-2 rounded-2xl text-sm', msg.sender_email === currentUser.email ? 'bg-primary text-primary-foreground rounded-br-sm' : 'bg-secondary text-foreground rounded-bl-sm')}>
                  <p>{msg.content}</p>
                  <p className="text-[10px] mt-1 opacity-60">{moment(msg.created_date).format('HH:mm')}</p>
                </div>
              </div>
            ))
          }
          <div ref={bottomRef} />
        </div>
        <div className="flex gap-2 overflow-x-auto px-4 pb-2 flex-shrink-0">
          {QUICK_REPLIES.map(q => (
            <button key={q.label} onClick={() => sendMessage(q.text)} className="flex-shrink-0 text-xs bg-secondary text-foreground px-3 py-1.5 rounded-full whitespace-nowrap hover:bg-secondary/80">{q.label}</button>
          ))}
        </div>
        <div className="border-t border-border px-4 py-3 flex items-center gap-2 flex-shrink-0">
          <Input value={newMsg} onChange={e => setNewMsg(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMessage()} placeholder="Type a message..." className="rounded-full bg-secondary border-0" />
          <button onClick={() => sendMessage()} disabled={!newMsg.trim() || sending} className="w-10 h-10 rounded-full bg-primary flex items-center justify-center flex-shrink-0 disabled:opacity-50">
            <Send className="w-4 h-4 text-primary-foreground" />
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

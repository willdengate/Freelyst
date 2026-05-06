const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import { useState, useEffect } from 'react';

import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Send, Users } from 'lucide-react';
import { toast } from 'sonner';

export default function SendToFriendSheet({ open, onOpenChange, listing }) {
  const [user, setUser] = useState(null);
  const [friends, setFriends] = useState([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(null);

  useEffect(() => {
    if (!open) return;
    const load = async () => {
      setLoading(true);
      const me = await db.auth.me();
      setUser(me);
      const [sent, received] = await Promise.all([
        db.entities.Friendship.filter({ requester_email: me.email, status: 'accepted' }),
        db.entities.Friendship.filter({ receiver_email: me.email, status: 'accepted' }),
      ]);
      setFriends([
        ...sent.map(f => ({ name: f.receiver_name, email: f.receiver_email })),
        ...received.map(f => ({ name: f.requester_name, email: f.requester_email })),
      ]);
      setLoading(false);
    };
    load();
  }, [open]);

  const sendToFriend = async (friend) => {
    setSending(friend.email);
    await db.entities.ListingShare.create({
      sender_email: user.email,
      sender_name: user.full_name,
      receiver_email: friend.email,
      listing_id: listing.id,
      listing_title: listing.title,
      listing_price: listing.price,
      listing_currency: listing.currency,
      listing_image: listing.images?.[0] || null,
      message: message.trim() || null,
      read: false,
    });
    toast.success(`Sent to ${friend.name}!`);
    setSending(null);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl max-h-[75vh]">
        <SheetHeader>
          <SheetTitle>Send to a Friend</SheetTitle>
        </SheetHeader>

        <div className="py-4 space-y-4">
          <Input
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder="Add a message (optional)..."
            className="rounded-xl"
          />

          {loading ? (
            <div className="flex justify-center py-8">
              <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : friends.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <Users className="w-10 h-10 text-muted-foreground/30 mb-3" />
              <p className="font-semibold text-sm">No friends yet</p>
              <p className="text-xs text-muted-foreground mt-1">Add friends from the Friends tab first</p>
            </div>
          ) : (
            <div className="space-y-2 overflow-y-auto max-h-72">
              {friends.map(f => (
                <div key={f.email} className="flex items-center gap-3 p-3 bg-secondary/50 rounded-2xl">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-primary font-bold">{f.name?.charAt(0)?.toUpperCase() || '?'}</span>
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-sm">{f.name}</p>
                    <p className="text-xs text-muted-foreground">{f.email}</p>
                  </div>
                  <Button
                    size="sm"
                    className="rounded-full h-8 px-3"
                    disabled={sending === f.email}
                    onClick={() => sendToFriend(f)}
                  >
                    <Send className="w-3.5 h-3.5 mr-1" />
                    {sending === f.email ? '...' : 'Send'}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
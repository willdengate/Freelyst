import { db } from '@/api/base44client';
import { useState, useEffect, useRef } from 'react';
import { Bell, MessageCircle, Tag, Heart, X, Users, TrendingDown, UserPlus, Check } from 'lucide-react';
import { formatPrice } from '@/lib/currencies';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import moment from 'moment';
import { toast } from 'sonner';

export default function NotificationsPanel() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [hasUnread, setHasUnread] = useState(false);
  const panelRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    db.auth.me().then(me => {
      if (!me) return;
      setUser(me);
      Promise.all([
        db.entities.Message.filter({ receiver_email: me.email, read: false }),
        db.entities.Friendship.filter({ receiver_email: me.email, status: 'pending' }),
      ]).then(([msgs, reqs]) => setHasUnread(msgs.length > 0 || reqs.length > 0));
    });
  }, []);

  useEffect(() => {
    if (!open || !user) return;
    const load = async () => {
      setLoading(true);
      const notifs = [];
      const friendRequests = await db.entities.Friendship.filter({ receiver_email: user.email, status: 'pending' });
      for (const req of friendRequests) {
        notifs.push({ id: `friend-req-${req.id}`, type: 'friend_request', title: `${req.requester_name || 'Someone'} sent you a friend request`, time: req.created_date, reqId: req.id, requesterName: req.requester_name, action: () => navigate('/friends') });
      }
      const messages = await db.entities.Message.filter({ receiver_email: user.email, read: false });
      for (const msg of messages) {
        const isOffer = msg.content?.startsWith("Hi! I'd like to make an offer");
        notifs.push({ id: `msg-${msg.id}`, type: isOffer ? 'offer' : 'message', title: isOffer ? `New offer on "${msg.listing_title}"` : `New message from ${msg.sender_name || 'someone'}`, subtitle: msg.content?.slice(0, 60), time: msg.created_date, action: () => navigate(`/messages?listing=${msg.listing_id}&seller=${msg.sender_email}`), msgId: msg.id });
      }
      notifs.sort((a, b) => new Date(b.time) - new Date(a.time));
      setNotifications(notifs);
      setLoading(false);
    };
    load();
  }, [open, user]);

  useEffect(() => {
    const handler = (e) => { if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const acceptFriend = async (reqId, requesterName) => {
    await db.entities.Friendship.update(reqId, { status: 'accepted' });
    setNotifications(prev => prev.filter(n => n.reqId !== reqId));
    toast.success(`You are now friends with ${requesterName}!`);
  };

  const markMessageRead = async (msgId) => {
    await db.entities.Message.update(msgId, { read: true });
  };

  const icons = { message: MessageCircle, offer: Tag, friend_request: UserPlus, friend_listing: Users, saved: Heart, price_drop: TrendingDown };

  return (
    <div className="relative" ref={panelRef}>
      <button onClick={() => setOpen(o => !o)} className="relative w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
        <Bell className="w-5 h-5" />
        {hasUnread && <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-primary rounded-full border-2 border-background" />}
      </button>
      {open && (
        <div className="absolute right-0 top-12 w-80 bg-card border border-border rounded-2xl shadow-xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <h3 className="font-bold text-sm">Notifications</h3>
            <button onClick={() => setOpen(false)}><X className="w-4 h-4 text-muted-foreground" /></button>
          </div>
          <div className="max-h-96 overflow-y-auto divide-y divide-border">
            {loading ? <div className="flex justify-center py-8"><div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
              : notifications.length === 0 ? <div className="py-8 text-center text-sm text-muted-foreground">No new notifications</div>
              : notifications.map(n => {
                  const Icon = icons[n.type] || Bell;
                  return (
                    <div key={n.id} className="px-4 py-3 hover:bg-secondary/50 cursor-pointer" onClick={() => { n.action(); if (n.msgId) markMessageRead(n.msgId); setOpen(false); }}>
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Icon className="w-4 h-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium line-clamp-2">{n.title}</p>
                          {n.subtitle && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{n.subtitle}</p>}
                          <p className="text-[10px] text-muted-foreground mt-1">{moment(n.time).fromNow()}</p>
                          {n.type === 'friend_request' && (
                            <button onClick={e => { e.stopPropagation(); acceptFriend(n.reqId, n.requesterName); }} className="mt-2 flex items-center gap-1 text-xs text-primary font-semibold">
                              <Check className="w-3 h-3" /> Accept
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
            }
          </div>
        </div>
      )}
    </div>
  );
}

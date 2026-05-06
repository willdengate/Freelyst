const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

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
      setUser(me);
      // Check for unread messages or pending friend requests on mount
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

      // Pending friend requests
      const friendRequests = await db.entities.Friendship.filter({ receiver_email: user.email, status: 'pending' });
      for (const req of friendRequests) {
        notifs.push({
          id: `friend-req-${req.id}`,
          type: 'friend_request',
          title: `${req.requester_name || 'Someone'} sent you a friend request`,
          subtitle: null,
          time: req.created_date,
          reqId: req.id,
          requesterName: req.requester_name,
          action: () => navigate('/friends'),
        });
      }

      // Unread messages & offers
      const messages = await db.entities.Message.filter({ receiver_email: user.email, read: false });
      for (const msg of messages) {
        const isOffer = msg.content?.startsWith("Hi! I'd like to make an offer");
        notifs.push({
          id: `msg-${msg.id}`,
          type: isOffer ? 'offer' : 'message',
          title: isOffer ? `New offer on "${msg.listing_title}"` : `New message from ${msg.sender_name || 'someone'}`,
          subtitle: isOffer ? msg.content.slice(0, 60) + '...' : msg.content?.slice(0, 60),
          time: msg.created_date,
          action: () => navigate(`/messages?listing=${msg.listing_id}&seller=${msg.sender_email}`),
          msgId: msg.id,
        });
      }

      // Friend new listing notifications
      const [sentFriends, receivedFriends] = await Promise.all([
        db.entities.Friendship.filter({ requester_email: user.email, status: 'accepted' }),
        db.entities.Friendship.filter({ receiver_email: user.email, status: 'accepted' }),
      ]);
      const friendEmails = [
        ...sentFriends.map(f => f.receiver_email),
        ...receivedFriends.map(f => f.requester_email),
      ];
      if (friendEmails.length > 0) {
        const recentListings = await db.entities.Listing.list('-created_date', 50);
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        recentListings
          .filter(l => friendEmails.includes(l.seller_email) && l.status === 'active' && new Date(l.created_date) > oneDayAgo)
          .forEach(listing => {
            notifs.push({
              id: `friend-listing-${listing.id}`,
              type: 'friend_listing',
              title: `${listing.seller_name} posted a new listing`,
              subtitle: listing.title,
              time: listing.created_date,
              action: () => navigate(`/listing/${listing.id}`),
            });
          });
      }

      // Updates on saved listings (sold/price drop)
      const saved = await db.entities.SavedListing.filter({ user_email: user.email });
      if (saved.length > 0) {
        const listings = await Promise.all(
          saved.map(s => db.entities.Listing.get(s.listing_id).catch(() => null))
        );
        for (let i = 0; i < listings.length; i++) {
          const listing = listings[i];
          if (!listing) continue;
          if (listing.status === 'sold') {
            notifs.push({
              id: `sold-${listing.id}`,
              type: 'saved',
              title: `"${listing.title}" has been sold`,
              subtitle: 'A saved item is no longer available',
              time: listing.updated_date,
              action: () => navigate(`/listing/${listing.id}`),
            });
          } else if (saved[i].saved_price && listing.price < saved[i].saved_price) {
            const drop = Math.round(((saved[i].saved_price - listing.price) / saved[i].saved_price) * 100);
            notifs.push({
              id: `pricedrop-${listing.id}`,
              type: 'price_drop',
              title: `Price dropped on "${listing.title}"`,
              subtitle: `Now ${formatPrice(listing.price, listing.currency)} — ${drop}% lower than when you saved it`,
              time: listing.updated_date,
              action: () => navigate(`/listing/${listing.id}`),
            });
          }
        }
      }

      notifs.sort((a, b) => new Date(b.time) - new Date(a.time));
      setNotifications(notifs);
      setLoading(false);

      // Mark all unread messages as read now that the panel is open
      const unreadMsgIds = notifs.filter(n => n.msgId).map(n => n.msgId);
      await Promise.all(unreadMsgIds.map(id => db.entities.Message.update(id, { read: true })));
      setHasUnread(false);
    };
    load();
  }, [open, user]);

  // When panel closes, clear notifications so badge goes away
  useEffect(() => {
    if (!open) setNotifications([]);
  }, [open]);

  // Close on outside click
  useEffect(() => {
    const handle = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false);
    };
    if (open) document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [open]);

  const markMessageRead = async (msgId) => {
    await db.entities.Message.update(msgId, { read: true });
  };

  const handleClick = async (notif) => {
    if (notif.msgId) await markMessageRead(notif.msgId);
    if (notif.type !== 'friend_request') {
      setOpen(false);
      notif.action();
    }
  };

  const acceptFriendRequest = async (reqId, requesterName, e) => {
    e.stopPropagation();
    await db.entities.Friendship.update(reqId, { status: 'accepted' });
    setNotifications(prev => prev.filter(n => n.reqId !== reqId));
    toast.success(`You and ${requesterName} are now friends!`);
  };

  const declineFriendRequest = async (reqId, e) => {
    e.stopPropagation();
    await db.entities.Friendship.update(reqId, { status: 'declined' });
    setNotifications(prev => prev.filter(n => n.reqId !== reqId));
  };

  const unreadCount = notifications.length;

  const iconMap = {
    message: <MessageCircle className="w-4 h-4 text-primary" />,
    offer: <Tag className="w-4 h-4 text-yellow-500" />,
    saved: <Heart className="w-4 h-4 text-rose-500" />,
    friend_listing: <Users className="w-4 h-4 text-green-500" />,
    price_drop: <TrendingDown className="w-4 h-4 text-emerald-500" />,
    friend_request: <UserPlus className="w-4 h-4 text-primary" />,
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center relative"
      >
        <Bell className="w-4 h-4 text-foreground" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-primary rounded-full text-[9px] text-primary-foreground font-bold flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
        {unreadCount === 0 && hasUnread && (
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full" />
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 w-80 bg-card border border-border rounded-2xl shadow-xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <h3 className="font-bold text-sm">Notifications</h3>
            <button onClick={() => setOpen(false)}>
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center px-4">
                <Bell className="w-8 h-8 text-muted-foreground/30 mb-2" />
                <p className="text-sm text-muted-foreground">You're all caught up!</p>
              </div>
            ) : (
              notifications.map(notif => (
                <div
                  key={notif.id}
                  onClick={() => handleClick(notif)}
                  className={cn(
                    "w-full flex items-start gap-3 px-4 py-3 transition-colors text-left border-b border-border/50 last:border-0",
                    notif.type !== 'friend_request' && "hover:bg-secondary/50 cursor-pointer"
                  )}
                >
                  <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0 mt-0.5">
                    {iconMap[notif.type]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium leading-snug">{notif.title}</p>
                    {notif.subtitle && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{notif.subtitle}</p>
                    )}
                    <p className="text-[10px] text-muted-foreground mt-1">{moment(notif.time).fromNow()}</p>
                    {notif.type === 'friend_request' && (
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={(e) => acceptFriendRequest(notif.reqId, notif.requesterName, e)}
                          className="flex items-center gap-1 px-3 py-1 rounded-full bg-primary text-primary-foreground text-xs font-semibold"
                        >
                          <Check className="w-3 h-3" /> Accept
                        </button>
                        <button
                          onClick={(e) => declineFriendRequest(notif.reqId, e)}
                          className="px-3 py-1 rounded-full bg-secondary text-muted-foreground text-xs font-semibold"
                        >
                          Decline
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
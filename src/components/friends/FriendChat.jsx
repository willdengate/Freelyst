const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import { useState, useEffect, useRef } from 'react';

import { Link } from 'react-router-dom';
import { formatPrice } from '@/lib/currencies';
import { Send, MessageCircle, ArrowLeft, ImagePlus, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import moment from 'moment';

// A "general" chat between two friends — uses listing_id = 'direct' as a convention
const DIRECT_LISTING_ID = 'direct';

export default function FriendChat({ user, onRead }) {
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [onlineStatus, setOnlineStatus] = useState({}); // email -> bool
  // selected friend to chat with
  const [activeFriend, setActiveFriend] = useState(null);
  // shared listings received
  const [shares, setShares] = useState([]);
  // direct messages for active friend
  const [messages, setMessages] = useState([]);
  const [newMsg, setNewMsg] = useState('');
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [mediaPreview, setMediaPreview] = useState(null); // { url, type, file }
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  // Update own last_seen every 30s
  useEffect(() => {
    const update = () => db.auth.updateMe({ last_seen: new Date().toISOString() });
    update();
    const interval = setInterval(update, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [sent, received, receivedShares, sentShares] = await Promise.all([
        db.entities.Friendship.filter({ requester_email: user.email, status: 'accepted' }),
        db.entities.Friendship.filter({ receiver_email: user.email, status: 'accepted' }),
        db.entities.ListingShare.filter({ receiver_email: user.email }, '-created_date', 50),
        db.entities.ListingShare.filter({ sender_email: user.email }, '-created_date', 50),
      ]);
      const friendList = [
        ...sent.map(f => ({ name: f.receiver_name, email: f.receiver_email })),
        ...received.map(f => ({ name: f.requester_name, email: f.requester_email })),
      ];
      setFriends(friendList);

      // Fetch last_seen for all friends
      if (friendList.length > 0) {
        const allUsers = await db.entities.User.list();
        const twoMinsAgo = new Date(Date.now() - 2 * 60 * 1000);
        const status = {};
        friendList.forEach(f => {
          const u = allUsers.find(u => u.email === f.email);
          status[f.email] = u?.last_seen ? new Date(u.last_seen) > twoMinsAgo : false;
        });
        setOnlineStatus(status);
      }
      const sharesData = [...receivedShares, ...sentShares];
      setShares(sharesData);
      // Mark unread shares as read
      const unread = receivedShares.filter(s => !s.read);
      await Promise.all(unread.map(s => db.entities.ListingShare.update(s.id, { read: true })));
      if (unread.length > 0) onRead?.();
      setLoading(false);
    };
    load();
  }, [user]);

  // Load direct messages when a friend is selected + real-time subscription
  useEffect(() => {
    if (!activeFriend) return;
    const load = async () => {
      setLoadingMessages(true);
      const [sent, received] = await Promise.all([
        db.entities.Message.filter({ sender_email: user.email, receiver_email: activeFriend.email, listing_id: DIRECT_LISTING_ID }),
        db.entities.Message.filter({ sender_email: activeFriend.email, receiver_email: user.email, listing_id: DIRECT_LISTING_ID }),
      ]);
      const all = [...sent, ...received].sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
      setMessages(all);
      received.filter(m => !m.read).forEach(m => db.entities.Message.update(m.id, { read: true }));
      setLoadingMessages(false);
    };
    load();

    // Subscribe to new messages in real-time
    const unsubscribe = db.entities.Message.subscribe((event) => {
      if (event.type === 'create') {
        const msg = event.data;
        const isRelevant =
          (msg.sender_email === user.email && msg.receiver_email === activeFriend.email) ||
          (msg.sender_email === activeFriend.email && msg.receiver_email === user.email);
        if (isRelevant && msg.listing_id === DIRECT_LISTING_ID) {
          setMessages(prev => {
            // avoid duplicates (sender already added optimistically)
            if (prev.find(m => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
          // Mark as read if we're the recipient
          if (msg.receiver_email === user.email && !msg.read) {
            db.entities.Message.update(msg.id, { read: true });
          }
        }
      }
    });

    return () => unsubscribe();
  }, [activeFriend]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleMediaSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const type = file.type.startsWith('video/') ? 'video' : 'image';
    const url = URL.createObjectURL(file);
    setMediaPreview({ url, type, file });
    e.target.value = '';
  };

  const sendMessage = async () => {
    if (!newMsg.trim() && !mediaPreview) return;
    if (!activeFriend) return;

    let media_url = null;
    let media_type = null;

    if (mediaPreview) {
      setUploadingMedia(true);
      const { file_url } = await db.integrations.Core.UploadFile({ file: mediaPreview.file });
      media_url = file_url;
      media_type = mediaPreview.type;
      setMediaPreview(null);
      setUploadingMedia(false);
    }

    const msg = await db.entities.Message.create({
      listing_id: DIRECT_LISTING_ID,
      listing_title: 'Direct Message',
      sender_email: user.email,
      sender_name: user.full_name,
      receiver_email: activeFriend.email,
      content: newMsg.trim() || '',
      media_url,
      media_type,
      read: false,
    });
    setMessages(prev => [...prev, msg]);
    setNewMsg('');
  };

  if (loading) {
    return <div className="flex justify-center py-12"><div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  // — Chat view with active friend —
  if (activeFriend) {
    // Build a unified timeline: messages + shares from both sides with this friend
    const friendShares = shares.filter(
      s => s.sender_email === activeFriend.email || s.receiver_email === activeFriend.email
    );
    const timeline = [
      ...messages.map(m => ({ ...m, _type: 'message', _time: new Date(m.created_date) })),
      ...friendShares.map(s => ({ ...s, _type: 'share', _time: new Date(s.created_date) })),
    ].sort((a, b) => a._time - b._time);

    return (
      <div className="flex flex-col h-[calc(100vh-200px)]">
        {/* Header */}
        <div className="flex items-center gap-3 pb-3 border-b border-border mb-3">
          <button
            onClick={() => setActiveFriend(null)}
            className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="relative">
            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <span className="text-primary font-bold">{activeFriend.name?.charAt(0)?.toUpperCase() || '?'}</span>
            </div>
            <span className={cn(
              "absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-background",
              onlineStatus[activeFriend.email] ? "bg-green-500" : "bg-gray-300"
            )} />
          </div>
          <div>
            <p className="font-semibold text-sm">{activeFriend.name}</p>
            <p className="text-[10px] text-muted-foreground">{onlineStatus[activeFriend.email] ? 'Online' : 'Offline'}</p>
          </div>
        </div>

        {/* Unified timeline */}
        <div className="flex-1 overflow-y-auto space-y-2 pb-2">
          {loadingMessages ? (
            <div className="flex justify-center py-8"><div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
          ) : timeline.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-8">
              <MessageCircle className="w-10 h-10 text-muted-foreground/30 mb-3" />
              <p className="font-semibold text-sm">Start chatting</p>
              <p className="text-xs text-muted-foreground mt-1">Send a message to {activeFriend.name}</p>
            </div>
          ) : (
            timeline.map((item, idx) => {
              if (item._type === 'share') {
                const isMe = item.sender_email === user.email;
                return (
                  <div key={`share-${item.id}`} className={cn("flex", isMe ? "justify-end" : "justify-start")}>
                    <div className="max-w-[80%]">
                      <p className="text-[10px] text-muted-foreground mb-1 px-1">{isMe ? 'You shared' : `${activeFriend.name} shared`}</p>
                      <Link
                        to={`/listing/${item.listing_id}`}
                        className="flex gap-3 p-3 bg-card border border-border rounded-2xl hover:shadow-md transition-shadow"
                      >
                        <div className="w-14 h-14 rounded-xl overflow-hidden bg-muted flex-shrink-0">
                          {item.listing_image
                            ? <img src={item.listing_image} alt={item.listing_title} className="w-full h-full object-cover" />
                            : <div className="w-full h-full flex items-center justify-center text-xl">📦</div>
                          }
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm line-clamp-1">{item.listing_title}</p>
                          {item.listing_price && (
                            <p className="font-bold text-primary text-sm">{formatPrice(item.listing_price, item.listing_currency)}</p>
                          )}
                          {item.message && (
                            <p className="text-xs text-muted-foreground italic line-clamp-1">"{item.message}"</p>
                          )}
                          <p className="text-[10px] text-muted-foreground">{moment(item.created_date).fromNow()}</p>
                        </div>
                      </Link>
                    </div>
                  </div>
                );
              }
              // Regular message
              const isMe = item.sender_email === user.email;
              return (
                <div key={`msg-${item.id || idx}`} className={cn("flex", isMe ? "justify-end" : "justify-start")}>
                  <div className={cn(
                    "max-w-[80%] rounded-2xl overflow-hidden",
                    item.media_url && !item.content ? "" : "px-4 py-2.5",
                    isMe ? "bg-primary text-primary-foreground rounded-br-md" : "bg-secondary rounded-bl-md"
                  )}>
                    {item.media_url && item.media_type === 'image' && (
                      <img src={item.media_url} alt="media" className="max-w-full rounded-xl max-h-64 object-cover" />
                    )}
                    {item.media_url && item.media_type === 'video' && (
                      <video src={item.media_url} controls className="max-w-full rounded-xl max-h-64" />
                    )}
                    {item.content && (
                      <p className={cn("text-sm", item.media_url ? "px-4 pt-2" : "")}>{item.content}</p>
                    )}
                    <p className={cn("text-[10px] mt-1", item.media_url ? "px-4 pb-2" : "", isMe ? "text-primary-foreground/60" : "text-muted-foreground")}>
                      {moment(item.created_date).format('h:mm A')}
                    </p>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Media preview */}
        {mediaPreview && (
          <div className="relative inline-block mb-2 ml-1">
            {mediaPreview.type === 'image' ? (
              <img src={mediaPreview.url} alt="preview" className="h-20 w-20 rounded-xl object-cover border border-border" />
            ) : (
              <video src={mediaPreview.url} className="h-20 w-20 rounded-xl object-cover border border-border" />
            )}
            <button
              onClick={() => setMediaPreview(null)}
              className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-destructive text-white flex items-center justify-center"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Input */}
        <div className="flex items-center gap-2 pt-3 border-t border-border">
          <input ref={fileInputRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleMediaSelect} />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center flex-shrink-0"
          >
            <ImagePlus className="w-4 h-4 text-muted-foreground" />
          </button>
          <Input
            value={newMsg}
            onChange={e => setNewMsg(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendMessage()}
            placeholder={`Message ${activeFriend.name}...`}
            className="rounded-full h-10 flex-1"
          />
          <button
            onClick={sendMessage}
            disabled={(!newMsg.trim() && !mediaPreview) || uploadingMedia}
            className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center transition-colors flex-shrink-0",
              (newMsg.trim() || mediaPreview) && !uploadingMedia ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            )}
          >
            {uploadingMedia ? (
              <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
    );
  }

  // — Friend list view —
  // Build a set of friend emails that have shared something or sent a direct message
  const friendsWithActivity = new Set(shares.map(s => s.sender_email));

  // Also show all shared listings I sent (sender = me)
  const sentShares = shares.filter(s => s.sender_email === user.email);

  return (
    <div className="space-y-4">
      {friends.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <MessageCircle className="w-10 h-10 text-muted-foreground/30 mb-3" />
          <p className="font-semibold">No friends yet</p>
          <p className="text-sm text-muted-foreground mt-1">Add friends to start chatting</p>
        </div>
      ) : (
        <div className="space-y-2">
          {friends.map(f => {
            const friendShares = shares.filter(s => s.sender_email === f.email);
            const hasNew = friendShares.some(s => !s.read);
            return (
              <button
                key={f.email}
                onClick={() => setActiveFriend(f)}
                className="w-full flex items-center gap-3 p-3 bg-card border border-border rounded-2xl hover:bg-secondary/50 transition-colors text-left"
              >
                <div className="relative">
                  <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-primary font-bold">{f.name?.charAt(0)?.toUpperCase() || '?'}</span>
                  </div>
                  {hasNew && <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-primary rounded-full border-2 border-background" />}
                  {!hasNew && (
                    <span className={cn(
                      "absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-background",
                      onlineStatus[f.email] ? "bg-green-500" : "bg-gray-300"
                    )} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">{f.name}</p>
                  {friendShares.length > 0 ? (
                    <p className="text-xs text-muted-foreground truncate">
                      Shared {friendShares.length} listing{friendShares.length !== 1 ? 's' : ''} with you
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">Tap to chat</p>
                  )}
                </div>
                <MessageCircle className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              </button>
            );
          })}
        </div>
      )}

      {/* Listings I've shared with others */}
      {sentShares.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Listings you shared</p>
          <div className="space-y-2">
            {sentShares.map(share => (
              <Link
                key={share.id}
                to={`/listing/${share.listing_id}`}
                className="flex gap-3 p-3 bg-card border border-border rounded-2xl hover:shadow-md transition-shadow"
              >
                <div className="w-14 h-14 rounded-xl overflow-hidden bg-muted flex-shrink-0">
                  {share.listing_image
                    ? <img src={share.listing_image} alt={share.listing_title} className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center text-xl">📦</div>
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">Shared with {share.receiver_email}</p>
                  <p className="font-semibold text-sm line-clamp-1">{share.listing_title}</p>
                  {share.listing_price && (
                    <p className="font-bold text-primary text-sm">{formatPrice(share.listing_price, share.listing_currency)}</p>
                  )}
                  <p className="text-[10px] text-muted-foreground">{moment(share.created_date).fromNow()}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Send, UserPlus, UserCheck, Clock } from 'lucide-react';

import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import moment from 'moment';
import { toast } from 'sonner';

export default function Messages() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [activeConvo, setActiveConvo] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMsg, setNewMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const [friendStatus, setFriendStatus] = useState(null); // null | 'pending' | 'accepted'
  const messagesEndRef = useRef(null);

  const urlParams = new URLSearchParams(window.location.search);
  const listingParam = urlParams.get('listing');
  const sellerParam = urlParams.get('seller');

  useEffect(() => {
    const load = async () => {
      const me = await db.auth.me();
      setUser(me);

      const allMessages = await db.entities.Message.filter(
        { sender_email: me.email },
        '-created_date',
        100
      );
      const receivedMessages = await db.entities.Message.filter(
        { receiver_email: me.email },
        '-created_date',
        100
      );

      const all = [...allMessages, ...receivedMessages].sort(
        (a, b) => new Date(b.created_date) - new Date(a.created_date)
      );

      // Group by conversation (listing + other party)
      const convoMap = {};
      all.forEach(msg => {
        const otherParty = msg.sender_email === me.email ? msg.receiver_email : msg.sender_email;
        const key = `${msg.listing_id}_${otherParty}`;
        if (!convoMap[key]) {
          convoMap[key] = {
            key,
            listing_id: msg.listing_id,
            listing_title: msg.listing_title,
            other_party: otherParty,
            other_name: msg.sender_email === me.email ? 'Seller' : msg.sender_name,
            last_message: msg.content,
            last_date: msg.created_date,
            messages: [],
          };
        }
        convoMap[key].messages.push(msg);
      });

      const convoList = Object.values(convoMap);
      setConversations(convoList);

      // Auto-open if from listing
      if (listingParam && sellerParam) {
        const existing = convoList.find(c => c.listing_id === listingParam && c.other_party === sellerParam);
        if (existing) {
          setActiveConvo(existing);
          setMessages(existing.messages.sort((a, b) => new Date(a.created_date) - new Date(b.created_date)));
        } else {
          const listing = await db.entities.Listing.get(listingParam);
          setActiveConvo({
            key: `${listingParam}_${sellerParam}`,
            listing_id: listingParam,
            listing_title: listing?.title,
            other_party: sellerParam,
            other_name: listing?.seller_name || 'Seller',
            messages: [],
          });
          setMessages([]);
        }
      }

      setLoading(false);
    };
    load();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Check friendship status when active convo changes
  useEffect(() => {
    if (!activeConvo || !user) { setFriendStatus(null); return; }
    const check = async () => {
      const [sent, received] = await Promise.all([
        db.entities.Friendship.filter({ requester_email: user.email, receiver_email: activeConvo.other_party }),
        db.entities.Friendship.filter({ requester_email: activeConvo.other_party, receiver_email: user.email }),
      ]);
      const all = [...sent, ...received];
      if (all.find(f => f.status === 'accepted')) setFriendStatus('accepted');
      else if (all.length > 0) setFriendStatus('pending');
      else setFriendStatus(null);
    };
    check();
  }, [activeConvo, user]);

  const sendFriendRequest = async () => {
    if (!activeConvo || !user) return;
    await db.entities.Friendship.create({
      requester_email: user.email,
      requester_name: user.full_name,
      receiver_email: activeConvo.other_party,
      receiver_name: activeConvo.other_name,
      status: 'pending',
    });
    setFriendStatus('pending');
    toast.success('Friend request sent!');
  };

  const sendMessage = async () => {
    if (!newMsg.trim() || !activeConvo) return;

    const msg = await db.entities.Message.create({
      listing_id: activeConvo.listing_id,
      listing_title: activeConvo.listing_title,
      sender_email: user.email,
      sender_name: user.full_name,
      receiver_email: activeConvo.other_party,
      content: newMsg.trim(),
      read: false,
    });

    setMessages(prev => [...prev, msg]);
    setNewMsg('');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Chat view
  if (activeConvo) {
    return (
      <div className="flex flex-col h-screen">
        <div className="sticky top-0 z-40 bg-background/90 backdrop-blur-xl border-b border-border">
          <div className="flex items-center gap-3 px-4 h-14">
            <button
              onClick={() => setActiveConvo(null)}
              className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm truncate">{activeConvo.other_name}</p>
              <p className="text-xs text-muted-foreground truncate">{activeConvo.listing_title}</p>
            </div>
            {friendStatus === 'accepted' ? (
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
                onClick={sendFriendRequest}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 hover:bg-primary/20 text-primary text-xs font-semibold transition-colors"
              >
                <UserPlus className="w-3.5 h-3.5" />
                Add Friend
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {messages.map((msg, idx) => {
            const isMe = msg.sender_email === user.email;
            return (
              <div key={msg.id || idx} className={cn("flex", isMe ? "justify-end" : "justify-start")}>
                <div className={cn(
                  "max-w-[80%] rounded-2xl px-4 py-2.5",
                  isMe
                    ? "bg-primary text-primary-foreground rounded-br-md"
                    : "bg-secondary rounded-bl-md"
                )}>
                  <p className="text-sm">{msg.content}</p>
                  <p className={cn(
                    "text-[10px] mt-1",
                    isMe ? "text-primary-foreground/60" : "text-muted-foreground"
                  )}>
                    {moment(msg.created_date).format('h:mm A')}
                  </p>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        <div className="sticky bottom-0 bg-background/95 backdrop-blur-lg border-t border-border p-3">
          <div className="flex items-center gap-2 max-w-lg mx-auto">
            <Input
              value={newMsg}
              onChange={(e) => setNewMsg(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="Type a message..."
              className="rounded-full h-10 flex-1"
            />
            <button
              onClick={sendMessage}
              disabled={!newMsg.trim()}
              className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center transition-colors",
                newMsg.trim() ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              )}
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Conversations list
  return (
    <div className="pb-4">
      <div className="sticky top-0 z-40 bg-background/90 backdrop-blur-xl border-b border-border">
        <div className="flex items-center justify-between px-4 h-14">
          <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h1 className="font-bold text-base">Messages</h1>
          <div className="w-9" />
        </div>
      </div>

      {conversations.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center px-4">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <span className="text-2xl">💬</span>
          </div>
          <p className="font-semibold">No messages yet</p>
          <p className="text-sm text-muted-foreground mt-1">Start by messaging a seller on a listing</p>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {conversations.map(convo => (
            <button
              key={convo.key}
              onClick={async () => {
                setActiveConvo(convo);
                const sorted = convo.messages.sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
                setMessages(sorted);
                // Mark unread received messages as read
                sorted.filter(m => m.receiver_email === user?.email && !m.read)
                  .forEach(m => db.entities.Message.update(m.id, { read: true }));
              }}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-secondary/50 transition-colors"
            >
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <span className="text-primary font-bold">
                  {convo.other_name?.charAt(0)?.toUpperCase() || '?'}
                </span>
              </div>
              <div className="flex-1 min-w-0 text-left">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-sm truncate">{convo.other_name}</p>
                  <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                    {convo.messages.some(m => m.receiver_email === user?.email && !m.read) && (
                      <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                    )}
                    <span className="text-[10px] text-muted-foreground">{moment(convo.last_date).fromNow()}</span>
                  </div>
                </div>
                <p className="text-xs text-primary font-medium truncate">{convo.listing_title}</p>
                <p className="text-xs text-muted-foreground truncate mt-0.5">{convo.last_message}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
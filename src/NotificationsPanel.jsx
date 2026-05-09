import { db } from '@/api/base44client';
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
  const [friendStatus, setFriendStatus] = useState(null);
  const messagesEndRef = useRef(null);

  const urlParams = new URLSearchParams(window.location.search);
  const listingParam = urlParams.get('listing');
  const sellerParam = urlParams.get('seller');

  useEffect(() => {
    const load = async () => {
      const me = await db.auth.me();
      if (!me) { navigate('/login'); return; }
      setUser(me);
      const [sentMsgs, receivedMsgs] = await Promise.all([
        db.entities.Message.filter({ sender_email: me.email }),
        db.entities.Message.filter({ receiver_email: me.email }),
      ]);
      const all = [...sentMsgs, ...receivedMsgs].sort((a,b) => new Date(b.created_date)-new Date(a.created_date));
      const convoMap = {};
      all.forEach(msg => {
        const otherParty = msg.sender_email === me.email ? msg.receiver_email : msg.sender_email;
        const key = `${msg.listing_id}_${otherParty}`;
        if (!convoMap[key]) convoMap[key] = { key, listing_id: msg.listing_id, listing_title: msg.listing_title, other_party: otherParty, other_name: msg.sender_email === me.email ? 'Seller' : (msg.sender_name || 'User'), last_message: msg.content, last_date: msg.created_date, messages: [] };
        convoMap[key].messages.push(msg);
      });
      const convoList = Object.values(convoMap);
      setConversations(convoList);
      if (listingParam && sellerParam) {
        const existing = convoList.find(c => c.listing_id === listingParam && c.other_party === sellerParam);
        if (existing) { setActiveConvo(existing); setMessages(existing.messages.sort((a,b) => new Date(a.created_date)-new Date(b.created_date))); }
        else {
          const listing = await db.entities.Listing.get(listingParam);
          setActiveConvo({ key: `${listingParam}_${sellerParam}`, listing_id: listingParam, listing_title: listing?.title, other_party: sellerParam, other_name: listing?.seller_name || 'Seller', messages: [] });
          setMessages([]);
        }
      }
      setLoading(false);
    };
    load();
  }, []);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

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
    await db.entities.Friendship.create({ requester_email: user.email, requester_name: user.full_name || user.email, receiver_email: activeConvo.other_party, receiver_name: activeConvo.other_name, status: 'pending' });
    setFriendStatus('pending');
    toast.success('Friend request sent!');
  };

  const sendMessage = async () => {
    if (!newMsg.trim() || !activeConvo || !user) return;
    const msg = await db.entities.Message.create({ listing_id: activeConvo.listing_id, listing_title: activeConvo.listing_title, sender_email: user.email, sender_name: user.full_name || user.email, receiver_email: activeConvo.other_party, content: newMsg.trim(), read: false });
    setMessages(prev => [...prev, msg]);
    setNewMsg('');
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="flex flex-col h-screen">
      <div className="sticky top-0 z-40 bg-background/90 backdrop-blur-xl border-b border-border">
        <div className="flex items-center gap-3 px-4 h-14">
          {activeConvo
            ? <button onClick={() => { setActiveConvo(null); setMessages([]); }} className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center"><ArrowLeft className="w-4 h-4" /></button>
            : <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center"><ArrowLeft className="w-4 h-4" /></button>
          }
          <h1 className="font-bold text-base">{activeConvo ? activeConvo.other_name : 'Messages'}</h1>
          {activeConvo && friendStatus !== 'accepted' && (
            <button onClick={sendFriendRequest} disabled={friendStatus === 'pending'} className="ml-auto w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
              {friendStatus === 'pending' ? <Clock className="w-4 h-4 text-primary" /> : <UserPlus className="w-4 h-4 text-primary" />}
            </button>
          )}
          {activeConvo && friendStatus === 'accepted' && <UserCheck className="ml-auto w-5 h-5 text-green-500" />}
        </div>
      </div>
      {!activeConvo ? (
        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0
            ? <div className="flex flex-col items-center justify-center py-20 text-center px-4"><p className="font-semibold">No messages yet</p><p className="text-sm text-muted-foreground mt-1">Start a conversation from a listing page</p></div>
            : <div className="divide-y divide-border">
                {conversations.map(c => (
                  <button key={c.key} onClick={() => { setActiveConvo(c); setMessages(c.messages.sort((a,b) => new Date(a.created_date)-new Date(b.created_date))); }} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-secondary/50 transition-colors text-left">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-primary font-bold text-sm">{c.other_name?.[0]?.toUpperCase()}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm">{c.other_name}</p>
                      <p className="text-xs text-muted-foreground truncate">{c.listing_title}</p>
                      <p className="text-xs text-muted-foreground truncate">{c.last_message}</p>
                    </div>
                    <span className="text-[10px] text-muted-foreground flex-shrink-0">{moment(c.last_date).fromNow()}</span>
                  </button>
                ))}
              </div>
          }
        </div>
      ) : (
        <>
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
            {messages.map(msg => (
              <div key={msg.id} className={cn('flex', msg.sender_email === user?.email ? 'justify-end' : 'justify-start')}>
                <div className={cn('max-w-[75%] px-4 py-2 rounded-2xl text-sm', msg.sender_email === user?.email ? 'bg-primary text-primary-foreground rounded-br-sm' : 'bg-secondary text-foreground rounded-bl-sm')}>
                  <p>{msg.content}</p>
                  <p className="text-[10px] mt-1 opacity-60">{moment(msg.created_date).format('HH:mm')}</p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
          <div className="border-t border-border px-4 py-3 flex items-center gap-2">
            <Input value={newMsg} onChange={e => setNewMsg(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMessage()} placeholder="Type a message..." className="rounded-full bg-secondary border-0" />
            <button onClick={sendMessage} disabled={!newMsg.trim()} className="w-10 h-10 rounded-full bg-primary flex items-center justify-center flex-shrink-0 disabled:opacity-50">
              <Send className="w-4 h-4 text-primary-foreground" />
            </button>
          </div>
        </>
      )}
    </div>
  );
}

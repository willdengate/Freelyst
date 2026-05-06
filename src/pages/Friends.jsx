const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import { useState, useEffect } from 'react';

import { Search, UserPlus, Check, X, Users, Bell, MessageCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import FriendsList from '../components/friends/FriendsList';
import FriendFeed from '../components/friends/FriendFeed';
import FriendChat from '../components/friends/FriendChat';

const TABS = [
  { id: 'chat', label: 'Chat', icon: MessageCircle },
  { id: 'feed', label: "Friends' Listings", icon: Bell },
  { id: 'friends', label: 'Friends', icon: Users },
];

export default function Friends() {
  const [tab, setTab] = useState('chat');
  const [user, setUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [unreadShares, setUnreadShares] = useState(0);

  useEffect(() => {
    db.auth.me().then(me => {
      setUser(me);
      // Count pending incoming requests
      db.entities.Friendship.filter({ receiver_email: me.email, status: 'pending' })
        .then(reqs => setPendingRequests(reqs));
      // Count unread shares
      db.entities.ListingShare.filter({ receiver_email: me.email, read: false })
        .then(shares => setUnreadShares(shares.length));
    });
  }, []);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const results = await db.entities.User.list();
      const filtered = results.filter(u =>
        u.email !== user?.email &&
        (u.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          u.email?.toLowerCase().includes(searchQuery.toLowerCase()))
      );
      setSearchResults(filtered);
    } catch {
      toast.error('Search failed');
    }
    setSearching(false);
  };

  const sendFriendRequest = async (targetUser) => {
    // Check if already sent
    const existing = await db.entities.Friendship.filter({
      requester_email: user.email,
      receiver_email: targetUser.email,
    });
    if (existing.length > 0) {
      toast.info('Request already sent');
      return;
    }
    await db.entities.Friendship.create({
      requester_email: user.email,
      requester_name: user.full_name,
      receiver_email: targetUser.email,
      receiver_name: targetUser.full_name,
      status: 'pending',
    });
    toast.success(`Friend request sent to ${targetUser.full_name}!`);
    setSearchResults(prev => prev.filter(u => u.email !== targetUser.email));
  };

  return (
    <div className="pb-4">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/90 backdrop-blur-xl">
        <div className="px-4 pt-4 pb-3">
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground mb-3">
            Friends
          </h1>

          {/* Search bar */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                placeholder="Search by name or email..."
                className="pl-9 rounded-full h-10"
              />
            </div>
            <Button onClick={handleSearch} disabled={searching} size="sm" className="rounded-full px-4 h-10">
              {searching ? '...' : 'Search'}
            </Button>
          </div>

          {/* Search results */}
          {searchResults.length > 0 && (
            <div className="mt-2 bg-card border border-border rounded-2xl overflow-hidden shadow-lg">
              {searchResults.map(u => (
                <div key={u.email} className="flex items-center gap-3 px-4 py-3 border-b border-border/50 last:border-0">
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-primary font-bold text-sm">{u.full_name?.charAt(0)?.toUpperCase() || '?'}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm">{u.full_name}</p>
                    <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                  </div>
                  <Button size="sm" className="rounded-full h-8 px-3 text-xs" onClick={() => sendFriendRequest(u)}>
                    <UserPlus className="w-3.5 h-3.5 mr-1" />
                    Add
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-4 pb-2">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold transition-all relative ${
                tab === t.id
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-muted-foreground hover:text-foreground'
              }`}
            >
              <t.icon className="w-3.5 h-3.5" />
              {t.label}
              {t.id === 'friends' && pendingRequests.length > 0 && (
                <span className="ml-1 w-4 h-4 bg-destructive rounded-full text-[9px] text-white font-bold flex items-center justify-center">
                  {pendingRequests.length}
                </span>
              )}
              {t.id === 'chat' && unreadShares > 0 && (
                <span className="ml-1 w-4 h-4 bg-destructive rounded-full text-[9px] text-white font-bold flex items-center justify-center">
                  {unreadShares}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="px-4 mt-2">
        {tab === 'feed' && user && <FriendFeed user={user} />}
        {tab === 'friends' && user && (
          <FriendsList
            user={user}
            pendingRequests={pendingRequests}
            onRequestsChange={setPendingRequests}
          />
        )}
        {tab === 'chat' && user && (
          <FriendChat user={user} onRead={() => setUnreadShares(0)} />
        )}
      </div>
    </div>
  );
}
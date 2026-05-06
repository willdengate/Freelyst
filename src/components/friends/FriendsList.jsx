const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import { useState, useEffect } from 'react';

import { Check, X, UserCheck, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import SuggestedFriends from './SuggestedFriends';

export default function FriendsList({ user, pendingRequests, onRequestsChange }) {
  const [friends, setFriends] = useState([]);
  const [outgoingRequests, setOutgoingRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFriends();
  }, [user]);

  const loadFriends = async () => {
    setLoading(true);
    const [sentAccepted, receivedAccepted, sentPending] = await Promise.all([
      db.entities.Friendship.filter({ requester_email: user.email, status: 'accepted' }),
      db.entities.Friendship.filter({ receiver_email: user.email, status: 'accepted' }),
      db.entities.Friendship.filter({ requester_email: user.email, status: 'pending' }),
    ]);
    const all = [
      ...sentAccepted.map(f => ({ id: f.id, name: f.receiver_name, email: f.receiver_email })),
      ...receivedAccepted.map(f => ({ id: f.id, name: f.requester_name, email: f.requester_email })),
    ];
    setFriends(all);
    setOutgoingRequests(sentPending);
    setLoading(false);
  };

  const acceptRequest = async (req) => {
    await db.entities.Friendship.update(req.id, { status: 'accepted' });
    toast.success(`You and ${req.requester_name} are now friends!`);
    onRequestsChange(prev => prev.filter(r => r.id !== req.id));
    loadFriends();
  };

  const declineRequest = async (req) => {
    await db.entities.Friendship.update(req.id, { status: 'declined' });
    onRequestsChange(prev => prev.filter(r => r.id !== req.id));
  };

  if (loading) {
    return <div className="flex justify-center py-12"><div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-4">
      {/* Pending requests */}
      {pendingRequests.length > 0 && (
        <div>
          <h3 className="font-bold text-sm mb-2 text-foreground">Friend Requests ({pendingRequests.length})</h3>
          <div className="space-y-2">
            {pendingRequests.map(req => (
              <div key={req.id} className="flex items-center gap-3 p-3 bg-card border border-border rounded-2xl">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-primary font-bold">{req.requester_name?.charAt(0)?.toUpperCase() || '?'}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">{req.requester_name}</p>
                  <p className="text-xs text-muted-foreground">wants to be your friend</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => acceptRequest(req)} className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                    <Check className="w-4 h-4 text-primary-foreground" />
                  </button>
                  <button onClick={() => declineRequest(req)} className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                    <X className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Outgoing pending requests */}
      {outgoingRequests.length > 0 && (
        <div>
          <h3 className="font-bold text-sm mb-2 text-foreground">Pending Requests ({outgoingRequests.length})</h3>
          <div className="space-y-2">
            {outgoingRequests.map(req => (
              <div key={req.id} className="flex items-center gap-3 p-3 bg-card border border-border rounded-2xl">
                <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                  <span className="text-muted-foreground font-bold">{req.receiver_name?.charAt(0)?.toUpperCase() || '?'}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">{req.receiver_name}</p>
                  <p className="text-xs text-muted-foreground">Request sent</p>
                </div>
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-secondary text-muted-foreground text-xs">
                  <Clock className="w-3 h-3" /> Pending
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Suggested friends */}
      <SuggestedFriends user={user} myFriendEmails={friends.map(f => f.email)} />

      {/* Friends list */}
      <div>
        <h3 className="font-bold text-sm mb-2 text-foreground">My Friends ({friends.length})</h3>
        {friends.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <UserCheck className="w-10 h-10 text-muted-foreground/30 mb-3" />
            <p className="font-semibold text-sm">No friends yet</p>
            <p className="text-xs text-muted-foreground mt-1">Search for people above to add friends</p>
          </div>
        ) : (
          <div className="space-y-2">
            {friends.map(f => (
              <div key={f.email} className="flex items-center gap-3 p-3 bg-card border border-border rounded-2xl">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-primary font-bold">{f.name?.charAt(0)?.toUpperCase() || '?'}</span>
                </div>
                <div>
                  <p className="font-semibold text-sm">{f.name}</p>
                  <p className="text-xs text-muted-foreground">{f.email}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
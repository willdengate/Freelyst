const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import { useState, useEffect } from 'react';

import { UserPlus, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function SuggestedFriends({ user, myFriendEmails }) {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sent, setSent] = useState(new Set());

  useEffect(() => {
    if (!user || myFriendEmails === null) return;
    const load = async () => {
      setLoading(true);

      if (myFriendEmails.length === 0) {
        setSuggestions([]);
        setLoading(false);
        return;
      }

      // Get all accepted friendships of my friends
      const friendFriendships = await Promise.all(
        myFriendEmails.map(email =>
          Promise.all([
            db.entities.Friendship.filter({ requester_email: email, status: 'accepted' }),
            db.entities.Friendship.filter({ receiver_email: email, status: 'accepted' }),
          ])
        )
      );

      // Count mutual connections
      const mutualCount = {};
      const mutualNames = {};

      friendFriendships.forEach(([ sent, received ], idx) => {
        const friendName = myFriendEmails[idx]; // we'll resolve names below
        const all = [
          ...sent.map(f => ({ email: f.receiver_email, name: f.receiver_name })),
          ...received.map(f => ({ email: f.requester_email, name: f.requester_name })),
        ];
        all.forEach(({ email, name }) => {
          if (email === user.email) return;
          if (myFriendEmails.includes(email)) return;
          mutualCount[email] = (mutualCount[email] || 0) + 1;
          mutualNames[email] = name;
        });
      });

      // Check existing pending/sent requests to exclude them
      const [pendingSent, pendingReceived] = await Promise.all([
        db.entities.Friendship.filter({ requester_email: user.email }),
        db.entities.Friendship.filter({ receiver_email: user.email }),
      ]);
      const alreadyConnected = new Set([
        ...pendingSent.map(f => f.receiver_email),
        ...pendingReceived.map(f => f.requester_email),
      ]);

      const result = Object.entries(mutualCount)
        .filter(([email]) => !alreadyConnected.has(email))
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
        .map(([email, count]) => ({ email, name: mutualNames[email], mutualCount: count }));

      setSuggestions(result);
      setLoading(false);
    };
    load();
  }, [user, myFriendEmails]);

  const sendRequest = async (person) => {
    await db.entities.Friendship.create({
      requester_email: user.email,
      requester_name: user.full_name,
      receiver_email: person.email,
      receiver_name: person.name,
      status: 'pending',
    });
    setSent(prev => new Set([...prev, person.email]));
    toast.success(`Friend request sent to ${person.name}!`);
  };

  if (loading || suggestions.length === 0) return null;

  return (
    <div>
      <h3 className="font-bold text-sm mb-2 text-foreground flex items-center gap-1.5">
        <Users className="w-4 h-4 text-primary" />
        People You May Know
      </h3>
      <div className="space-y-2">
        {suggestions.map(person => (
          <div key={person.email} className="flex items-center gap-3 p-3 bg-card border border-border rounded-2xl">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <span className="text-primary font-bold">{person.name?.charAt(0)?.toUpperCase() || '?'}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm truncate">{person.name}</p>
              <p className="text-xs text-muted-foreground">
                {person.mutualCount} mutual friend{person.mutualCount !== 1 ? 's' : ''}
              </p>
            </div>
            {sent.has(person.email) ? (
              <span className="text-xs text-muted-foreground font-semibold px-3 py-1.5 bg-secondary rounded-full">Sent</span>
            ) : (
              <Button size="sm" className="rounded-full h-8 px-3 text-xs" onClick={() => sendRequest(person)}>
                <UserPlus className="w-3.5 h-3.5 mr-1" />
                Add
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
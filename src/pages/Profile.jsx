const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import { useState, useEffect } from 'react';
import { Settings, ChevronRight, Package, Heart, MessageCircle, MapPin, LogOut, Edit, PenLine } from 'lucide-react';

import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import ListingCard from '../components/ListingCard';
import UserRating from '../components/UserRating';

export default function Profile() {
  const [user, setUser] = useState(null);
  const [myListings, setMyListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      const me = await db.auth.me();
      setUser(me);
      const listings = await db.entities.Listing.filter(
        { seller_email: me.email },
        '-created_date',
        20
      );
      setMyListings(listings);
      setLoading(false);
    };
    load();
  }, []);

  const handleLogout = () => {
    db.auth.logout('/');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const menuItems = [
    { icon: Package, label: 'My Listings', count: myListings.length, path: '/profile/listings' },
    { icon: Heart, label: 'Saved Items', path: '/saved' },
    { icon: MessageCircle, label: 'Messages', path: '/messages' },
    { icon: Settings, label: 'Settings', path: '/profile/settings' },
  ];

  return (
    <div className="pb-4">
      {/* Profile Header */}
      <div className="px-4 pt-6 pb-6 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent">
        <div className="flex items-center gap-4">
          <div className="w-18 h-18 rounded-full bg-primary/15 overflow-hidden flex items-center justify-center relative flex-shrink-0" style={{width:72,height:72}}>
            {user?.profile_picture ? (
              <img src={user.profile_picture} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <span className="text-primary font-extrabold text-3xl">
                {user?.full_name?.charAt(0)?.toUpperCase() || '?'}
              </span>
            )}
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-extrabold">{user?.full_name || 'User'}</h1>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
            <div className="flex items-center gap-4 mt-2">
              <div className="text-center">
                <p className="font-bold text-base">{myListings.length}</p>
                <p className="text-[10px] text-muted-foreground">Listings</p>
              </div>
            </div>
            <div className="mt-3 space-y-2">
              <UserRating userEmail={user?.email} role="seller" currentUserEmail={null} />
              <UserRating userEmail={user?.email} role="buyer" currentUserEmail={null} />
            </div>
          </div>
        </div>
      </div>

      {/* Menu Items */}
      <div className="px-4 mt-2">
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          {menuItems.map((item, idx) => (
            <Link
              key={item.label}
              to={item.path}
              className="flex items-center justify-between p-4 hover:bg-secondary/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                  <item.icon className="w-4 h-4 text-primary" />
                </div>
                <span className="font-medium text-sm">{item.label}</span>
              </div>
              <div className="flex items-center gap-2">
                {item.count !== undefined && (
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                    {item.count}
                  </span>
                )}
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* My Listings Preview */}
      {myListings.length > 0 && (
        <div className="mt-6">
          <div className="flex items-center justify-between px-4 mb-3">
            <h2 className="font-bold text-base">My Listings</h2>
            <Link to="/profile/listings" className="text-xs text-primary font-semibold">View all</Link>
          </div>
          <div className="px-4 space-y-3">
            {myListings.filter(l => l.status !== 'sold').slice(0, 3).map(listing => (
              <div key={listing.id} className="flex items-center gap-2">
                <div className="flex-1 min-w-0">
                  <ListingCard listing={listing} compact />
                </div>
                <Link
                  to={`/listing/${listing.id}/edit`}
                  className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0"
                >
                  <PenLine className="w-4 h-4 text-primary" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Logout */}
      <div className="px-4 mt-8">
        <Button
          variant="outline"
          className="w-full rounded-full h-11"
          onClick={handleLogout}
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sign Out
        </Button>
      </div>
    </div>
  );
}
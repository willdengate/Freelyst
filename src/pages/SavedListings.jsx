const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import { useState, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';

import ListingGrid from '../components/ListingGrid';
import { useUserData } from '../hooks/useUserData';
import { useNavigate } from 'react-router-dom';

export default function SavedListings() {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user, savedIds, toggleSave } = useUserData();
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      const saved = await db.entities.SavedListing.filter({ user_email: user.email });
      if (saved.length === 0) {
        setListings([]);
        setLoading(false);
        return;
      }

      const allListings = await db.entities.Listing.filter({ status: 'active' }, '-created_date', 100);
      const savedListingIds = new Set(saved.map(s => s.listing_id));
      setListings(allListings.filter(l => savedListingIds.has(l.id)));
      setLoading(false);
    };
    load();
  }, [user]);

  return (
    <div className="pb-4">
      <div className="sticky top-0 z-40 bg-background/90 backdrop-blur-xl border-b border-border">
        <div className="flex items-center justify-between px-4 h-14">
          <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h1 className="font-bold text-base">Saved Items</h1>
          <div className="w-9" />
        </div>
      </div>

      <div className="pt-4">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <ListingGrid
            listings={listings}
            savedIds={savedIds}
            onToggleSave={toggleSave}
          />
        )}
      </div>
    </div>
  );
}
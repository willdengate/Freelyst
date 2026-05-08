import { db } from '@/api/base44client';
import { useState, useEffect } from 'react';
import { ArrowLeft, PenLine, Plus, CheckCircle2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export default function MyListings() {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      const user = await db.auth.me();
      if (!user) { navigate('/login'); return; }
      const data = await db.entities.Listing.filter({ seller_email: user.email });
      setListings(data);
      setLoading(false);
    };
    load();
  }, []);

  const toggleSold = async (listing) => {
    const newStatus = listing.status === 'sold' ? 'active' : 'sold';
    await db.entities.Listing.update(listing.id, { status: newStatus });
    setListings(prev => prev.map(l => l.id === listing.id ? { ...l, status: newStatus } : l));
  };

  const active = listings.filter(l => l.status !== 'sold');
  const sold = listings.filter(l => l.status === 'sold');

  const Row = ({ listing }) => (
    <div className="flex items-center gap-3 p-3 bg-card border border-border rounded-2xl">
      <div className="w-16 h-16 rounded-xl overflow-hidden bg-muted flex-shrink-0">
        {listing.images?.[0] ? <img src={listing.images[0]} alt={listing.title} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-xl">📦</div>}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm line-clamp-1">{listing.title}</p>
        {listing.status !== 'sold' ? <p className="text-primary font-bold text-sm mt-0.5">${listing.price?.toLocaleString()}</p> : <p className="text-xs text-muted-foreground mt-0.5 italic">Sold</p>}
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize inline-block mt-1 ${listing.status === 'sold' ? 'bg-gray-100 text-gray-600' : 'bg-green-100 text-green-700'}`}>{listing.status}</span>
      </div>
      <div className="flex flex-col gap-1.5 flex-shrink-0">
        <Link to={`/listing/${listing.id}/edit`} className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center"><PenLine className="w-4 h-4 text-primary" /></Link>
        <button onClick={() => toggleSold(listing)} className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${listing.status === 'sold' ? 'bg-green-100 text-green-600' : 'bg-muted text-muted-foreground hover:bg-green-100 hover:text-green-600'}`}><CheckCircle2 className="w-4 h-4" /></button>
      </div>
    </div>
  );

  return (
    <div className="pb-8">
      <div className="sticky top-0 z-40 bg-background/90 backdrop-blur-xl border-b border-border">
        <div className="flex items-center justify-between px-4 h-14">
          <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center"><ArrowLeft className="w-4 h-4" /></button>
          <h1 className="font-bold text-base">My Listings</h1>
          <Link to="/create" className="w-9 h-9 rounded-full bg-primary flex items-center justify-center"><Plus className="w-4 h-4 text-primary-foreground" /></Link>
        </div>
      </div>
      <div className="px-4 pt-4">
        {loading ? <div className="flex justify-center py-20"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
          : listings.length === 0 ? <div className="flex flex-col items-center py-16 text-center"><p className="font-semibold">No listings yet</p><Button className="mt-4 rounded-full" onClick={() => navigate('/create')}>Create Listing</Button></div>
          : <>
              {active.length > 0 && <div className="mb-6"><h2 className="font-bold text-sm mb-3">Active ({active.length})</h2><div className="space-y-3">{active.map(l => <Row key={l.id} listing={l} />)}</div></div>}
              {sold.length > 0 && <div><h2 className="font-bold text-sm text-muted-foreground mb-3">Sold ({sold.length})</h2><div className="space-y-3">{sold.map(l => <Row key={l.id} listing={l} />)}</div></div>}
            </>
        }
      </div>
    </div>
  );
}

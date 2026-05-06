const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import { useState, useEffect, useCallback } from 'react';
import NotificationsPanel from '../components/NotificationsPanel';

import ListingGrid from '../components/ListingGrid';
import LocationBar from '../components/LocationBar';
import { useUserData } from '../hooks/useUserData';
import { useRecommendations } from '../hooks/useRecommendations';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Search as SearchIcon, X, SlidersHorizontal } from 'lucide-react';
import debounce from 'lodash/debounce';

function getSavedLocation() {
  try {
    const saved = localStorage.getItem('freelyst_location');
    return saved ? JSON.parse(saved) : null;
  } catch { return null; }
}

function getDistanceMiles(lat1, lng1, lat2, lng2) {
  const R = 3958.8;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function Home() {
  const [listings, setListings] = useState([]);
  const [location, setLocation] = useState(null);
  const [loadingListings, setLoadingListings] = useState(true);
  const [query, setQuery] = useState('');
  const [priceRange, setPriceRange] = useState([0, 10000]);
  const [condition, setCondition] = useState('');
  const [sortBy, setSortBy] = useState('-created_date');
  const [isSearching, setIsSearching] = useState(false);
  const { savedIds, interests, loading: loadingUser, toggleSave, trackSearch } = useUserData();

  const fetchListings = useCallback(
    debounce(async (q, cat, minPrice, maxPrice, cond, sort) => {
      setLoadingListings(true);
      const filter = { status: 'active' };
      if (cat) filter.category = cat;
      if (cond && cond !== 'all') filter.condition = cond;

      let data = await db.entities.Listing.filter(filter, sort, 50);

      if (q) {
        const lower = q.toLowerCase();
        data = data.filter(l =>
          l.title?.toLowerCase().includes(lower) ||
          l.description?.toLowerCase().includes(lower)
        );
      }
      if (minPrice > 0 || maxPrice < 10000) {
        data = data.filter(l => l.price >= minPrice && l.price <= maxPrice);
      }
      const loc = getSavedLocation();
      if (loc?.coords?.lat && loc?.coords?.lng && loc?.radius) {
        data = data.filter(l => {
          if (!l.latitude || !l.longitude) return true;
          return getDistanceMiles(loc.coords.lat, loc.coords.lng, l.latitude, l.longitude) <= loc.radius;
        });
      }

      setListings(data);
      setLoadingListings(false);
    }, 300),
    []
  );

  useEffect(() => {
    fetchListings(query, null, priceRange[0], priceRange[1], condition, sortBy);
  }, [query, priceRange, condition, sortBy]);

  const handleSearch = (e) => {
    const val = e.target.value;
    setQuery(val);
    setIsSearching(val.length > 0);
    if (val.length > 2) trackSearch?.(val);
  };

  const recommended = useRecommendations(listings, interests);
  const displayListings = isSearching ? listings : recommended;

  return (
    <div className="pb-4">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/90 backdrop-blur-xl">
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
              Free<span className="text-primary">lyst</span>
            </h1>
            <div className="mt-1">
              <LocationBar onLocationChange={setLocation} />
            </div>
          </div>
          <NotificationsPanel />
        </div>

        {/* Search bar */}
        <div className="flex items-center gap-2 px-4 pb-2">
          <div className="relative flex-1">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={handleSearch}
              placeholder="Search Freelyst..."
              className="pl-9 pr-9 h-10 rounded-full bg-secondary border-0 text-sm"
            />
            {query && (
              <button
                onClick={() => { setQuery(''); setIsSearching(false); }}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            )}
          </div>
          <Sheet>
            <SheetTrigger asChild>
              <button className="w-10 h-10 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                <SlidersHorizontal className="w-4 h-4 text-primary-foreground" />
              </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="rounded-t-3xl">
              <SheetHeader>
                <SheetTitle>Filters</SheetTitle>
              </SheetHeader>
              <div className="space-y-6 py-4">
                <div>
                  <Label className="text-sm font-semibold">Price Range</Label>
                  <div className="flex items-center justify-between text-sm text-muted-foreground mt-1 mb-3">
                    <span>${priceRange[0]}</span>
                    <span>${priceRange[1].toLocaleString()}</span>
                  </div>
                  <Slider value={priceRange} onValueChange={setPriceRange} min={0} max={10000} step={50} />
                </div>
                <div>
                  <Label className="text-sm font-semibold">Condition</Label>
                  <Select value={condition} onValueChange={setCondition}>
                    <SelectTrigger className="mt-2"><SelectValue placeholder="Any condition" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Any condition</SelectItem>
                      <SelectItem value="New">New</SelectItem>
                      <SelectItem value="Like New">Like New</SelectItem>
                      <SelectItem value="Good">Good</SelectItem>
                      <SelectItem value="Fair">Fair</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm font-semibold">Sort By</Label>
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="mt-2"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="-created_date">Newest first</SelectItem>
                      <SelectItem value="price">Price: Low to High</SelectItem>
                      <SelectItem value="-price">Price: High to Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button className="w-full rounded-full" variant="outline" onClick={() => {
                  setCondition('');
                  setPriceRange([0, 10000]);
                  setSortBy('-created_date');
                }}>
                  Reset Filters
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>

      </div>

      {/* Section label */}
      {!isSearching && recommended.length > 0 && !loadingListings && (
        <div className="flex items-center justify-between px-4 mb-3 mt-1">
          <h2 className="text-base font-bold text-foreground">For You</h2>
          <span className="text-xs text-primary font-semibold">Based on your interests</span>
        </div>
      )}
      {isSearching && !loadingListings && (
        <p className="text-xs text-muted-foreground px-4 mb-3 mt-1">
          {listings.length} result{listings.length !== 1 ? 's' : ''} for "{query}"
        </p>
      )}

      {/* Listings */}
      {(loadingListings || loadingUser) ? (
        <div className="grid grid-cols-2 gap-3 px-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="rounded-2xl bg-muted animate-pulse">
              <div className="aspect-square rounded-t-2xl bg-muted" />
              <div className="p-3 space-y-2">
                <div className="h-4 w-16 bg-border rounded" />
                <div className="h-3 w-full bg-border rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <ListingGrid listings={displayListings} savedIds={savedIds} onToggleSave={toggleSave} />
      )}
    </div>
  );
}
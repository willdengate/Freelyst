const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import { useState, useEffect, useCallback } from 'react';
import { Search as SearchIcon, X, ArrowLeft, SlidersHorizontal } from 'lucide-react';

import ListingGrid from '../components/ListingGrid';
import CategoryPills from '../components/CategoryPills';
import { useUserData } from '../hooks/useUserData';
import { Link, useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import debounce from 'lodash/debounce';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

// Haversine distance in miles
function getDistanceMiles(lat1, lng1, lat2, lng2) {
  const R = 3958.8;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getSavedLocation() {
  try {
    const saved = localStorage.getItem('marketplace_location');
    return saved ? JSON.parse(saved) : null;
  } catch { return null; }
}

export default function Search() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState(null);
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [priceRange, setPriceRange] = useState([0, 10000]);
  const [condition, setCondition] = useState('');
  const [sortBy, setSortBy] = useState('-created_date');
  const { savedIds, toggleSave, trackSearch } = useUserData();
  const navigate = useNavigate();
  const savedLocation = getSavedLocation();

  const searchListings = useCallback(
    debounce(async (searchQuery, cat, minPrice, maxPrice, cond, sort) => {
      setLoading(true);
      const filter = { status: 'active' };
      if (cat) filter.category = cat;
      if (cond) filter.condition = cond;

      let data = await db.entities.Listing.filter(filter, sort, 50);

      // Client-side filtering for search and price
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        data = data.filter(l =>
          l.title?.toLowerCase().includes(q) ||
          l.description?.toLowerCase().includes(q)
        );
      }
      if (minPrice > 0 || maxPrice < 10000) {
        data = data.filter(l => l.price >= minPrice && l.price <= maxPrice);
      }

      // Filter by location radius if coords are available
      const loc = getSavedLocation();
      if (loc?.coords?.lat && loc?.coords?.lng && loc?.radius) {
        data = data.filter(l => {
          if (!l.latitude || !l.longitude) return true; // include listings without coords
          return getDistanceMiles(loc.coords.lat, loc.coords.lng, l.latitude, l.longitude) <= loc.radius;
        });
      }

      setListings(data);
      setLoading(false);
    }, 300),
    []
  );

  useEffect(() => {
    searchListings(query, category, priceRange[0], priceRange[1], condition, sortBy);
  }, [query, category, priceRange, condition, sortBy]);

  const handleSearch = (e) => {
    const val = e.target.value;
    setQuery(val);
    if (val.length > 2) trackSearch(val);
  };

  return (
    <div className="pb-4">
      {/* Search Header */}
      <div className="sticky top-0 z-40 bg-background/90 backdrop-blur-xl px-4 pt-4 pb-3">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="relative flex-1">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={handleSearch}
              placeholder="Search marketplace..."
              className="pl-9 pr-9 h-10 rounded-full bg-secondary border-0 text-sm"
              autoFocus
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            )}
          </div>

          <Sheet>
            <SheetTrigger asChild>
              <button className="w-9 h-9 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
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
                  <Slider
                    value={priceRange}
                    onValueChange={setPriceRange}
                    min={0}
                    max={10000}
                    step={50}
                  />
                </div>

                <div>
                  <Label className="text-sm font-semibold">Condition</Label>
                  <Select value={condition} onValueChange={setCondition}>
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Any condition" />
                    </SelectTrigger>
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
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="-created_date">Newest first</SelectItem>
                      <SelectItem value="price">Price: Low to High</SelectItem>
                      <SelectItem value="-price">Price: High to Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  className="w-full rounded-full"
                  onClick={() => {
                    setCondition('');
                    setPriceRange([0, 10000]);
                    setSortBy('-created_date');
                  }}
                  variant="outline"
                >
                  Reset Filters
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>

        <div className="mt-3">
          <CategoryPills selected={category} onSelect={setCategory} />
        </div>
      </div>

      {/* Results */}
      <div className="mt-2">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            <p className="text-xs text-muted-foreground px-4 mb-3">
              {listings.length} result{listings.length !== 1 ? 's' : ''}
              {query && ` for "${query}"`}
            </p>
            <ListingGrid
              listings={listings}
              savedIds={savedIds}
              onToggleSave={toggleSave}
            />
          </>
        )}
      </div>
    </div>
  );
}
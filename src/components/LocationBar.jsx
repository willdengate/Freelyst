import { useState, useEffect, useRef, useCallback } from 'react';
import { MapPin, Navigation, ChevronDown, Check, Loader2, Search } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { MapContainer, TileLayer, Marker, Circle, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix default marker icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const STORAGE_KEY = 'freelyst_location';
const DEFAULT_COORDS = { lat: 51.505, lng: -0.09 }; // London fallback

function loadSavedLocation() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch { return null; }
}

function saveLocation(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

async function reverseGeocode(lat, lng) {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
      { headers: { 'Accept-Language': 'en' } }
    );
    const data = await res.json();
    return data.address?.city || data.address?.town || data.address?.village || data.address?.county || `${lat.toFixed(3)}, ${lng.toFixed(3)}`;
  } catch {
    return `${lat.toFixed(3)}, ${lng.toFixed(3)}`;
  }
}

// Inner component to handle map click/drag events
function MapClickHandler({ onMove }) {
  useMapEvents({
    click(e) { onMove(e.latlng.lat, e.latlng.lng); },
  });
  return null;
}

// Draggable marker component
function DraggableMarker({ coords, onDragEnd }) {
  const markerRef = useRef(null);
  const eventHandlers = {
    dragend() {
      const marker = markerRef.current;
      if (marker) {
        const { lat, lng } = marker.getLatLng();
        onDragEnd(lat, lng);
      }
    },
  };
  return (
    <Marker
      draggable
      eventHandlers={eventHandlers}
      position={[coords.lat, coords.lng]}
      ref={markerRef}
    />
  );
}

// Map that recenters when coords change
function RecenterMap({ coords }) {
  const map = useMapEvents({});
  useEffect(() => {
    map.setView([coords.lat, coords.lng], map.getZoom());
  }, [coords.lat, coords.lng]);
  return null;
}

export default function LocationBar({ onLocationChange }) {
  const [open, setOpen] = useState(false);
  const [locationName, setLocationName] = useState('Detecting...');
  const [radius, setRadius] = useState(25);
  const [detecting, setDetecting] = useState(false);
  const [coords, setCoords] = useState(null);
  const [mapCoords, setMapCoords] = useState(null); // draft coords while sheet is open
  const [mapName, setMapName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);

  useEffect(() => {
    const saved = loadSavedLocation();
    if (saved) {
      setLocationName(saved.name);
      setRadius(saved.radius);
      setCoords(saved.coords);
      onLocationChange?.({ name: saved.name, radius: saved.radius, coords: saved.coords });
    } else {
      detectLocation();
    }
  }, []);

  // When sheet opens, initialise map draft from current coords
  useEffect(() => {
    if (open) {
      const c = coords || DEFAULT_COORDS;
      setMapCoords(c);
      setMapName(locationName);
      setSearchQuery('');
      setSearchResults([]);
    }
  }, [open]);

  const detectLocation = () => {
    setDetecting(true);
    setLocationName('Detecting...');
    if (!navigator.geolocation) {
      setLocationName('Set location');
      setDetecting(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        const newCoords = { lat: latitude, lng: longitude };
        const name = await reverseGeocode(latitude, longitude);
        setCoords(newCoords);
        setLocationName(name);
        setDetecting(false);
        const loc = { name, radius, coords: newCoords };
        saveLocation(loc);
        onLocationChange?.(loc);
      },
      () => {
        setLocationName('Set location');
        setDetecting(false);
      },
      { timeout: 8000 }
    );
  };

  const handleMapMove = useCallback(async (lat, lng) => {
    const newCoords = { lat, lng };
    setMapCoords(newCoords);
    const name = await reverseGeocode(lat, lng);
    setMapName(name);
  }, []);

  const handleOsmSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearchLoading(true);
    setSearchResults([]);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery)}&format=json&limit=5`,
        { headers: { 'Accept-Language': 'en' } }
      );
      const data = await res.json();
      setSearchResults(data);
    } catch {}
    setSearchLoading(false);
  };

  const selectSearchResult = (result) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    const name = result.display_name.split(',').slice(0, 2).join(',').trim();
    setMapCoords({ lat, lng });
    setMapName(name);
    setSearchResults([]);
    setSearchQuery('');
  };

  const handleApply = () => {
    const loc = { name: mapName || locationName, radius, coords: mapCoords || coords };
    setCoords(loc.coords);
    setLocationName(loc.name);
    saveLocation(loc);
    onLocationChange?.(loc);
    setOpen(false);
  };

  const radiusMiles = radius;
  const radiusMeters = radiusMiles * 1609.34;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 hover:bg-primary/15 transition-colors">
          {detecting ? (
            <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />
          ) : (
            <MapPin className="w-3.5 h-3.5 text-primary" />
          )}
          <span className="text-xs font-semibold text-primary max-w-[120px] truncate">
            {locationName}
          </span>
          <span className="text-xs text-primary/70">· {radius} mi</span>
          <ChevronDown className="w-3 h-3 text-primary/70" />
        </button>
      </SheetTrigger>

      <SheetContent side="bottom" className="rounded-t-3xl max-h-[90vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Search Location</SheetTitle>
        </SheetHeader>

        <div className="space-y-4 py-4 pb-8">
          {/* OSM Search */}
          <div className="relative">
            <Label className="text-sm font-semibold mb-1.5 block">Search for a place</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleOsmSearch()}
                  placeholder="City, neighborhood..."
                  className="pl-9 rounded-xl h-11"
                />
              </div>
              <Button
                onClick={handleOsmSearch}
                disabled={searchLoading}
                variant="outline"
                className="rounded-xl h-11 px-4"
              >
                {searchLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Search'}
              </Button>
            </div>
            {searchResults.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-card border border-border rounded-xl shadow-xl z-[1000] overflow-hidden">
                {searchResults.map((r) => (
                  <button
                    key={r.place_id}
                    onClick={() => selectSearchResult(r)}
                    className="w-full text-left px-4 py-3 text-sm hover:bg-secondary transition-colors border-b border-border/50 last:border-0 line-clamp-1"
                  >
                    <MapPin className="w-3.5 h-3.5 inline mr-1.5 text-primary" />
                    {r.display_name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Map */}
          <div className="relative">
            <div className="flex items-center justify-between mb-1.5">
              <Label className="text-sm font-semibold">Drag pin to set location</Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={detectLocation}
                disabled={detecting}
                className="text-primary text-xs h-8"
              >
                {detecting ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Navigation className="w-3.5 h-3.5 mr-1" />}
                Use my location
              </Button>
            </div>
            <div className="rounded-2xl overflow-hidden border border-border" style={{ height: 260 }}>
              {mapCoords && (
                <MapContainer
                  center={[mapCoords.lat, mapCoords.lng]}
                  zoom={12}
                  style={{ height: '100%', width: '100%' }}
                  zoomControl={true}
                >
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  />
                  <DraggableMarker coords={mapCoords} onDragEnd={handleMapMove} />
                  <Circle
                    center={[mapCoords.lat, mapCoords.lng]}
                    radius={radiusMeters}
                    pathOptions={{ color: 'hsl(270,60%,45%)', fillColor: 'hsl(270,60%,45%)', fillOpacity: 0.1, weight: 2 }}
                  />
                  <MapClickHandler onMove={handleMapMove} />
                  <RecenterMap coords={mapCoords} />
                </MapContainer>
              )}
            </div>
            {mapName && (
              <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1">
                <MapPin className="w-3 h-3 text-primary" />
                {mapName}
              </p>
            )}
          </div>

          {/* Radius slider */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <Label className="text-sm font-semibold">Search Radius</Label>
              <span className="text-sm font-bold text-primary">{radius} miles</span>
            </div>
            <Slider
              value={[radius]}
              onValueChange={(v) => setRadius(v[0])}
              min={1}
              max={100}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1.5">
              <span>1 mi</span>
              <span>25 mi</span>
              <span>50 mi</span>
              <span>100 mi</span>
            </div>
          </div>

          <Button onClick={handleApply} className="w-full h-12 rounded-full font-semibold">
            <Check className="w-4 h-4 mr-2" />
            Apply Location
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
import { useState, useRef, useCallback } from 'react';
import { MapPin, Navigation, Search, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

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

function DraggableMarker({ coords, onDragEnd }) {
  const markerRef = useRef(null);
  return (
    <Marker
      draggable
      eventHandlers={{
        dragend() {
          const m = markerRef.current;
          if (m) { const { lat, lng } = m.getLatLng(); onDragEnd(lat, lng); }
        },
      }}
      position={[coords.lat, coords.lng]}
      ref={markerRef}
    />
  );
}

function MapClickHandler({ onMove }) {
  useMapEvents({ click(e) { onMove(e.latlng.lat, e.latlng.lng); } });
  return null;
}

function RecenterMap({ coords }) {
  const map = useMapEvents({});
  const prev = useRef(null);
  if (!prev.current || prev.current.lat !== coords.lat || prev.current.lng !== coords.lng) {
    prev.current = coords;
    map.setView([coords.lat, coords.lng], map.getZoom());
  }
  return null;
}

// coords: { lat, lng } | null
// onChange: ({ lat, lng, name }) => void
export default function LocationPicker({ coords, locationName, onChange }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [detecting, setDetecting] = useState(false);

  const defaultCoords = coords || { lat: 51.505, lng: -0.09 };

  const handleMapMove = useCallback(async (lat, lng) => {
    const name = await reverseGeocode(lat, lng);
    onChange({ lat, lng, name });
  }, [onChange]);

  const handleSearch = async () => {
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

  const selectResult = (r) => {
    const lat = parseFloat(r.lat);
    const lng = parseFloat(r.lon);
    const name = r.display_name.split(',').slice(0, 2).join(',').trim();
    onChange({ lat, lng, name });
    setSearchResults([]);
    setSearchQuery('');
  };

  const detectLocation = () => {
    if (!navigator.geolocation) return;
    setDetecting(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        const name = await reverseGeocode(lat, lng);
        onChange({ lat, lng, name });
        setDetecting(false);
      },
      () => setDetecting(false),
      { timeout: 8000 }
    );
  };

  return (
    <div className="space-y-3">
      {/* Search */}
      <div className="relative">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search for a place..."
              className="pl-9 rounded-xl h-11"
            />
          </div>
          <Button onClick={handleSearch} disabled={searchLoading} variant="outline" className="rounded-xl h-11 px-4">
            {searchLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Search'}
          </Button>
        </div>
        {searchResults.length > 0 && (
          <div className="absolute left-0 right-0 top-full mt-1 bg-card border border-border rounded-xl shadow-xl z-[1000] overflow-hidden">
            {searchResults.map((r) => (
              <button
                key={r.place_id}
                onClick={() => selectResult(r)}
                className="w-full text-left px-4 py-3 text-sm hover:bg-secondary transition-colors border-b border-border/50 last:border-0"
              >
                <MapPin className="w-3.5 h-3.5 inline mr-1.5 text-primary" />
                {r.display_name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Map */}
      <div className="rounded-2xl overflow-hidden border border-border" style={{ height: 220 }}>
        <MapContainer
          center={[defaultCoords.lat, defaultCoords.lng]}
          zoom={12}
          style={{ height: '100%', width: '100%' }}
          zoomControl
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />
          {coords && <DraggableMarker coords={coords} onDragEnd={handleMapMove} />}
          {coords && <RecenterMap coords={coords} />}
          <MapClickHandler onMove={handleMapMove} />
        </MapContainer>
      </div>

      {/* Footer row */}
      <div className="flex items-center justify-between">
        {locationName ? (
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <MapPin className="w-3 h-3 text-primary" />
            {locationName}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">Click the map or search to set location</p>
        )}
        <Button variant="ghost" size="sm" onClick={detectLocation} disabled={detecting} className="text-primary text-xs h-8">
          {detecting ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Navigation className="w-3.5 h-3.5 mr-1" />}
          Use my location
        </Button>
      </div>
    </div>
  );
}
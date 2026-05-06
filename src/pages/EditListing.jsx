const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Camera, X, Loader2, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import LocationPicker from '../components/LocationPicker';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

const CURRENCIES = [
  { code: 'USD', symbol: '$', label: 'USD ($)' },
  { code: 'EUR', symbol: '€', label: 'EUR (€)' },
  { code: 'GBP', symbol: '£', label: 'GBP (£)' },
  { code: 'CAD', symbol: 'CA$', label: 'CAD (CA$)' },
  { code: 'AUD', symbol: 'A$', label: 'AUD (A$)' },
  { code: 'JPY', symbol: '¥', label: 'JPY (¥)' },
  { code: 'INR', symbol: '₹', label: 'INR (₹)' },
  { code: 'BRL', symbol: 'R$', label: 'BRL (R$)' },
  { code: 'MXN', symbol: 'MX$', label: 'MXN (MX$)' },
  { code: 'ZAR', symbol: 'R', label: 'ZAR (R)' },
  { code: 'ILS', symbol: '₪', label: 'ILS (₪)' },
  { code: 'AED', symbol: 'د.إ', label: 'AED (د.إ)' },
  { code: 'CHF', symbol: 'Fr', label: 'CHF (Fr)' },
  { code: 'SEK', symbol: 'kr', label: 'SEK (kr)' },
  { code: 'NOK', symbol: 'kr', label: 'NOK (kr)' },
  { code: 'NZD', symbol: 'NZ$', label: 'NZD (NZ$)' },
];

const categories = ['Electronics', 'Vehicles', 'Furniture', 'Clothing', 'Home & Garden', 'Sports', 'Toys', 'Books', 'Music', 'Pet Supplies', 'Other'];
const conditions = ['New', 'Like New', 'Good', 'Fair', 'Poor'];
const statuses = ['active', 'pending', 'sold'];

export default function EditListing() {
  const { listingId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [images, setImages] = useState([]);
  const [currency, setCurrency] = useState('USD');
  const [locationCoords, setLocationCoords] = useState(null);
  const [form, setForm] = useState({
    title: '', description: '', price: '',
    category: '', condition: '', location_name: '', status: 'active',
  });

  useEffect(() => {
    const load = async () => {
      const [listing, user] = await Promise.all([
        db.entities.Listing.get(listingId),
        db.auth.me(),
      ]);
      // Make sure only the seller can edit
      if (listing.seller_email !== user.email) {
        toast.error('You can only edit your own listings');
        navigate(-1);
        return;
      }
      setForm({
        title: listing.title || '',
        description: listing.description || '',
        price: listing.price?.toString() || '',
        category: listing.category || '',
        condition: listing.condition || '',
        location_name: listing.location_name || '',
        status: listing.status || 'active',
      });
      setCurrency(listing.currency || 'USD');
      if (listing.latitude && listing.longitude) {
        setLocationCoords({ lat: listing.latitude, lng: listing.longitude });
      }
      setImages(listing.images || []);
      setLoading(false);
    };
    load();
  }, [listingId]);

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    for (const file of files) {
      const { file_url } = await db.integrations.Core.UploadFile({ file });
      setImages(prev => [...prev, file_url]);
    }
  };

  const removeImage = (idx) => setImages(prev => prev.filter((_, i) => i !== idx));

  const handleSubmit = async () => {
    if (!form.title || !form.price || !form.category || !form.condition) {
      toast.error('Please fill in all required fields');
      return;
    }
    setSubmitting(true);
    await db.entities.Listing.update(listingId, {
      ...form,
      price: parseFloat(form.price),
      currency,
      images,
      latitude: locationCoords?.lat ?? null,
      longitude: locationCoords?.lng ?? null,
    });
    toast.success('Listing updated!');
    navigate('/profile');
  };

  const handleDelete = async () => {
    await db.entities.Listing.delete(listingId);
    toast.success('Listing deleted');
    navigate('/profile');
  };

  const updateField = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="pb-8">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/90 backdrop-blur-xl border-b border-border">
        <div className="flex items-center justify-between px-4 h-14">
          <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h1 className="font-bold text-base">Edit Listing</h1>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button className="w-9 h-9 rounded-full bg-destructive/10 flex items-center justify-center">
                <Trash2 className="w-4 h-4 text-destructive" />
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete listing?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently remove your listing. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <div className="px-4 pt-5 space-y-5">
        {/* Images */}
        <div>
          <Label className="text-sm font-semibold">Photos</Label>
          <div className="flex gap-3 mt-2 overflow-x-auto pb-2">
            <label className="w-24 h-24 rounded-2xl border-2 border-dashed border-primary/30 flex flex-col items-center justify-center gap-1 cursor-pointer flex-shrink-0 hover:border-primary/60 transition-colors bg-primary/5">
              <Camera className="w-6 h-6 text-primary" />
              <span className="text-[10px] text-primary font-medium">Add Photo</span>
              <input type="file" accept="image/*" multiple onChange={handleImageUpload} className="hidden" />
            </label>
            {images.map((url, idx) => (
              <div key={idx} className="relative w-24 h-24 rounded-2xl overflow-hidden flex-shrink-0">
                <img src={url} alt="" className="w-full h-full object-cover" />
                <button
                  onClick={() => removeImage(idx)}
                  className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/50 flex items-center justify-center"
                >
                  <X className="w-3 h-3 text-white" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Title */}
        <div>
          <Label className="text-sm font-semibold">Title *</Label>
          <Input value={form.title} onChange={(e) => updateField('title', e.target.value)} placeholder="What are you selling?" className="mt-1.5 rounded-xl h-11" />
        </div>

        {/* Price */}
        <div>
          <Label className="text-sm font-semibold">Price *</Label>
          <div className="flex gap-2 mt-1.5">
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger className="w-32 rounded-xl h-11 flex-shrink-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CURRENCIES.map(c => (
                  <SelectItem key={c.code} value={c.code}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold text-sm">
                {CURRENCIES.find(c => c.code === currency)?.symbol || '$'}
              </span>
              <Input value={form.price} onChange={(e) => updateField('price', e.target.value)} placeholder="0.00" type="number" className="pl-8 rounded-xl h-11" />
            </div>
          </div>
        </div>

        {/* Category & Condition */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-sm font-semibold">Category *</Label>
            <Select value={form.category} onValueChange={(v) => updateField('category', v)}>
              <SelectTrigger className="mt-1.5 rounded-xl h-11"><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>{categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-sm font-semibold">Condition *</Label>
            <Select value={form.condition} onValueChange={(v) => updateField('condition', v)}>
              <SelectTrigger className="mt-1.5 rounded-xl h-11"><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>{conditions.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>

        {/* Status */}
        <div>
          <Label className="text-sm font-semibold">Status</Label>
          <Select value={form.status} onValueChange={(v) => updateField('status', v)}>
            <SelectTrigger className="mt-1.5 rounded-xl h-11"><SelectValue /></SelectTrigger>
            <SelectContent>{statuses.map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent>
          </Select>
        </div>

        {/* Location */}
        <div>
          <Label className="text-sm font-semibold">Location</Label>
          <div className="mt-1.5">
            <LocationPicker
              coords={locationCoords}
              locationName={form.location_name}
              onChange={({ lat, lng, name }) => {
                setLocationCoords({ lat, lng });
                updateField('location_name', name);
              }}
            />
          </div>
        </div>

        {/* Description */}
        <div>
          <Label className="text-sm font-semibold">Description</Label>
          <Textarea value={form.description} onChange={(e) => updateField('description', e.target.value)} placeholder="Describe your item..." rows={4} className="mt-1.5 rounded-xl resize-none" />
        </div>

        <Button onClick={handleSubmit} disabled={submitting} className="w-full h-12 rounded-full font-semibold text-base">
          {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</> : 'Save Changes'}
        </Button>
      </div>
    </div>
  );
}
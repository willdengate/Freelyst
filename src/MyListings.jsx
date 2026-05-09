import { db } from '@/api/base44client';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Camera, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import LocationPicker from '../components/LocationPicker';

const categories = ['Electronics','Vehicles','Furniture','Clothing','Home & Garden','Sports','Toys','Books','Music','Pet Supplies','Other'];
const conditions = ['New','Like New','Good','Fair','Poor'];
const CURRENCIES = [
  {code:'GBP',symbol:'£',label:'GBP (£)'},{code:'USD',symbol:'$',label:'USD ($)'},
  {code:'EUR',symbol:'€',label:'EUR (€)'},{code:'CAD',symbol:'CA$',label:'CAD (CA$)'},
  {code:'AUD',symbol:'A$',label:'AUD (A$)'},{code:'JPY',symbol:'¥',label:'JPY (¥)'},
  {code:'INR',symbol:'₹',label:'INR (₹)'},{code:'BRL',symbol:'R$',label:'BRL (R$)'},
  {code:'MXN',symbol:'MX$',label:'MXN (MX$)'},{code:'ZAR',symbol:'R',label:'ZAR (R)'},
  {code:'ILS',symbol:'₪',label:'ILS (₪)'},{code:'AED',symbol:'د.إ',label:'AED (د.إ)'},
  {code:'CHF',symbol:'Fr',label:'CHF (Fr)'},{code:'SEK',symbol:'kr',label:'SEK (kr)'},
  {code:'NOK',symbol:'kr',label:'NOK (kr)'},{code:'NZD',symbol:'NZ$',label:'NZD (NZ$)'},
];
const LOCALE_CURRENCY_MAP = {
  'en-US':'USD','en-CA':'CAD','en-GB':'GBP','en-AU':'AUD','en-NZ':'NZD',
  'en-ZA':'ZAR','en-IN':'INR','he':'ILS','he-IL':'ILS','ar-AE':'AED',
  'ja':'JPY','ja-JP':'JPY','pt-BR':'BRL','es-MX':'MXN',
  'de':'EUR','fr':'EUR','it':'EUR','es':'EUR','nl':'EUR','sv':'SEK','no':'NOK',
};
function detectCurrency() {
  const lang = navigator.language || 'en-GB';
  return LOCALE_CURRENCY_MAP[lang] || LOCALE_CURRENCY_MAP[lang.split('-')[0]] || 'GBP';
}

export default function CreateListing() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [images, setImages] = useState([]);
  const [currency, setCurrency] = useState(() => detectCurrency());
  const [locationCoords, setLocationCoords] = useState(null);
  const [form, setForm] = useState({ title:'', description:'', price:'', category:'', condition:'', location_name:'' });

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    for (const file of files) {
      try {
        const { file_url } = await db.integrations.Core.UploadFile(file);
        setImages(prev => [...prev, file_url]);
      } catch (err) {
        toast.error('Failed to upload image');
      }
    }
  };

  const handleSubmit = async () => {
    if (!form.title || !form.price || !form.category || !form.condition) {
      toast.error('Please fill in all required fields');
      return;
    }
    setSubmitting(true);
    try {
      const user = await db.auth.me();
      if (!user) { toast.error('You must be logged in'); navigate('/login'); return; }
      await db.entities.Listing.create({
        ...form,
        price: parseFloat(form.price),
        currency,
        images,
        seller_name: user.full_name || user.email,
        seller_email: user.email,
        status: 'active',
        views_count: 0,
        latitude: locationCoords?.lat ?? null,
        longitude: locationCoords?.lng ?? null,
      });
      toast.success('Listing created!');
      navigate('/');
    } catch (err) {
      toast.error('Failed to create listing');
    }
    setSubmitting(false);
  };

  const updateField = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  return (
    <div className="pb-8">
      <div className="sticky top-0 z-40 bg-background/90 backdrop-blur-xl border-b border-border">
        <div className="flex items-center justify-between px-4 h-14">
          <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center"><ArrowLeft className="w-4 h-4" /></button>
          <h1 className="font-bold text-base">Create Listing</h1>
          <div className="w-9" />
        </div>
      </div>
      <div className="px-4 pt-5 space-y-5">
        <div>
          <Label className="text-sm font-semibold">Photos</Label>
          <div className="flex gap-3 mt-2 overflow-x-auto pb-2">
            <label className="w-24 h-24 rounded-2xl border-2 border-dashed border-primary/30 flex flex-col items-center justify-center gap-1 cursor-pointer flex-shrink-0 hover:border-primary/60 transition-colors">
              <Camera className="w-5 h-5 text-muted-foreground" />
              <span className="text-[10px] text-muted-foreground">Add Photo</span>
              <input type="file" accept="image/*" multiple className="hidden" onChange={handleImageUpload} />
            </label>
            {images.map((img, i) => (
              <div key={i} className="relative w-24 h-24 rounded-2xl overflow-hidden flex-shrink-0">
                <img src={img} alt="" className="w-full h-full object-cover" />
                <button onClick={() => setImages(prev => prev.filter((_,j) => j !== i))} className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 flex items-center justify-center">
                  <X className="w-3 h-3 text-white" />
                </button>
              </div>
            ))}
          </div>
        </div>
        <div><Label className="text-sm font-semibold">Title *</Label><Input value={form.title} onChange={e => updateField('title', e.target.value)} placeholder="What are you selling?" className="mt-1.5 rounded-xl h-11" /></div>
        <div><Label className="text-sm font-semibold">Description</Label><Textarea value={form.description} onChange={e => updateField('description', e.target.value)} placeholder="Describe your item..." className="mt-1.5 rounded-xl min-h-[100px]" /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label className="text-sm font-semibold">Price *</Label><Input type="number" value={form.price} onChange={e => updateField('price', e.target.value)} placeholder="0.00" className="mt-1.5 rounded-xl h-11" /></div>
          <div>
            <Label className="text-sm font-semibold">Currency</Label>
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger className="mt-1.5 rounded-xl h-11"><SelectValue /></SelectTrigger>
              <SelectContent>{CURRENCIES.map(c => <SelectItem key={c.code} value={c.code}>{c.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
        <div>
          <Label className="text-sm font-semibold">Category *</Label>
          <Select value={form.category} onValueChange={v => updateField('category', v)}>
            <SelectTrigger className="mt-1.5 rounded-xl h-11"><SelectValue placeholder="Select category" /></SelectTrigger>
            <SelectContent>{categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-sm font-semibold">Condition *</Label>
          <Select value={form.condition} onValueChange={v => updateField('condition', v)}>
            <SelectTrigger className="mt-1.5 rounded-xl h-11"><SelectValue placeholder="Select condition" /></SelectTrigger>
            <SelectContent>{conditions.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-sm font-semibold">Location</Label>
          <LocationPicker value={locationCoords} onChange={setLocationCoords} locationName={form.location_name} onLocationNameChange={v => updateField('location_name', v)} />
        </div>
        <Button onClick={handleSubmit} disabled={submitting} className="w-full h-12 rounded-full font-semibold">
          {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creating...</> : 'Create Listing'}
        </Button>
      </div>
    </div>
  );
}

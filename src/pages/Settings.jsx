const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Camera } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export default function Settings() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [fullName, setFullName] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    db.auth.me().then(me => {
      setUser(me);
      setFullName(me.full_name || '');
    });
  }, []);

  const handlePhotoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    const { file_url } = await db.integrations.Core.UploadFile({ file });
    await db.auth.updateMe({ profile_picture: file_url });
    setUser(prev => ({ ...prev, profile_picture: file_url }));
    toast.success('Profile picture updated!');
    setUploadingPhoto(false);
  };

  const handleSave = async () => {
    setSaving(true);
    await db.auth.updateMe({ full_name: fullName });
    toast.success('Settings saved!');
    setSaving(false);
  };

  return (
    <div className="pb-8">
      <div className="sticky top-0 z-40 bg-background/90 backdrop-blur-xl border-b border-border">
        <div className="flex items-center gap-3 px-4 h-14">
          <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h1 className="font-bold text-base">Settings</h1>
        </div>
      </div>

      <div className="px-4 pt-6 space-y-6">
        {/* Profile Picture */}
        <div className="flex flex-col items-center gap-3">
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-primary/10 overflow-hidden flex items-center justify-center">
              {user?.profile_picture ? (
                <img src={user.profile_picture} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <span className="text-primary font-extrabold text-3xl">
                  {user?.full_name?.charAt(0)?.toUpperCase() || '?'}
                </span>
              )}
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingPhoto}
              className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md"
            >
              {uploadingPhoto ? (
                <div className="w-3.5 h-3.5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
              ) : (
                <Camera className="w-3.5 h-3.5" />
              )}
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
          </div>
          <p className="text-xs text-muted-foreground">Tap the camera icon to change your photo</p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-4 space-y-4">
          <h2 className="font-semibold text-sm">Account</h2>

          <div>
            <Label className="text-sm font-medium">Display Name</Label>
            <Input
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              placeholder="Your name"
              className="mt-1.5 rounded-xl h-11"
            />
          </div>

          <div>
            <Label className="text-sm font-medium">Email</Label>
            <Input
              value={user?.email || ''}
              disabled
              className="mt-1.5 rounded-xl h-11 opacity-60"
            />
            <p className="text-xs text-muted-foreground mt-1">Email cannot be changed</p>
          </div>
        </div>

        <Button onClick={handleSave} disabled={saving} className="w-full h-12 rounded-full font-semibold">
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </div>
  );
}
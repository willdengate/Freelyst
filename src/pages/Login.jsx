import { useState } from 'react';
import { db } from '@/api/base44client';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export default function Login() {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async () => {
    if (!email || !password) { toast.error('Please fill in all fields'); return; }
    setLoading(true);
    try {
      if (isRegister) {
        await db.auth.register({ email, password, full_name: fullName });
        toast.success('Account created! Please check your email to confirm.');
      } else {
        await db.auth.login({ email, password });
        navigate('/');
      }
    } catch (err) {
      toast.error(err.message || 'Something went wrong');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-background">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold">Free<span className="text-primary">lyst</span></h1>
          <p className="text-muted-foreground mt-1 text-sm">{isRegister ? 'Create your account' : 'Welcome back'}</p>
        </div>
        <div className="space-y-4">
          {isRegister && (
            <div>
              <Label>Full Name</Label>
              <Input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Your name" className="mt-1.5 rounded-xl h-11" />
            </div>
          )}
          <div>
            <Label>Email</Label>
            <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" className="mt-1.5 rounded-xl h-11" />
          </div>
          <div>
            <Label>Password</Label>
            <Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" className="mt-1.5 rounded-xl h-11" onKeyDown={e => e.key === 'Enter' && handleSubmit()} />
          </div>
          <Button onClick={handleSubmit} disabled={loading} className="w-full h-12 rounded-full font-semibold">
            {loading ? 'Please wait...' : isRegister ? 'Create Account' : 'Sign In'}
          </Button>
        </div>
        <p className="text-center text-sm text-muted-foreground mt-6">
          {isRegister ? 'Already have an account?' : "Don't have an account?"}
          <button onClick={() => setIsRegister(o => !o)} className="text-primary font-semibold ml-1">
            {isRegister ? 'Sign in' : 'Sign up'}
          </button>
        </p>
      </div>
    </div>
  );
}

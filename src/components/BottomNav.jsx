const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import { Link, useLocation } from 'react-router-dom';
import { Home, Users, PlusCircle, Heart, User, MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';

const navItems = [
  { path: '/', icon: Home, label: 'Home' },
  { path: '/friends', icon: Users, label: 'Friends' },
  { path: '/create', icon: PlusCircle, label: 'Sell' },
  { path: '/messages', icon: MessageCircle, label: 'Messages' },
  { path: '/profile', icon: User, label: 'Profile' },
];

export default function BottomNav() {
  const location = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    let myEmail = null;

    const init = async () => {
      const me = await db.auth.me();
      myEmail = me.email;

      // Load initial unread count
      const unread = await db.entities.Message.filter({ receiver_email: me.email, read: false });
      setUnreadCount(unread.length);

      // Subscribe to real-time updates
      db.entities.Message.subscribe((event) => {
        if (!myEmail) return;
        if (event.type === 'create' && event.data?.receiver_email === myEmail && !event.data?.read) {
          setUnreadCount(prev => prev + 1);
        }
        if (event.type === 'update' && event.data?.receiver_email === myEmail && event.data?.read) {
          setUnreadCount(prev => Math.max(0, prev - 1));
        }
      });
    };

    init();
  }, []);

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-lg border-t border-border z-50 pb-safe">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
        {navItems.map(({ path, icon: Icon, label }) => {
          const isActive = path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);
          const isSell = path === '/create';

          return (
            <Link
              key={path}
              to={path}
              className={cn(
                "flex flex-col items-center gap-0.5 py-1.5 px-3 rounded-xl transition-all duration-200",
                isSell && "relative -top-3",
                isActive && !isSell && "text-primary",
                !isActive && !isSell && "text-muted-foreground"
              )}
            >
              {isSell ? (
                <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center shadow-lg shadow-primary/30">
                  <Icon className="w-6 h-6 text-primary-foreground" />
                </div>
              ) : (
                <div className="relative">
                  <Icon className={cn("w-5 h-5", isActive && "stroke-[2.5px]")} />
                  {path === '/messages' && unreadCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-primary rounded-full text-[9px] text-primary-foreground font-bold flex items-center justify-center">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </div>
              )}
              <span className={cn("text-[10px] font-medium", isSell && "mt-0.5")}>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
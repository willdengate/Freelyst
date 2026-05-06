import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import AppLayout from './components/AppLayout';
import Home from './pages/Home';
import Search from './pages/Search';
import ListingDetail from './pages/ListingDetail';
import CreateListing from './pages/CreateListing';
import SavedListings from './pages/SavedListings';
import Profile from './pages/Profile';
import Messages from './pages/Messages';
import EditListing from './pages/EditListing';
import MyListings from './pages/MyListings';
import Settings from './pages/Settings';
import Friends from './pages/Friends';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Render the main app
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/search" element={<Search />} />
        <Route path="/listing/:listingId" element={<ListingDetail />} />
        <Route path="/create" element={<CreateListing />} />
        <Route path="/saved" element={<SavedListings />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/profile/:section" element={<Profile />} />
        <Route path="/messages" element={<Messages />} />
        <Route path="/listing/:listingId/edit" element={<EditListing />} />
        <Route path="/profile/listings" element={<MyListings />} />
        <Route path="/profile/settings" element={<Settings />} />
        <Route path="/friends" element={<Friends />} />
        <Route path="*" element={<PageNotFound />} />
      </Route>
    </Routes>
  );
};

function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App
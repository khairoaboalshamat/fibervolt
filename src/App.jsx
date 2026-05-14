import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';

import AppLayout from '@/components/layout/AppLayout';
import Dashboard from '@/pages/Dashboard';
import NewSale from '@/pages/NewSale';
import SaleDetail from '@/pages/SaleDetail';
import CalendarPage from '@/pages/CalendarPage';
import Leaderboard from '@/pages/Leaderboard';
import Payouts from '@/pages/Payouts';
import Admin from '@/pages/Admin';
import Clients from '@/pages/Clients';
import Territories from '@/pages/Territories';
import Maps from '@/pages/Maps';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin, user } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      navigateToLogin();
      return null;
    }
  }

  return (
    <Routes>
      <Route element={<AppLayout user={user} />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/new-sale" element={<NewSale />} />
        <Route path="/sale/:id" element={<SaleDetail />} />
        <Route path="/calendar" element={<CalendarPage />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
        <Route path="/payouts" element={<Payouts />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/clients" element={<Clients />} />
        <Route path="/territories" element={<Territories />} />
        <Route path="/maps" element={<Maps />} />
      </Route>
      <Route path="*" element={<PageNotFound />} />
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
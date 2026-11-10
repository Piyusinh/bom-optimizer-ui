import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { UserProvider } from '@/contexts/UserContext';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { IdleTimeoutWarning } from '@/components/auth/IdleTimeoutWarning';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { useVersionCheck } from '@/hooks/useVersionCheck';
import { LoginPage } from '@/pages/LoginPage';
import { NotFound } from '@/pages/NotFound';
import { Dashboard } from '@/pages/Dashboard';
import { AnalyzeBom } from '@/pages/AnalyzeBom';
import { ProductionPersona } from '@/pages/ProductionPersona';
import { Decisions } from '@/pages/Decisions';
import { DataManagement } from '@/pages/DataManagement';
import { AgentChat } from '@/pages/AgentChat';
import { Guide } from '@/pages/Guide';
import { Architecture } from '@/pages/Architecture';
import { AdminUsers } from '@/pages/admin/AdminUsers';
import { AdminRoles } from '@/pages/admin/AdminRoles';
import { AdminPages } from '@/pages/admin/AdminPages';

function App() {
  useVersionCheck();

  return (
    <UserProvider>
      <ErrorBoundary>
        <BrowserRouter>
          <Toaster position="top-right" />
          <IdleTimeoutWarning />
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={<ProtectedRoute requiredPage="/"><Dashboard /></ProtectedRoute>} />
            <Route path="/production" element={<ProtectedRoute requiredPage="/production"><ProductionPersona /></ProtectedRoute>} />
            <Route path="/analyze" element={<ProtectedRoute requiredPage="/analyze"><AnalyzeBom /></ProtectedRoute>} />
            <Route path="/decisions" element={<ProtectedRoute requiredPage="/decisions"><Decisions /></ProtectedRoute>} />
            <Route path="/data" element={<ProtectedRoute requiredPage="/data"><DataManagement /></ProtectedRoute>} />
            <Route path="/agent" element={<ProtectedRoute requiredPage="/agent"><AgentChat /></ProtectedRoute>} />
            <Route path="/guide" element={<ProtectedRoute requiredPage="/"><Guide /></ProtectedRoute>} />
            <Route path="/architecture" element={<ProtectedRoute requiredPage="/"><Architecture /></ProtectedRoute>} />
            <Route path="/admin/users" element={<ProtectedRoute requiredPage="/admin/users"><AdminUsers /></ProtectedRoute>} />
            <Route path="/admin/roles" element={<ProtectedRoute requiredPage="/admin/roles"><AdminRoles /></ProtectedRoute>} />
            <Route path="/admin/pages" element={<ProtectedRoute requiredPage="/admin/pages"><AdminPages /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </ErrorBoundary>
    </UserProvider>
  );
}

export default App;

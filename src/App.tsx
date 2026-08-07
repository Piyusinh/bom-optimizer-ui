import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { UserProvider } from '@/contexts/UserContext';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { IdleTimeoutWarning } from '@/components/auth/IdleTimeoutWarning';
import { LoginPage } from '@/pages/LoginPage';
import { Dashboard } from '@/pages/Dashboard';
import { AnalyzeBom } from '@/pages/AnalyzeBom';
import { Decisions } from '@/pages/Decisions';
import { DataManagement } from '@/pages/DataManagement';
import { Guide } from '@/pages/Guide';
import { Architecture } from '@/pages/Architecture';

function App() {
  return (
    <UserProvider>
      <BrowserRouter>
        <IdleTimeoutWarning />
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<ProtectedRoute requiredPage="/"><Dashboard /></ProtectedRoute>} />
          <Route path="/analyze" element={<ProtectedRoute requiredPage="/analyze"><AnalyzeBom /></ProtectedRoute>} />
          <Route path="/decisions" element={<ProtectedRoute requiredPage="/decisions"><Decisions /></ProtectedRoute>} />
          <Route path="/data" element={<ProtectedRoute requiredPage="/data"><DataManagement /></ProtectedRoute>} />
          <Route path="/guide" element={<ProtectedRoute requiredPage="/"><Guide /></ProtectedRoute>} />
          <Route path="/architecture" element={<ProtectedRoute requiredPage="/"><Architecture /></ProtectedRoute>} />
        </Routes>
      </BrowserRouter>
    </UserProvider>
  );
}

export default App;

import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";
import ProtectedRoute from "./components/ProtectedRoute";

// Public Pages
import LoginPage from "./pages/LoginPage";
import SignUpPage from "./pages/SignUpPage";
import SendSmsTest from './pages/SendSmsTest';
import EmailTest from './pages/EmailTest';
import ZManual from './pages/ZManual';


// HR Pages
import DashboardPage from "./pages/DashboardPage";
import JobPostingPage from "./pages/JobPostingPage";
import CandidatePage from "./pages/CandidatePage";
import JobCandidatesPage from "./pages/JobCandidatesPage";
import ReportsPage from "./pages/ReportsPage";
import ActivityLogPage from "./pages/ActivityLogPage";
import InterviewSchedulePage from "./pages/InterviewSchedulePage";

// Applicant Pages
import DashboardApplicantPage from "./pages/DashboardApplicantPage";
import BrowseJobsPage from "./pages/BrowseJobsPage";
import MyApplicationsPage from "./pages/MyApplicationsPage";
import ApplicantProfilePage from "./pages/ApplicantProfilePage";

// 🆕 Super Admin Pages
import AdminDashboardPage from "./pages/AdminDashboardPage";
import ManageUsersPage from "./pages/ManageUsersPage";
import AdminActivityPage from "./pages/AdminActivityPage";

// Create a wrapper for public routes that redirects if logged in
function PublicRoute({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });
  }, []);

  if (loading) return null;

  if (session) {
    const userRole = session.user?.user_metadata?.role;

    // 🆕 Route to correct dashboard by role
    if (userRole === 'superadmin') {
      return <Navigate to="/admin/dashboard" replace />;
    } else if (userRole === 'hr') {
      return <Navigate to="/hr/dashboard" replace />;
    } else {
      return <Navigate to="/applicant/dashboard" replace />;
    }
  }

  return children;
}

function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontFamily: 'sans-serif'
      }}>
        Loading...
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* ==================== PUBLIC ROUTES ==================== */}
        <Route 
          path="/login" 
          element={
            <PublicRoute>
              <LoginPage />
            </PublicRoute>
          } 
        />

       
        <Route 
          path="/manual" 
          element={
              <ZManual />
          }
        />




        <Route 
          path="/test-sms" 
          element={
            <PublicRoute>
              <SendSmsTest />
            </PublicRoute>
          }
        />

        <Route 
          path="/test-email" 
          element={
            <PublicRoute>
              <EmailTest />
            </PublicRoute>
          }
        />

        <Route 
          path="/signup" 
          element={
            <PublicRoute>
              <SignUpPage />
            </PublicRoute>
          } 
        />

        {/* ==================== ROOT REDIRECT ==================== */}
        <Route 
          path="/" 
          element={
            session ? (
              session.user?.user_metadata?.role === 'superadmin'
                ? <Navigate to="/admin/dashboard" replace />
                : session.user?.user_metadata?.role === 'hr'
                ? <Navigate to="/hr/dashboard" replace />
                : <Navigate to="/applicant/dashboard" replace />
            ) : (
              <Navigate to="/login" replace />
            )
          } 
        />

        {/* ==================== SUPER ADMIN ROUTES ==================== */}
        <Route 
          path="/admin/dashboard" 
          element={
            <ProtectedRoute allowedRoles={['superadmin']}>
              <AdminDashboardPage />
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/admin/users" 
          element={
            <ProtectedRoute allowedRoles={['superadmin']}>
              <ManageUsersPage />
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/admin/activity" 
          element={
            <ProtectedRoute allowedRoles={['superadmin']}>
              <AdminActivityPage />
            </ProtectedRoute>
          } 
        />

        {/* ==================== HR ROUTES ==================== */}
        <Route 
          path="/hr/dashboard" 
          element={
            <ProtectedRoute allowedRoles={['hr']}>
              <DashboardPage />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/hr/activitylog" 
          element={
            <ProtectedRoute allowedRoles={['hr']}>
              <ActivityLogPage />
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/hr/jobs" 
          element={
            <ProtectedRoute allowedRoles={['hr']}>
              <JobPostingPage />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/hr/reports" 
          element={
            <ProtectedRoute allowedRoles={['hr']}>
              <ReportsPage />
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/hr/candidates" 
          element={
            <ProtectedRoute allowedRoles={['hr']}>
              <CandidatePage />
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/hr/jobs/:jobId/candidates" 
          element={
            <ProtectedRoute allowedRoles={['hr']}>
              <JobCandidatesPage />
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/hr/jobs/:jobId/interviews" 
          element={
            <ProtectedRoute allowedRoles={['hr']}>
              <InterviewSchedulePage />
            </ProtectedRoute>
          } 
        />

        {/* ==================== APPLICANT ROUTES ==================== */}
        <Route 
          path="/applicant/dashboard" 
          element={
            <ProtectedRoute allowedRoles={['applicant']}>
              <DashboardApplicantPage />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/applicant/jobs" 
          element={
            <ProtectedRoute allowedRoles={['applicant']}>
              <BrowseJobsPage />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/applicant/applications" 
          element={
            <ProtectedRoute allowedRoles={['applicant']}>
              <MyApplicationsPage />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/applicant/profile" 
          element={
            <ProtectedRoute allowedRoles={['applicant']}>
              <ApplicantProfilePage />
            </ProtectedRoute>
          } 
        />

        {/* ==================== CATCH ALL ==================== */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
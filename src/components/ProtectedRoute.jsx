import { Navigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useEffect, useState } from "react";

function ProtectedRoute({ children, allowedRoles }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // Listen for auth changes (login/logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return null;
  }

  // NOT LOGGED IN
  if (!session) {
    return <Navigate to="/login" replace />;
  }

  const userRole = session.user?.user_metadata?.role;

  // WRONG ROLE
  if (!allowedRoles.includes(userRole)) {
    // 🆕 Route to correct dashboard based on role
    if (userRole === "superadmin") {
      return <Navigate to="/admin/dashboard" replace />;
    } else if (userRole === "hr") {
      return <Navigate to="/hr/dashboard" replace />;
    } else {
      return <Navigate to="/applicant/dashboard" replace />;
    }
  }

  return children;
}

export default ProtectedRoute;
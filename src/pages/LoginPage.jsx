// src/pages/LoginPage.jsx
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import '/src/styles/LoginPage.css';
import { LoginBarGraphIcon, MapNavigationIcon, OpenFolderIcon, LampElectricIcon, BankBuildingIcon } from "../components/icons/CustomIcons";
import { logActivity } from "../lib/logActivity"; 

// Import images from assets folder
import lguLogo from '../assets/lgu-official-seal.png';
import chrmoLogo from '../assets/chrmo-official-seal.png';
function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

 const handleLogin = async (e) => {
  e.preventDefault();
  setError('');

  if (!email || !password) {
    setError('Please fill in all fields');
    return;
  }

  setIsLoading(true);

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      setError(error.message);
      setIsLoading(false);
      return;
    }

    if (data.user) {
      const userRole = data.user.user_metadata?.role || 'applicant';
      console.log('Login successful:', data.user);

      // ✅ pass the user we already have
      await logActivity('login', `${data.user.email} logged in`, {
        user: data.user,
      });

      if (userRole === 'superadmin') {
        navigate('/admin/dashboard');
      } else if (userRole === 'hr') {
        navigate('/hr/dashboard');
      } else {
        navigate('/applicant/dashboard');
      }
    }
  } catch (err) {
    console.error(err);
    setError('An unexpected error occurred');
    setIsLoading(false);
  }
};


  return (
    <div className="login-page-wrapper"> 
    <div className="login-container">
      <div className="bg-decoration">
        <div className="circle circle-1"></div>
        <div className="circle circle-2"></div>
        <div className="circle circle-3"></div>
      </div>

      <div className="main-content">
        <div className="landing-section">
          <div className="landing-content">
            {/* Header with Title and Logos */}
            <div className="landing-header">
              <div className="header-title">
                <h3>City Government of</h3>
                <h1>Iligan</h1>
                <p>Human Resource Management Portal</p>
              </div>
              <div className="header-logos">
                {/* LGU Logo */}
                <div className="circle-logo lgu-logo">
                  <img 
                    src={lguLogo} 
                    alt="LGU Iligan" 
                    className="logo-image"
                  />
                </div>
                {/* CHRMO Logo */}
                <div className="circle-logo chrmo-logo">
                  <img 
                    src={chrmoLogo} 
                    alt="CHRMO" 
                    className="logo-image"
                  />
                </div>
              </div>
            </div>

            <div className="hero-content">
              <h2>Streamlining Public Service Through <span className="highlight">Digital Transformation</span></h2>
              <p className="subtitle">
                CHRMO Iligan - committed to building a competent, professional, and responsive workforce for public service excellence.
              </p>
            </div>

          <div className="features-grid">
  <div className="feature-item">
    <div className="feature-icon" style={{ 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      width: '36px',
      height: '36px',
      flexShrink: 0,
      background: '#eef2ff',
      borderRadius: '8px',
      fontSize: '18px'
    }}>
      <OpenFolderIcon size={20} />
    </div>
    <div>
      <h4>Data Management</h4>
      <p>Centralized storage and organization of applicant records</p>
    </div>
  </div>
  
  <div className="feature-item">
    <div className="feature-icon" style={{ 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      width: '36px',
      height: '36px',
      flexShrink: 0,
      background: '#eef2ff',
      borderRadius: '8px',
      fontSize: '18px'
    }}>
      <LampElectricIcon size={25} style={{ color: '#4f46e5' }} />
    </div>
    <div>
      <h4>Smart Evaluation</h4>
      <p>AI-assisted applicant evaluation and ranking</p>
    </div>
  </div>
  
  <div className="feature-item">
    <div className="feature-icon" style={{ 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      width: '36px',
      height: '36px',
      flexShrink: 0,
      background: '#eef2ff',
      borderRadius: '8px'
    }}>
      <LoginBarGraphIcon size={18} style={{ color: '#4f46e5' }} />
    </div>
    <div>
      <h4>Reports & Analytics</h4>
      <p>HR data insights and compliance reports</p>
    </div>
  </div>
  
  <div className="feature-item">
    <div className="feature-icon" style={{ 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      width: '36px',
      height: '36px',
      flexShrink: 0,
      background: '#eef2ff',
      borderRadius: '8px',
      fontSize: '18px'
    }}>
     <BankBuildingIcon size={22} style={{ color: '#1a3a5c' }} />
    </div>
    <div>
      <h4>CSC Compliance</h4>
      <p>Automated reporting and document management</p>
    </div>
  </div>
</div>

            <div className="lgu-footer">
               <p className="footer-address" style={{ display: 'flex', alignItems: 'center', margin: 0 }}><MapNavigationIcon size={10} style={{ verticalAlign: 'middle'}} />Buhanginan Hills, Pala-o, Iligan City, Philippines</p>
              <p>© 2024 City Government of Iligan - HRMD</p>
            </div>
          </div>
        </div>

        <div className="form-section">
          <div className="form-card">
            <div className="form-header">
              <h2>Welcome Back</h2>
              <p>Login to access your dashboard</p>
            </div>

            {error && <div className="error-message">{error}</div>}

            <form onSubmit={handleLogin}>
              <div className="input-group">
                <label>Email Address</label>
                <input
                  type="email"
                  placeholder="johndoe@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                />
              </div>

              <div className="input-group">
                <label>Password</label>
                <input
                  type="password"
                  placeholder="********"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                />
              </div>

              <div className="register-row">
                <span>Don't have an account? <Link to="/signup">Create one</Link></span>
              </div>

              <div className="login-row">
                <a href="#" className="forgot-link">Forgot Password?</a>
                <button type="submit" className="login-button" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <span className="spinner"></span>
                      Logging in...
                    </>
                  ) : (
                    'Login'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
    </div>
  );
}

export default LoginPage;
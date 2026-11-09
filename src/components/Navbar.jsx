import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import NotificationBell from './NotificationBell';
import { logActivity } from "../lib/logActivity";

import { 
  DashboardIcon, 
  BrowseJobsIcon, 
  MyApplicationsIcon,
  BasiconsArchiveDrawerFillIcon,
  BasiconsArchiveDrawerLineIcon,
  JobsIcon,
  ReportsIcon,
  ProfileIcon,
  LogoutIcon,
  NewspaperIcon,
  BulletedListIcon,
  ApplicationsIcon,
  AccountUserRoundIcon
} from './icons/CustomIcons';
import "../styles/Navbar.css";
import chrmoLogo from '../assets/chrmo-official-seal.png';


function Navbar({ userRole = 'applicant' }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [currentUserRole, setCurrentUserRole] = useState(userRole);

  useEffect(() => {
    const getUserData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        const metadata = session.user?.user_metadata || {};
        let displayName = '';
        if (metadata.first_name && metadata.surname) {
          displayName = `${metadata.first_name} ${metadata.surname}`;
        } else if (metadata.full_name) {
          displayName = metadata.full_name;
        } else {
          displayName = session.user?.email?.split('@')[0] || 'User';
        }
        
        const email = session.user?.email || '';
        const role = metadata.role || 'applicant';
        
        setUserName(displayName);
        setUserEmail(email);
        setCurrentUserRole(role);
      }
    };
    
    getUserData();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        const metadata = session.user?.user_metadata || {};
        let displayName = '';
        if (metadata.first_name && metadata.surname) {
          displayName = `${metadata.first_name} ${metadata.surname}`;
        } else if (metadata.full_name) {
          displayName = metadata.full_name;
        } else {
          displayName = session.user?.email?.split('@')[0] || 'User';
        }
        
        const email = session.user?.email || '';
        const role = metadata.role || 'applicant';
        
        setUserName(displayName);
        setUserEmail(email);
        setCurrentUserRole(role);
      } else {
        setUserName('');
        setUserEmail('');
        setCurrentUserRole('applicant');
      }
    });
    
    return () => subscription.unsubscribe();
  }, []);

  const menuItems = {
    superadmin: [
      { name: 'Dashboard', path: '/admin/dashboard', icon: <DashboardIcon size={18} /> },
      { name: 'Manage Users', path: '/admin/users', icon: <AccountUserRoundIcon size={18} strokeWidth={2} /> },
      { name: 'System Log', path: '/admin/activity', icon: <BasiconsArchiveDrawerLineIcon size={18} /> }
    ],
    hr: [
      { name: 'Dashboard', path: '/hr/dashboard', icon: <DashboardIcon size={18} /> },
      { name: 'Job Postings', path: '/hr/jobs', icon: <JobsIcon size={18} /> },
      { name: 'Applications', path: '/hr/candidates', icon: <ApplicationsIcon size={18} /> },
      { name: 'Reports', path: '/hr/reports', icon: <ReportsIcon size={18} /> }
    ],
    applicant: [
      { name: 'Dashboard', path: '/applicant/dashboard', icon: <DashboardIcon size={18} /> },
      { name: 'Browse Jobs', path: '/applicant/jobs', icon: <BrowseJobsIcon size={18} /> },
      { name: 'My Applications', path: '/applicant/applications', icon: <MyApplicationsIcon size={18} /> }
    ]
  };

  const currentMenu = menuItems[currentUserRole] || menuItems.applicant;

  const getRoleLabel = () => {
    switch (currentUserRole) {
      case 'superadmin': return 'Super Admin';
      case 'hr': return 'HR Personnel';
      default: return 'Job Applicant';
    }
  };

  const getDashboardPath = () => {
    switch (currentUserRole) {
      case 'superadmin': return '/admin/dashboard';
      case 'hr': return '/hr/dashboard';
      default: return '/applicant/dashboard';
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

   const handleLogout = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await logActivity('logout', `${user.email} logged out`, { user });
      }
      await supabase.auth.signOut();
    } catch (error) {
      console.warn('Logout API failed:', error);
    }

    localStorage.clear();
    sessionStorage.clear();
    window.location.replace('/login');
  };

  // ✅ ADD THIS — it's used by nav items
  const isActive = (path) => {
    return location.pathname === path;
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <div className="logo" onClick={() => navigate(getDashboardPath())}>
         <img src={chrmoLogo} alt="CHRMO" className="navbar-logo-image" />
          <span className="logo-text">CHRMO Portal</span>
        </div>

        <button className="mobile-menu-btn" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
          ☰
        </button>

        <div className={`nav-right ${mobileMenuOpen ? 'mobile-open' : ''}`}>
          <span className="role-badge">
            {getRoleLabel()}
          </span>

          <ul className="nav-menu">
            {currentMenu.map(item => (
              <li 
                key={item.name} 
                className={`nav-item ${isActive(item.path) ? 'active' : ''}`}
                onClick={() => {
                  navigate(item.path);
                  setMobileMenuOpen(false);
                }}
              >
                <span>{item.icon}</span>
                <span>{item.name}</span>
              </li>
            ))}
          </ul>

          {currentUserRole === 'applicant' && (
            <div className="bell-wrapper">
              <NotificationBell />
            </div>
          )}

          <div className="gear-container" ref={dropdownRef}>
            <div className="gear-icon" onClick={() => setDropdownOpen(!dropdownOpen)}>
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                viewBox="0 0 640 640" 
                width="24" 
                height="24" 
                fill="currentColor"
              >
                <path d="M259.1 73.5C262.1 58.7 275.2 48 290.4 48L350.2 48C365.4 48 378.5 58.7 381.5 73.5L396 143.5C410.1 149.5 423.3 157.2 435.3 166.3L503.1 143.8C517.5 139 533.3 145 540.9 158.2L570.8 210C578.4 223.2 575.7 239.8 564.3 249.9L511 297.3C511.9 304.7 512.3 312.3 512.3 320C512.3 327.7 511.8 335.3 511 342.7L564.4 390.2C575.8 400.3 578.4 417 570.9 430.1L541 481.9C533.4 495 517.6 501.1 503.2 496.3L435.4 473.8C423.3 482.9 410.1 490.5 396.1 496.6L381.7 566.5C378.6 581.4 365.5 592 350.4 592L290.6 592C275.4 592 262.3 581.3 259.3 566.5L244.9 496.6C230.8 490.6 217.7 482.9 205.6 473.8L137.5 496.3C123.1 501.1 107.3 495.1 99.7 481.9L69.8 430.1C62.2 416.9 64.9 400.3 76.3 390.2L129.7 342.7C128.8 335.3 128.4 327.7 128.4 320C128.4 312.3 128.9 304.7 129.7 297.3L76.3 249.8C64.9 239.7 62.3 223 69.8 209.9L99.7 158.1C107.3 144.9 123.1 138.9 137.5 143.7L205.3 166.2C217.4 157.1 230.6 149.5 244.6 143.4L259.1 73.5zM320.3 400C364.5 399.8 400.2 363.9 400 319.7C399.8 275.5 363.9 239.8 319.7 240C275.5 240.2 239.8 276.1 240 320.3C240.2 364.5 276.1 400.2 320.3 400z"/>
              </svg>
            </div>

            {dropdownOpen && (
              <div className="dropdown-menu">
                <div className="dropdown-header">
                  <div className="dropdown-name">{userName || 'User'}</div>
                  <div 
                    className="dropdown-email"
                    style={{
                      width: '150px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                    title={userEmail || 'user@email.com'}
                  >
                    {userEmail || 'user@email.com'}
                  </div>
                  <div className="dropdown-role">
                    {getRoleLabel()}
                  </div>
                </div>
                
                {currentUserRole === 'applicant' && (
                  <div className="dropdown-item" onClick={() => {
                    navigate('/applicant/profile');
                    setDropdownOpen(false);
                    setMobileMenuOpen(false);
                  }}>
                    <span><ProfileIcon /></span> Profile
                  </div>
                )}
                
                {currentUserRole === 'hr' && (
                  <div className="dropdown-item" onClick={() => {
                    navigate('/hr/activitylog');
                    setDropdownOpen(false);
                    setMobileMenuOpen(false);
                  }}>
                    <span> <BasiconsArchiveDrawerLineIcon size={20} color="#1e293b" /></span> Activity Log
                  </div>
                )}

                
                
                <div className="dropdown-divider"></div>
                
                <div className="dropdown-item" onClick={() => {
                  handleLogout();
                  setDropdownOpen(false);
                }} style={{ color: 'grey' }}>
                  <span><LogoutIcon color="black" /></span> Logout
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
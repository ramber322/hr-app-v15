import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { supabase } from "../lib/supabase";
import "../styles/ActivityLogPage.css";
import activitylogLogo from '../assets/activitylog-new-icon.png';
import { BriefcaseActivityLogIcon, BasiconsArchiveDrawerLineIcon, SyncIcon, UpdatedPencilActivityLogIcon, MailActivityLogIcon, UserAddActivityLogIcon } from "../components/icons/CustomIcons";
import Loader from '../components/Loader';

export default function ActivityLogPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [activities, setActivities] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterAction, setFilterAction] = useState("All");

  useEffect(() => {
    loadActivityLog();
  }, []);

  const loadActivityLog = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/login');
        return;
      }

      const activitiesList = [];

      // 1. Get recent job postings (created/updated)
      const { data: jobs, error: jobsError } = await supabase
        .from('job_postings')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (!jobsError && jobs) {
        jobs.forEach(job => {
          activitiesList.push({
            id: `job-${job.id}`,
            type: 'job_created',
            action: 'Job Created',
            description: `Created job posting: "${job.position_title}"`,
            user: 'System',
            userRole: 'hr',
            timestamp: job.created_at || job.opening_date,
            details: { job_id: job.id, position: job.position_title },
          });

          if (job.updated_at && job.updated_at !== job.created_at) {
            activitiesList.push({
              id: `job-update-${job.id}`,
              type: 'job_updated',
              action: 'Job Updated',
              description: `Updated job posting: "${job.position_title}"`,
              user: 'System',
              userRole: 'hr',
              timestamp: job.updated_at,
              details: { job_id: job.id, position: job.position_title },
            });
          }
        });
      }

      // 2. Get recent applications
      const { data: applications, error: appsError } = await supabase
        .from('applications')
        .select('*, job_postings(position_title)')
        .order('applied_date', { ascending: false })
        .limit(30);

      if (!appsError && applications) {
        applications.forEach(app => {
          // Application submitted
          activitiesList.push({
            id: `app-${app.id}`,
            type: 'application_submitted',
            action: 'Application Submitted',
            description: `Applied for "${app.job_postings?.position_title || 'a position'}"`,
            user: 'Applicant',
            userRole: 'applicant',
            timestamp: app.applied_date,
            details: { job_id: app.job_id, status: app.status },
          });

          // Status change (if updated_at differs from applied_date)
          if (app.updated_at && app.updated_at !== app.applied_date) {
            activitiesList.push({
              id: `app-status-${app.id}`,
              type: 'status_update',
              action: 'Status Updated',
              description: `Application for "${app.job_postings?.position_title || 'a position'}" changed to ${app.status}`,
              user: 'HR',
              userRole: 'hr',
              timestamp: app.updated_at,
              details: { job_id: app.job_id, status: app.status },
            });
          }
        });
      }

      // 3. Get recent applicants (new registrations)
      const { data: applicants, error: applicantsError } = await supabase
        .from('applicants')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (!applicantsError && applicants) {
        applicants.forEach(app => {
          activitiesList.push({
            id: `applicant-${app.id}`,
            type: 'user_registered',
            action: 'User Registered',
            description: `New applicant registered: "${app.full_name}"`,
            user: app.full_name || 'New User',
            userRole: 'applicant',
            timestamp: app.created_at,
            details: { user_id: app.id },
          });
        });
      }

      // Sort by timestamp (most recent first)
      activitiesList.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      setActivities(activitiesList);
    } catch (error) {
      console.error('Error loading activity log:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActionColor = (type) => {
    const colors = {
      job_created: '#10b981',
      job_updated: '#3b82f6',
      application_submitted: '#8b5cf6',
      status_update: '#f59e0b',
      user_registered: '#06b6d4',
    };
    return colors[type] || '#6c757d';
  };
  const getActionIcon = (type) => {
    const icons = {
        job_created: <BriefcaseActivityLogIcon size={18} color="#2e9a55" />,
      job_updated: <UpdatedPencilActivityLogIcon size={18} color="#4F46E5" />,
      application_submitted: <MailActivityLogIcon size={18} style={{ color: '#1a56db' }} />,
      status_update: <SyncIcon size={18} color="#968309" />,
      user_registered: <UserAddActivityLogIcon size={18} style={{ color: '#1a56db' }} />,
    };
    return icons[type] || '📋';
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const actionTypes = [
    { value: 'All', label: 'All Actions' },
    { value: 'job_created', label: 'Job Created' },
    { value: 'job_updated', label: 'Job Updated' },
    { value: 'application_submitted', label: 'Application Submitted' },
    { value: 'status_update', label: 'Status Updated' },
    { value: 'user_registered', label: 'User Registered' },
  ];

  const filteredActivities = activities
    .filter(activity => {
      const matchesSearch = activity.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           activity.user.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesAction = filterAction === "All" || activity.type === filterAction;
      return matchesSearch && matchesAction;
    });

  const styles = `
    .activity-container {
      padding-top: 80px;
      padding-left: 24px;
      padding-right: 24px;
      background: #f5f6f8;
      min-height: 100vh;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }

    .page-header {
      margin-bottom: 24px;
    }

    .page-header h1 {
      margin: 0;
      font-size: 28px;
      color: #1a1f36;
    }

    .page-header p {
      color: #6c757d;
      margin-top: 4px;
      font-size: 14px;
    }

    .controls {
      background: white;
      border-radius: 12px;
      padding: 16px 20px;
      margin-bottom: 20px;
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      align-items: center;
      box-shadow: 0 1px 3px rgba(0,0,0,0.08);
    }

    .search-input {
      flex: 1;
      min-width: 200px;
      padding: 8px 14px;
      border: 1px solid #dee2e6;
      border-radius: 8px;
      font-size: 14px;
    }

    .search-input:focus {
      outline: none;
      border-color: #4f46e5;
      box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
    }

    .filter-select {
      padding: 8px 14px;
      border: 1px solid #dee2e6;
      border-radius: 8px;
      background: white;
      font-size: 13px;
      cursor: pointer;
    }

    .filter-select:focus {
      outline: none;
      border-color: #4f46e5;
    }

    .activity-count {
      font-size: 13px;
      color: #6c757d;
      margin-left: auto;
    }

    .activity-list {
      background: white;
      border-radius: 12px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.08);
      overflow: hidden;
    }

    .activity-item {
      display: flex;
      align-items: flex-start;
      padding: 16px 20px;
      border-bottom: 1px solid #f0f0f0;
      transition: all 0.2s;
    }

    .activity-item:hover {
      background: #f8f9fa;
    }

    .activity-item:last-child {
      border-bottom: none;
    }

    .activity-icon {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      flex-shrink: 0;
      margin-right: 14px;
      background: #f3f4f6;
    }

    .activity-content {
      flex: 1;
      min-width: 0;
    }

    .activity-description {
      font-size: 14px;
      color: #1a1f36;
      font-weight: 500;
    }

    .activity-user {
      font-size: 12px;
      color: #6c757d;
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 2px;
    }

    .activity-user .role-badge {
      font-size: 10px;
      padding: 1px 8px;
      border-radius: 10px;
      font-weight: 600;
      background: #e9ecef;
      color: #6c757d;
    }

    .activity-user .role-badge.hr {
      background: #e3f2fd;
      color: #1565c0;
    }

    .activity-user .role-badge.applicant {
      background: #e8f5e9;
      color: #2e7d32;
    }

    .activity-time {
      font-size: 12px;
      color: #adb5bd;
      white-space: nowrap;
      margin-left: 12px;
    }

    .loading-state {
      text-align: center;
      padding: 60px;
      color: #6c757d;
    }

    .empty-state {
      text-align: center;
      padding: 40px;
      color: #6c757d;
    }

    .empty-state .icon {
      font-size: 40px;
      margin-bottom: 8px;
      display: block;
    }

    .activity-type-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      display: inline-block;
      margin-right: 8px;
    }

    @media (max-width: 768px) {
      .activity-container { padding: 16px; padding-top: 80px; }
      .controls { flex-direction: column; align-items: stretch; }
      .search-input { width: 100%; }
      .activity-count { text-align: right; }
      .activity-item { flex-wrap: wrap; }
      .activity-time { margin-left: 0; width: 100%; margin-top: 4px; }
    }
  `;

  if (loading) {
    return (
      <>
        <Navbar userRole="hr" />
        <div className="activity-container">
          <style>{styles}</style>
          <Loader/>
          <div className="loading-state">Loading activity log...</div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar userRole="hr" />
      <div className="activity-container">
        <style>{styles}</style>

        <div className="page-header" >
      <h1 style={{ display: "flex", alignItems: "center", gap: "10px", margin: 0, fontSize: "28px", color: "#1a1f36" }}>
  <BasiconsArchiveDrawerLineIcon size={32} color="#1a3a5c" />
  Activity Logs
</h1>
          <p>Track actions made within the system</p>
        </div>

        <div className="controls">
          <input
            type="text"
            className="search-input"
            placeholder="Search by user or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <select
            className="filter-select"
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
          >
            {actionTypes.map((action) => (
              <option key={action.value} value={action.value}>
                {action.label}
              </option>
            ))}
          </select>
          <span className="activity-count">{filteredActivities.length} activities</span>
        </div>

        <div className="activity-list">
          {filteredActivities.length === 0 ? (
            <div className="empty-state">
              <span className="icon">📭</span>
              No activities found
            </div>
          ) : (
            filteredActivities.map((activity) => (
              <div key={activity.id} className="activity-item">
                <div 
                  className="activity-icon" 
                  style={{ background: `${getActionColor(activity.type)}20` }}
                >
                  {getActionIcon(activity.type)}
                </div>
                <div className="activity-content">
                  <div className="activity-description">
                    <span 
                      className="activity-type-dot" 
                      style={{ background: getActionColor(activity.type) }}
                    ></span>
                    {activity.description}
                  </div>
                  <div className="activity-user">
                    {activity.user}
                    <span className={`role-badge ${activity.userRole}`}>
                      {activity.userRole === 'hr' ? 'HR' : 'Applicant'}
                    </span>
                    <span style={{ color: '#adb5bd', marginLeft: 4 }}>
                      • {activity.action}
                    </span>
                  </div>
                </div>
                <div className="activity-time">{formatTimestamp(activity.timestamp)}</div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
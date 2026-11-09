import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { supabase } from "../lib/supabase";
import Loader from "../components/Loader";

import {
  BasiconsHrIcon,
  LogoutIcon,
  BasiconsLock,
  BasiconsApplicantIcon,
  BriefcaseActivityLogIcon,
  UpdatedPencilActivityLogIcon,
  MailActivityLogIcon,
  SyncIcon,
  BasiconsArchiveDrawerLineIcon,
  UserAddActivityLogIcon,
  BasiconsPencilIcon,
} from "../components/icons/CustomIcons";

export default function AdminDashboardPage() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);

  const [stats, setStats] = useState({
    hrStaff: 0,
    applicants: 0,
    activeJobs: 0,
    totalUsers: 0,
  });

  const [recentActivity, setRecentActivity] = useState([]);

  useEffect(() => {
    loadAdminData();
  }, []);

  const loadAdminData = async () => {
    setLoading(true);

    try {
      let hrCount = 0;
      let applicantCount = 0;

      const { data: users, error: usersError } =
        await supabase.rpc("list_all_users");

      if (!usersError && users) {
        hrCount = users.filter((u) => u.role === "hr").length;
        applicantCount = users.filter(
          (u) => u.role === "applicant"
        ).length;
      } else {
        const { data: hrData } =
          await supabase.rpc("list_hr_users");

        hrCount = hrData?.length ?? 0;
      }

      const { count: jobsCount } = await supabase
        .from("job_postings")
        .select("*", { count: "exact", head: true })
        .eq("status", "OPEN");

      const { data: logs } = await supabase
        .from("activity_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(6);

      setStats({
        hrStaff: hrCount,
        applicants: applicantCount,
        activeJobs: jobsCount || 0,
        totalUsers: hrCount + applicantCount,
      });

      setRecentActivity(logs ?? []);
    } catch (error) {
      console.error("Error loading admin data:", error);
    } finally {
      setLoading(false);
    }
  };

  // --------------------------------
  // ACTIVITY HELPERS
  // --------------------------------

  const getActionColor = (type) => {
    const colors = {
      job_created: "#10B981",
      job_updated: "#6366F1",
      job_deleted: "#EF4444",
      application_submitted: "#8B5CF6",
      status_update: "#F59E0B",
      user_registered: "#06B6D4",
      user_updated: "#0EA5E9",
      password_reset: "#F97316",
      login: "#0EA5E9",
      logout: "#64748B",
    };

    return colors[type] ?? "#64748B";
  };

  const getActionIcon = (type) => {
  const icons = {
    job_created: (
      <BriefcaseActivityLogIcon size={15} color="#10B981" />
    ),
    job_updated: (
      <UpdatedPencilActivityLogIcon size={15} color="#6366F1" />
    ),
    job_deleted: (
      <BriefcaseActivityLogIcon size={15} color="#EF4444" />
    ),
    application_submitted: (
      <MailActivityLogIcon size={15} color="#8B5CF6" />
    ),
    status_update: (
      <SyncIcon size={15} color="#F59E0B" />
    ),
    user_registered: (
      <UserAddActivityLogIcon size={15} color="#06B6D4" />
    ),
    user_updated: (
      <BasiconsPencilIcon size={15} color="#0EA5E9" />
    ),
    password_reset: (
      <BasiconsLock size={15} color="#F97316" />
    ),
    login: (
      <UserAddActivityLogIcon size={15} color="#0EA5E9" />
    ),
    logout: (
      <LogoutIcon size={15} color="#64748B" />
    ),
  };

  return icons[type] || <span>•</span>;
};

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return "";

    const date = new Date(timestamp);
    const diff = Date.now() - date.getTime();

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  // --------------------------------
  // DASHBOARD CARDS
  // --------------------------------

  const statCards = [
    {
      label: "Total Users",
      value: stats.totalUsers,
      description: "Registered accounts",
      icon: <BasiconsApplicantIcon size={20} color="#6a7674" />,
      color: "#818CF8",
      background: "rgba(99, 102, 241, 0.12)",
      percentage: "USER BASE",
    },
    {
      label: "HR Staff",
      value: stats.hrStaff,
      description: "HR team accounts",
      icon: <BasiconsHrIcon size={20} color="rgb(79, 70, 229)" />,
      color: "#2DD4BF",
      background: "rgba(99, 102, 241, 0.12)",
      percentage: "TEAM",
    },
    {
      label: "Applicants",
      value: stats.applicants,
      description: "Registered candidates",
      icon: <BasiconsApplicantIcon size={20} color="#2DD4BF" />,
      color: "#38BDF8",
      background: "rgba(56, 189, 248, 0.12)",
      percentage: "TALENT POOL",
    },
    {
      label: "Active Jobs",
      value: stats.activeJobs,
      description: "Currently open positions",
      icon: <BriefcaseActivityLogIcon size={20} color="#FBBF24" />,
      color: "#FBBF24",
      background: "rgba(251, 191, 36, 0.12)",
      percentage: "RECRUITMENT",
    },
  ];

  // --------------------------------
  // LOADING
  // --------------------------------

  if (loading) {
    return (
      <>
        <Navbar userRole="superadmin" />

        <div className="admin-loading">
          <Loader />
        </div>

        <style>{`
          .admin-loading {
            min-height: 75vh;
            display: flex;
            justify-content: center;
            align-items: center;
            background: #F7F8FC;
          }
        `}</style>
      </>
    );
  }

  // --------------------------------
  // MAIN DASHBOARD
  // --------------------------------

  return (
    <>
      <Navbar userRole="superadmin" />

      <div className="admin-dashboard">

        {/* PAGE HEADER */}

        <header className="dashboard-header">

          <div>

            <h1>
              System Overview
            </h1>

            <p>
              Create HR accounts, manage users, monitor logs
            </p>
          </div>

          <button
            className="refresh-button"
            onClick={loadAdminData}
            title="Refresh dashboard"
          >
            <SyncIcon size={15} color="currentColor" />
            Refresh data
          </button>

        </header>

        {/* STATISTICS */}

        <section className="stats-section">

          <div className="section-heading">
            <div>
              <h2>Platform metrics</h2>
            </div>

            <span className="live-status">
              <span />
              Live overview
            </span>
          </div>

          <div className="stats-grid">

            {statCards.map((card, index) => (
              <div
                className="stat-card"
                key={card.label}
                style={{
                  "--accent": card.color,
                  "--accent-bg": card.background,
                  animationDelay: `${index * 80}ms`,
                }}
              >
                <div className="stat-card-top">

                  <div className="stat-icon">
                    {card.icon}
                  </div>

                  <span className="stat-category">
                    {card.percentage}
                  </span>

                </div>

                <div className="stat-value">
                  {card.value.toLocaleString()}
                </div>

                <div className="stat-label">
                  {card.label}
                </div>

                <div className="stat-description">
                  {card.description}
                </div>


              </div>
            ))}

          </div>
        </section>

        {/* MAIN CONTENT */}

        <section className="dashboard-content">

          {/* RECENT ACTIVITY */}

          <div className="activity-panel">

            <div className="panel-header">

              <div>
               

                <h2>Recent activity</h2>

                <p>
                  The latest events across your platform.
                </p>
              </div>

              <button
                className="view-all-button"
                onClick={() => navigate("/admin/activity")}
              >
                View all
              </button>

            </div>

            <div className="activity-list">

              {recentActivity.length === 0 ? (

                <div className="empty-activity">
                  <div className="empty-icon">
                    <BriefcaseActivityLogIcon
                      size={25}
                      color="#94A3B8"
                    />
                  </div>

                  <h3>No activity yet</h3>

                  <p>
                    New platform events will appear here.
                  </p>
                </div>

              ) : (

                recentActivity.map((log, index) => (

                  <div
                    className="activity-item"
                    key={log.id}
                    style={{
                      animationDelay: `${index * 60}ms`,
                    }}
                  >

                    <div
                      className="activity-icon"
                      style={{
                        "--activity-color": getActionColor(
                          log.action
                        ),
                      }}
                    >
                      {getActionIcon(log.action)}
                    </div>

                    <div className="activity-details">

                      <div className="activity-description">
                        {log.description}
                      </div>

                      <div className="activity-meta">
                        <span>{log.user_email || "System"}</span>
                        <span className="meta-dot">·</span>
                        <span>
                          {formatTimestamp(log.created_at)}
                        </span>
                      </div>

                    </div>

                    <div className="activity-arrow">
                      ↗
                    </div>

                  </div>

                ))

              )}

            </div>

            <button
              className="activity-footer"
              onClick={() => navigate("/admin/activity")}
            >
              Open activity log
              <span>→</span>
            </button>

          </div>

          {/* QUICK ACTIONS */}

          <aside className="quick-actions-panel">

            <div className="panel-header quick-header">
              <div>
                <span className="section-kicker">
                  SHORTCUTS
                </span>

                <h2>Quick actions</h2>

                <p>
                  Jump straight into management.
                </p>
              </div>
            </div>

            <div className="quick-actions-list">

              <button
                className="quick-action primary-action"
                onClick={() => navigate("/admin/users")}
              >
                <div
  className="quick-action-icon"
  style={{ background: 'rgba(79, 70, 229, 0.12)' }}
>
  <BasiconsHrIcon size={19} color="rgb(79, 70, 229)" />
</div>

                <div className="quick-action-text">
                  <strong>Manage HR accounts</strong>
                  <span>Manage your HR team</span>
                </div>

                <span className="quick-arrow">↗</span>
              </button>

              <button
                className="quick-action"
                onClick={() => navigate("/admin/activity")}
              >
                <div className="quick-action-icon">
                  <BasiconsArchiveDrawerLineIcon
                    size={19}
                    color="#6a7674"
                  />
                </div>

                <div className="quick-action-text">
                  <strong>System activity</strong>
                  <span>Review platform events</span>
                </div>

                <span className="quick-arrow">↗</span>
              </button>

              <button
                className="quick-action"
                onClick={() => navigate("/admin/users")}
              >
                <div
  className="quick-action-icon"
  style={{ background: 'rgba(45, 212, 191, 0.15)' }}
>
  <BasiconsApplicantIcon size={19} color="#2DD4BF" />
</div>

                <div className="quick-action-text">
                  <strong>View all users</strong>
                  <span>Browse registered accounts</span>
                </div>

                <span className="quick-arrow">↗</span>
              </button>

            </div>

            {/* SYSTEM STATUS */}

            <div className="system-status">

              <div className="system-status-icon">
                <span />
              </div>

              <div>
                <strong>Platform overview</strong>
                <p>Dashboard data loaded successfully</p>
              </div>

            </div>

          </aside>

        </section>

        {/* FOOTER */}

        <footer className="dashboard-footer">
          <span>ADMINISTRATION</span>
          <span>HR MANAGEMENT SYSTEM</span>
        </footer>

      </div>

      {/* DASHBOARD STYLES */}

    <style>{`

        /* ================================
           GLOBAL
        ================================= */

        .admin-dashboard {
          --primary: #5146E5;
          --primary-dark: #3730A3;
          --text: #172033;
          --muted: #8B95A7;
          --border: #EDF0F5;
          --surface: #FFFFFF;

          max-width: 1440px;
          margin: 0 auto;
          padding: 105px 42px 40px;
          color: var(--text);
          font-family: inherit;
          box-sizing: border-box;
        }

        .admin-dashboard *,
        .admin-dashboard *::before,
        .admin-dashboard *::after {
          box-sizing: border-box;
        }

        /* ================================
           HEADER
        ================================= */

        .dashboard-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          gap: 20px;
          margin-bottom: 30px;
        }

        .dashboard-header h1 {
          font-size: clamp(27px, 3vw, 36px);
          letter-spacing: -1.7px;
          font-weight: 800;
          margin: 0;
          color: #172033;
        }

        .dashboard-header h1 span {
          color: #635BDF;
        }

        .dashboard-header p {
          margin: 9px 0 0;
          font-size: 13px;
          color: #8791A3;
          line-height: 1.6;
        }

        .refresh-button {
          display: flex;
          align-items: center;
          gap: 9px;
          padding: 11px 16px;
          background: white;
          color: #525D70;
          border: 1px solid #E8EBF2;
          border-radius: 9px;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          transition: all .2s ease;
          white-space: nowrap;
        }

        .refresh-button:hover {
          border-color: #A5A0F3;
          color: #5146E5;
          background: #F8F7FF;
          transform: translateY(-2px);
        }

        /* ================================
           SECTION HEADINGS
        ================================= */

        .section-heading {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          margin-bottom: 16px;
        }

        .section-kicker {
          display: block;
          color: #9AA3B4;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 1.5px;
          margin-bottom: 6px;
        }

        .section-heading h2,
        .panel-header h2 {
          color: #1E293B;
          font-size: 17px;
          letter-spacing: -.4px;
          font-weight: 800;
          margin: 0;
        }

        .live-status {
          display: flex;
          align-items: center;
          gap: 7px;
          font-size: 10px;
          font-weight: 700;
          color: #7C899C;
        }

        .live-status span {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #10B981;
          box-shadow: 0 0 0 4px #10B98115;
        }

        /* ================================
           STATISTICS
        ================================= */

        .stats-section {
          margin-bottom: 35px;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 15px;
        }

        .stat-card {
          position: relative;
          background: white;
          padding: 20px;
          border: 1px solid #EDF0F5;
          border-radius: 12px;
          overflow: hidden;
          transition: transform .25s ease, box-shadow .25s ease;
          animation: slideUp .45s ease both;
        }

        .stat-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 30px rgba(31,41,75,.07);
        }

        .stat-card-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 19px;
        }

        .stat-icon {
          width: 39px;
          height: 39px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 10px;
          background: var(--accent-bg);
        }

        .stat-category {
          font-size: 8px;
          font-weight: 800;
          letter-spacing: 1px;
          color: #A2AABA;
        }

        .stat-value {
          color: #1E293B;
          font-size: 32px;
          font-weight: 800;
          letter-spacing: -1.5px;
          line-height: 1.1;
        }

        .stat-label {
          margin-top: 7px;
          font-size: 12px;
          font-weight: 800;
          color: #475569;
        }

        .stat-description {
          margin-top: 5px;
          color: #A0A9B8;
          font-size: 10px;
        }

        .stat-bottom-line {
          position: absolute;
          left: 0;
          bottom: 0;
          width: 100%;
          height: 3px;
          background: var(--accent);
          opacity: .8;
          transform: scaleX(.22);
          transform-origin: left;
          transition: transform .3s ease;
        }

        .stat-card:hover .stat-bottom-line {
          transform: scaleX(1);
        }

        /* ================================
           MAIN CONTENT GRID
        ================================= */

        .dashboard-content {
          display: grid;
          grid-template-columns: minmax(0, 1.8fr) minmax(280px, 1fr);
          gap: 16px;
          align-items: stretch;
        }

        .activity-panel,
        .quick-actions-panel {
          background: white;
          border: 1px solid #EDF0F5;
          border-radius: 13px;
          overflow: hidden;
          min-width: 0;
        }

        .panel-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 15px;
          padding: 21px 22px 17px;
          border-bottom: 1px solid #F0F2F6;
        }

        .panel-header p {
          margin: 6px 0 0;
          font-size: 11px;
          color: #9AA3B4;
        }

        .view-all-button {
          display: flex;
          align-items: center;
          gap: 9px;
          border: 0;
          background: #F3F2FF;
          color: #5B52D6;
          border-radius: 6px;
          padding: 9px 12px;
          font-size: 10px;
          font-weight: 800;
          cursor: pointer;
          white-space: nowrap;
          transition: all .2s;
        }

        .view-all-button:hover {
          background: #E7E5FF;
        }

        /* ================================
           ACTIVITY
        ================================= */

        .activity-list {
          min-height: 250px;
        }

        .activity-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 13px 22px;
          border-bottom: 1px solid #F3F5F8;
          transition: background .2s;
          animation: slideUp .35s ease both;
        }

        .activity-item:hover {
          background: #FAFAFF;
        }

        .activity-icon {
          flex-shrink: 0;
          width: 36px;
          height: 36px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: color-mix(
            in srgb,
            var(--activity-color) 11%,
            white
          );
        }

        .activity-details {
          flex: 1;
          min-width: 0;
        }

        .activity-description {
          color: #334155;
          font-size: 11px;
          font-weight: 700;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .activity-meta {
          display: flex;
          align-items: center;
          gap: 6px;
          color: #A0A9B8;
          font-size: 9px;
          margin-top: 5px;
          overflow: hidden;
        }

        .activity-meta span:first-child {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .meta-dot {
          color: #CBD5E1;
        }

        .activity-arrow {
          color: #C1C8D4;
          font-size: 14px;
          opacity: 0;
          transition: opacity .2s;
        }

        .activity-item:hover .activity-arrow {
          opacity: 1;
        }

        .empty-activity {
          min-height: 250px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
        }

        .empty-icon {
          width: 55px;
          height: 55px;
          background: #F4F5FA;
          border-radius: 15px;
          display: flex;
          justify-content: center;
          align-items: center;
          margin-bottom: 12px;
        }

        .empty-activity h3 {
          margin: 0;
          font-size: 13px;
          color: #475569;
        }

        .empty-activity p {
          font-size: 10px;
          color: #A0A9B8;
        }

        .activity-footer {
          width: 100%;
          padding: 13px 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: #FAFBFD;
          border: 0;
          border-top: 1px solid #F0F2F6;
          color: #68758A;
          font-size: 10px;
          font-weight: 800;
          cursor: pointer;
          transition: all .2s;
        }

        .activity-footer:hover {
          background: #F3F2FF;
          color: #5146E5;
        }

        .activity-footer span {
          font-size: 15px;
        }

        /* ================================
           QUICK ACTIONS
        ================================= */

        .quick-actions-panel {
          padding-bottom: 16px;
        }

        .quick-header {
          border-bottom: 0;
          padding-bottom: 13px;
        }

        .quick-actions-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
          padding: 0 16px;
        }

        .quick-action {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 11px;
          padding: 13px 11px;
          border: 1px solid #EDF0F5;
          border-radius: 9px;
          background: white;
          text-align: left;
          cursor: pointer;
          transition: all .2s ease;
        }

        .quick-action:hover {
          background: #F8F8FF;
          border-color: #DCD9FF;
          transform: translateX(3px);
        }

        .quick-action-icon {
          width: 37px;
          height: 37px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #F3F4F9;
          border-radius: 9px;
          flex-shrink: 0;
        }

        .quick-action-text {
          flex: 1;
          min-width: 0;
        }

        .quick-action-text strong {
          display: block;
          font-size: 10px;
          color: #334155;
          font-weight: 800;
        }

        .quick-action-text span {
          display: block;
          font-size: 9px;
          color: #9AA3B4;
          margin-top: 4px;
        }

        .quick-arrow {
          font-size: 15px;
          color: #A5ACBA;
          transition: transform .2s;
        }

        .quick-action:hover .quick-arrow {
          transform: translate(2px, -2px);
          color: #5146E5;
        }

        /* ================================
           SYSTEM STATUS
        ================================= */

        .system-status {
          display: flex;
          align-items: center;
          gap: 11px;
          margin: 17px 16px 0;
          padding: 13px;
          border: 1px solid #E5F5ED;
          border-radius: 9px;
          background: #F5FCF8;
        }

        .system-status-icon {
          width: 30px;
          height: 30px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #DCFCE7;
          border-radius: 8px;
          flex-shrink: 0;
        }

        .system-status-icon span {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #16A34A;
          box-shadow: 0 0 0 4px #16A34A20;
        }

        .system-status strong {
          display: block;
          font-size: 10px;
          color: #166534;
          font-weight: 800;
        }

        .system-status p {
          font-size: 9px;
          color: #72A78A;
          margin: 4px 0 0;
        }

        /* ================================
           FOOTER
        ================================= */

        .dashboard-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-top: 25px;
          margin-top: 22px;
          border-top: 1px solid #E9EDF3;
          color: #ADB5C2;
          font-size: 8px;
          font-weight: 800;
          letter-spacing: 1.3px;
        }

        /* ================================
           ANIMATIONS
        ================================= */

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }

          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* ================================
           RESPONSIVE
        ================================= */

        @media (max-width: 1000px) {
          .admin-dashboard {
            padding-left: 25px;
            padding-right: 25px;
          }

          .stats-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .dashboard-content {
            grid-template-columns: 1fr;
          }

          .quick-actions-list {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .system-status {
            margin-top: 14px;
          }
        }

        @media (max-width: 650px) {
          .admin-dashboard {
            padding: 95px 16px 25px;
          }

          .dashboard-header {
            align-items: flex-start;
            flex-direction: column;
            gap: 16px;
          }

          .dashboard-header h1 {
            font-size: 29px;
          }

          .stats-grid {
            gap: 10px;
          }

          .stat-card {
            padding: 15px;
          }

          .stat-value {
            font-size: 27px;
          }

          .stat-category {
            font-size: 7px;
            letter-spacing: .5px;
          }

          .section-heading {
            align-items: center;
          }

          .live-status {
            font-size: 9px;
          }

          .panel-header {
            padding: 17px 15px;
          }

          .activity-item {
            padding: 12px 15px;
            gap: 9px;
          }

          .activity-icon {
            width: 32px;
            height: 32px;
          }

          .activity-description {
            font-size: 10px;
          }

          .activity-meta {
            font-size: 8px;
          }

          .quick-actions-list {
            grid-template-columns: 1fr;
          }

          .dashboard-footer {
            font-size: 7px;
            letter-spacing: .7px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .admin-dashboard *,
          .admin-dashboard *::before,
          .admin-dashboard *::after {
            animation-duration: .01ms !important;
            transition-duration: .01ms !important;
          }
        }

      `}</style>
    </>
  );
}
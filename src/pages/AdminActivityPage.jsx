import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { supabase } from "../lib/supabase";
import {
  BriefcaseActivityLogIcon,
  BasiconsPencilIcon,
  BasiconsLock,
  SyncIcon,
  UpdatedPencilActivityLogIcon,
  MailActivityLogIcon,
  UserAddActivityLogIcon,
  BasiconsArchiveDrawerLineIcon,
  LogoutIcon
} from "../components/icons/CustomIcons";
import Loader from "../components/Loader";

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
      if (!user) { navigate("/login"); return; }

      const [logsRes, namesRes] = await Promise.all([
        supabase
          .from("activity_logs")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(200),
        supabase.rpc("get_user_names"),
      ]);

      if (logsRes.error) throw logsRes.error;
      if (namesRes.error) throw namesRes.error;

      const nameByEmail = {};
      (namesRes.data ?? []).forEach((u) => {
        nameByEmail[u.email?.toLowerCase()] = u.full_name;
      });

      setActivities(
        (logsRes.data ?? []).map((row) => ({
          id: row.id,
          type: row.action,
          action: row.action,
          description: row.description,
          user:
            nameByEmail[row.user_email?.toLowerCase()] ||
            row.user_email ||
            "System",
          userEmail: row.user_email || null,
          userRole: row.user_role ?? "user",
          timestamp: row.created_at,
        }))
      );
    } catch (err) {
      console.error("Error loading activity log:", err);
    } finally {
      setLoading(false);
    }
  };

  const getActionColor = (type) =>
    ({
      job_created: "#10b981",
      job_updated: "#3b82f6",
      job_deleted: "#ef4444",
      application_submitted: "#8b5cf6",
      status_update: "#f59e0b",
      user_registered: "#06b6d4",
      user_updated: "#0EA5E9",
      password_reset: "#f97316",
      login: "#0ea5e9",
      logout: "#64748b",
    }[type] ?? "#6c757d");

  const getActionIcon = (type) => {
    const icons = {
      job_created: <BriefcaseActivityLogIcon size={18} color="#2e9a55" />,
      job_updated: <UpdatedPencilActivityLogIcon size={18} color="#4F46E5" />,
      job_deleted: <BriefcaseActivityLogIcon size={18} color="#dc2626" />,
      application_submitted: <MailActivityLogIcon size={18} style={{ color: "#1a56db" }} />,
      status_update: <SyncIcon size={18} color="#968309" />,
      user_registered: <UserAddActivityLogIcon size={18} style={{ color: "#1a56db" }} />,
      password_reset: <BasiconsLock size={18} color="#f97316" />,
      login: <UserAddActivityLogIcon size={18} style={{ color: "#0ea5e9" }} />,
      logout: <LogoutIcon size={18} style={{ color: "#64748b" }} />,
      user_updated: <BasiconsPencilIcon size={18} color="#0ea5e9" />,
    };
    return icons[type] || "📋";
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return "N/A";
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
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
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const actionTypes = [
    { value: "All", label: "All Actions" },
    { value: "job_created", label: "Job Created" },
    { value: "job_updated", label: "Job Updated" },
    { value: "job_deleted", label: "Job Deleted" },
    { value: "application_submitted", label: "Application Submitted" },
    { value: "status_update", label: "Status Updated" },
    { value: "user_registered", label: "User Registered" },
    { value: "login", label: "Login" },
    { value: "logout", label: "Logout" },
  ];

  const filteredActivities = activities.filter((activity) => {
    const matchesSearch =
      activity.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      activity.user?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      activity.userEmail?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesAction =
      filterAction === "All" || activity.type === filterAction;
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
    .page-header { margin-bottom: 24px; }
    .page-header h1 { margin: 0; font-size: 28px; color: #1a1f36; }
    .page-header p { color: #6c757d; margin-top: 4px; font-size: 14px; }
    .controls {
      background: white; border-radius: 12px; padding: 16px 20px; margin-bottom: 20px;
      display: flex; flex-wrap: wrap; gap: 12px; align-items: center;
      box-shadow: 0 1px 3px rgba(0,0,0,0.08);
    }
    .search-input {
      flex: 1; min-width: 200px; padding: 8px 14px;
      border: 1px solid #dee2e6; border-radius: 8px; font-size: 14px;
    }
    .search-input:focus {
      outline: none; border-color: #4f46e5;
      box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
    }
    .filter-select {
      padding: 8px 14px; border: 1px solid #dee2e6; border-radius: 8px;
      background: white; font-size: 13px; cursor: pointer;
    }
    .filter-select:focus { outline: none; border-color: #4f46e5; }
    .activity-count { font-size: 13px; color: #6c757d; margin-left: auto; }

    .activity-table-wrapper {
      background: white;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0,0,0,0.08);
    }
    .activity-table {
      width: 100%;
      border-collapse: collapse;
    }
    .activity-table thead {
      background: #f8fafc;
    }
    .activity-table th {
      text-align: left;
      padding: 12px 16px;
      font-size: 12px;
      font-weight: 700;
      color: #4a5568;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-bottom: 1px solid #e8ebf5;
      white-space: nowrap;
    }
    .activity-table td {
      padding: 14px 16px;
      font-size: 14px;
      border-bottom: 1px solid #f0f0f0;
      vertical-align: middle;
      color: #1a1f36;
    }
    .activity-table tr:hover td { background: #f8f9fa; }
    .activity-table tr:last-child td { border-bottom: none; }

    .cell-name {
      font-weight: 600;
      color: #1a1f36;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .cell-email { color: #6c757d; font-size: 13px; }
    .cell-description { color: #1a1f36; }

    /* page-scoped badges — no collision with navbar's .role-badge */
    .log-badge {
      font-size: 11px;
      padding: 3px 10px;
      border-radius: 10px;
      font-weight: 600;
      background: #e9ecef;
      color: #6c757d;
      display: inline-block;
      text-transform: capitalize;
      white-space: nowrap;
    }
    .log-badge.hr { background: #e3f2fd; color: #1565c0; }
    .log-badge.applicant { background: #e8f5e9; color: #2e7d32; }
    .log-badge.superadmin { background: #ede9fe; color: #6d28d9; }
    .log-badge.action {
      background: #f1f5f9;
      color: #334155;
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-size: 11px;
    }

    .loading-state { text-align: center; padding: 60px; color: #6c757d; }
    .empty-state {
      text-align: center;
      padding: 60px 20px;
      color: #6c757d;
      background: white;
      border-radius: 12px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.08);
    }
    .empty-state .icon { font-size: 40px; margin-bottom: 8px; display: block; }

    @media (max-width: 900px) {
      .activity-container { padding: 16px; padding-top: 80px; }
      .controls { flex-direction: column; align-items: stretch; }
      .search-input { width: 100%; }
      .activity-count { text-align: right; }
      .activity-table-wrapper { overflow-x: auto; }
      .activity-table { min-width: 720px; }
    }
  `;

  if (loading) {
    return (
      <>
        <Navbar userRole="hr" />
        <div className="activity-container">
          <style>{styles}</style>
          <Loader />
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

        <div className="page-header">
          <h1 style={{ display: "flex", alignItems: "center", gap: "10px", margin: 0, fontSize: "28px", color: "#1a1f36" }}>
            <BasiconsArchiveDrawerLineIcon size={32} color="#1a3a5c" />
            System Logs
          </h1>
          <p>Track actions made within the system</p>
        </div>

        <div className="controls">
          <input
            type="text"
            className="search-input"
            placeholder="Search by name, email, or description..."
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
          <span className="activity-count">
            {filteredActivities.length} activities
          </span>
        </div>

        {filteredActivities.length === 0 ? (
          <div className="empty-state">
            <span className="icon">📭</span>
            No activities found
          </div>
        ) : (
          <div className="activity-table-wrapper">
            <table className="activity-table">
              <thead>
                <tr>
                  <th>Full Name</th>
                  <th>Email</th>
                  <th>Action</th>
                  <th>Description</th>
                  <th>Role</th>
                  <th>When</th>
                </tr>
              </thead>
              <tbody>
                {filteredActivities.map((activity) => (
                  <tr key={activity.id}>
                    <td>
                      <div className="cell-name">
                        <div
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: "50%",
                            background: `${getActionColor(activity.type)}20`,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                          }}
                        >
                          {getActionIcon(activity.type)}
                        </div>
                        <span>{activity.user}</span>
                      </div>
                    </td>
                    <td className="cell-email">
                      {activity.userEmail || "—"}
                    </td>
                    <td>
                      <span className="log-badge action">
                        {activity.action}
                      </span>
                    </td>
                    <td className="cell-description">
                      {activity.description}
                    </td>
                    <td>
                      <span className={`log-badge ${activity.userRole}`}>
                        {activity.userRole === "hr"
                          ? "HR"
                          : activity.userRole === "superadmin"
                          ? "Superadmin"
                          : activity.userRole === "applicant"
                          ? "Applicant"
                          : activity.userRole}
                      </span>
                    </td>
                    <td
                      style={{
                        color: "#adb5bd",
                        whiteSpace: "nowrap",
                        fontSize: 13,
                      }}
                    >
                      {formatTimestamp(activity.timestamp)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
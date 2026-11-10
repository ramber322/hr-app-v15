import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { supabase } from "../lib/supabase";
import Loader from "../components/Loader";
import "../styles/DashboardPage.css";
import {  BasiconsBriefcaseIcon, BasiconsInterviewIcon, CheckIcon } from "../components/icons/CustomIcons";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Line } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler
);

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const STATUS_META = {
  PENDING: { label: "Pending", tone: "amber" },
  REVIEWING: { label: "Under review", tone: "blue" },
  QUALIFIED: { label: "Qualified", tone: "violet" },
  SHORTLISTED: { label: "Shortlisted", tone: "violet" },
  FOR_INTERVIEW: { label: "For interview", tone: "teal" },
  INTERVIEW_SCHEDULED: { label: "Interview scheduled", tone: "teal" },
  HIRED: { label: "Hired", tone: "green" },
  NOT_SELECTED: { label: "Not selected", tone: "rose" },
  REJECTED: { label: "Rejected", tone: "rose" },
};

const isShortlisted = (status) =>
  ["QUALIFIED", "SHORTLISTED", "FOR_INTERVIEW", "INTERVIEW_SCHEDULED"].includes(status);

const isRejected = (status) => ["NOT_SELECTED", "REJECTED", "WITHDRAWN"].includes(status);

function formatRelativeDate(value) {
  if (!value) return "Date unavailable";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date unavailable";

  const days = Math.floor((Date.now() - date.getTime()) / 86400000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return date.toLocaleDateString("en-PH", { month: "short", day: "numeric" });
}

function formatDate(value) {
  if (!value) return "Date unavailable";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date unavailable";
  return date.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function getInitials(value = "") {
  return value
    .split(" ")
    .filter(Boolean)
    .slice(0, 1)
    .map((part) => part[0].toUpperCase())
    .join("") || "A";
}

export default function DashboardPage() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [jobs, setJobs] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loadError, setLoadError] = useState("");

  const loadDashboardData = async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);

    setLoadError("");

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;
      if (!user) {
        navigate("/login");
        return;
      }

      const [
  { data: jobRows, error: jobsError },
  { data: applicationRows, error: applicationsError },
] = await Promise.all([
  supabase.from("job_postings").select("*"),
  supabase
    .from("applications")
    .select("*, job_postings(position_title)")
    .neq("status", "WITHDRAWN"),
]);

if (jobsError) throw jobsError;
if (applicationsError) throw applicationsError;

// ✅ fetch applicant names for all applications
let enrichedApplications = applicationRows || [];
if (applicationRows && applicationRows.length > 0) {
  const applicantIds = [...new Set(applicationRows.map((a) => a.applicant_id).filter(Boolean))];

  const { data: applicantRows, error: applicantError } = await supabase
    .from("applicants")
    .select("id, full_name")
    .in("id", applicantIds);

  if (applicantError) {
    console.error("Error loading applicants:", applicantError);
  } else {
    const applicantsMap = Object.fromEntries(
      (applicantRows ?? []).map((a) => [a.id, a])
    );

    enrichedApplications = applicationRows.map((app) => ({
      ...app,
      applicant_name: applicantsMap[app.applicant_id]?.full_name ?? null,
    }));
  }
}

setJobs(jobRows || []);
setApplications(enrichedApplications);

    } catch (error) {
      console.error("Error loading dashboard:", error);
      setLoadError("We couldn't load the dashboard data. Please try refreshing.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
    // Load once when the dashboard mounts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

 const metrics = useMemo(() => {
  const activeJobs = jobs.filter((job) => job.status === "OPEN");
  const pending = applications.filter((app) => app.status === "PENDING");
  const reviewing = applications.filter((app) => app.status === "REVIEWING");
  const shortlisted = applications.filter((app) => isShortlisted(app.status));
  const interview = applications.filter((app) => app.status === "INTERVIEW_SCHEDULED" || app.status === "FOR_INTERVIEW");
  const hired = applications.filter((app) => app.status === "HIRED");

  // 🆕 Jobs closing within 14 days
  const closingSoon = jobs.filter((job) => {
    if (job.status !== "OPEN" || !job.closing_date) return false;
    const daysLeft = Math.ceil(
      (new Date(job.closing_date) - new Date()) / (1000 * 60 * 60 * 24)
    );
    return daysLeft > 0 && daysLeft <= 14;
  }).length;

  return {
    totalJobs: jobs.length,
    openJobs: activeJobs.length,
    totalApplications: applications.length,
    pending: pending.length,
    reviewing: reviewing.length,
    shortlisted: shortlisted.length,
    interview: interview.length,
    hired: hired.length,
    closingSoon,  // 🆕
  };
}, [jobs, applications]);

  const latestApplications = useMemo(
    () =>
      [...applications]
        .sort((a, b) => new Date(b.applied_date || 0) - new Date(a.applied_date || 0))
        .slice(0, 6),
    [applications]
  );

  const positionBreakdown = useMemo(() => {
    const counts = new Map();

    applications.forEach((application) => {
      const jobId = application.job_id;
      if (!jobId) return;
      const current = counts.get(jobId) || {
        jobId,
        title: application.job_postings?.position_title || "Untitled position",
        count: 0,
      };
      current.count += 1;
      counts.set(jobId, current);
    });

    return [...counts.values()].sort((a, b) => b.count - a.count).slice(0, 5);
  }, [applications]);

  const pipeline = useMemo(() => {
    const stages = [
      { label: "Pending", count: metrics.pending, color: "#D6A34A" },
      { label: "Under review", count: metrics.reviewing, color: "#6B91C9" },
      { label: "Shortlisted", count: metrics.shortlisted, color: "#9279C9" },
      { label: "Interview", count: metrics.interview, color: "#4D9D91" },
      { label: "Hired", count: metrics.hired, color: "#5A9A78" },
    ];
    const max = Math.max(...stages.map((stage) => stage.count), 1);
    return stages.map((stage) => ({ ...stage, width: (stage.count / max) * 100 }));
  }, [metrics]);

  const trendData = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const monthlyApplications = Array(12).fill(0);
    const monthlyHires = Array(12).fill(0);

    applications.forEach((application) => {
      if (!application.applied_date) return;
      const date = new Date(application.applied_date);
      if (date.getFullYear() === currentYear) monthlyApplications[date.getMonth()] += 1;
    });

    // Hired records are grouped by applied_date because no hire-date field
    // is assumed here. Replace this with the actual hire date field if available.
    applications.forEach((application) => {
      if (application.status !== "HIRED" || !application.applied_date) return;
      const date = new Date(application.applied_date);
      if (date.getFullYear() === currentYear) monthlyHires[date.getMonth()] += 1;
    });

    return {
      labels: MONTH_LABELS,
      datasets: [
        {
          label: "Applications",
          data: monthlyApplications,
          borderColor: "#6675A8",
          backgroundColor: "rgba(102, 117, 168, 0.10)",
          fill: true,
          tension: 0.35,
          pointRadius: 2,
          pointHoverRadius: 4,
          pointBackgroundColor: "#6675A8",
          borderWidth: 2,
        },
        {
          label: "Hired",
          data: monthlyHires,
          borderColor: "#5D9B87",
          backgroundColor: "transparent",
          fill: false,
          tension: 0.35,
          pointRadius: 2,
          pointHoverRadius: 4,
          pointBackgroundColor: "#5D9B87",
          borderWidth: 2,
        },
      ],
    };
  }, [applications]);

  const trendOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index", intersect: false },
    plugins: {
      legend: {
        position: "top",
        align: "end",
        labels: {
          usePointStyle: true,
          pointStyle: "circle",
          boxWidth: 7,
          boxHeight: 7,
          padding: 16,
          color: "#7B8493",
          font: { size: 10, family: "Inter, sans-serif" },
        },
      },
      tooltip: {
        backgroundColor: "#252B36",
        titleColor: "#FFFFFF",
        bodyColor: "#E8EBF0",
        padding: 10,
        cornerRadius: 7,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        border: { display: false },
        grid: { color: "#EEF0F3", drawTicks: false },
        ticks: { color: "#A0A7B2", padding: 8, precision: 0, font: { size: 10 } },
      },
      x: {
        border: { display: false },
        grid: { display: false },
        ticks: { color: "#A0A7B2", font: { size: 10 } },
      },
    },
  };

  const today = new Date();
  const greeting = getGreeting();

  if (loading) {
    return (
      <>
        <Navbar userRole="hr" />
        <main className="hr-dashboard">
          <div className="dashboard-loading"><Loader /></div>
        </main>
      </>
    );
  }

  return (
    <>
      <Navbar userRole="hr" />

      <main className="hr-dashboard">
        <div className="dashboard-shell">
          <header className="dashboard-topbar">
            <div>
              <div className="dashboard-kicker">RECRUITMENT WORKSPACE</div>
              <h1>Dashboard Overview</h1>
              <p>Here's an overview of your recruitment activity.</p>
            </div>

            <div className="topbar-actions">
              <div className="today-label">
                <span className="today-label-dot" />
                {today.toLocaleDateString("en-PH", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </div>
              <button
                className="refresh-button"
                type="button"
                onClick={() => loadDashboardData(true)}
                disabled={refreshing}
              >
                <span className={refreshing ? "refresh-symbol spinning" : "refresh-symbol"}>↻</span>
                {refreshing ? "Refreshing" : "Refresh"}
              </button>
            </div>
          </header>

          {loadError && (
            <div className="dashboard-error" role="alert">
              <span>{loadError}</span>
              <button type="button" onClick={() => loadDashboardData(true)}>Try again</button>
            </div>
          )}

          {/* Compact KPI row: six cards, rather than four oversized tiles. */}
          <section className="metric-grid" aria-label="Recruitment metrics">
            <article className="metric-card">
              <div className="metric-card-heading"><span className="metric-icon slate">▤</span><span>Total applications</span></div>
              <strong>{metrics.totalApplications}</strong>
              <small>All submitted applications</small>
            </article>
            <article className="metric-card">
              <div className="metric-card-heading"><span className="metric-icon blue">◷</span><span>Needs review</span></div>
              <strong>{metrics.pending + metrics.reviewing}</strong>
              <small>{metrics.pending} pending · {metrics.reviewing} reviewing</small>
            </article>
            <article className="metric-card">
              <div className="metric-card-heading"><span className="metric-icon violet">◇</span><span>Shortlisted</span></div>
              <strong>{metrics.shortlisted}</strong>
              <small>Qualified / shortlisted pipeline</small>
            </article>
           <article className="metric-card">
  <div className="metric-card-heading">
    <span className="metric-icon teal">
      <BasiconsInterviewIcon size={14} color="currentColor" />
    </span>
    <span>Interviews</span>
  </div>
  <strong>{metrics.interview}</strong>
  <small>For interview / scheduled</small>
</article>
            <article className="metric-card">
              <div className="metric-card-heading"><span className="metric-icon green"><CheckIcon size={14} color="currentColor" /></span><span>Hired</span></div>
              <strong>{metrics.hired}</strong>
              <small>Marked as hired</small>
            </article>
            <article className="metric-card">
  <div className="metric-card-heading">
    <span className="metric-icon amber">
      <BasiconsBriefcaseIcon size={14} color="currentColor" />
    </span>
    <span>Open vacancies</span>
  </div>
  <strong>{metrics.openJobs}</strong>
  <small>{metrics.totalJobs} total job postings</small>
</article>
          </section>

          {/* Asymmetric layout: wide analytics area and narrow action rail. */}
          <section className="dashboard-main-layout">
            <div className="dashboard-primary-column">
              <article className="panel trend-panel">
                <div className="panel-header">
                  <div>
                    <span className="panel-overline">ACTIVITY</span>
                    <h2>Hiring trends</h2>
                    <p>Applications received and applicants marked as hired this year.</p>
                  </div>
                  <span className="panel-tag">Current year</span>
                </div>
                <div className="trend-chart">
                  <Line data={trendData} options={trendOptions} />
                </div>
                <div className="panel-footnote">
                  Hired counts are grouped by application date in this view, not actual hire date.
                </div>
              </article>

              <article className="panel pipeline-panel">
                <div className="panel-header compact">
                  <div>
                    <span className="panel-overline">WORKFLOW</span>
                    <h2>Recruitment pipeline</h2>
                    <p>See how applications are distributed across stages.</p>
                  </div>
                </div>
                <div className="pipeline-list">
                  {pipeline.map((stage) => (
                    <div className="pipeline-row" key={stage.label}>
                      <div className="pipeline-label">{stage.label}</div>
                      <div className="pipeline-track">
                        <div
                          className="pipeline-fill"
                          style={{ width: `${stage.width}%`, backgroundColor: stage.color }}
                        />
                      </div>
                      <strong>{stage.count}</strong>
                    </div>
                  ))}
                </div>
              </article>

              <article className="panel recent-panel">
                <div className="panel-header compact">
                  <div>
                    <span className="panel-overline">LATEST UPDATES</span>
                    <h2>Recent applications</h2>
                    <p>The latest applications received by your office.</p>
                  </div>
                  <button 
  className="quiet-link" 
  type="button" 
  onClick={() => navigate("/hr/applications")}
  style={{
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 14px',
    background: '#eef2ff',
    color: '#4F46E5',
    border: '1px solid #c7d2fe',
    borderRadius: '999px',
    fontSize: '10px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    fontFamily: 'inherit'
  }}
  onMouseEnter={(e) => {
    e.currentTarget.style.background = '#4F46E5';
    e.currentTarget.style.color = 'white';
    e.currentTarget.style.borderColor = '#4F46E5';
  }}
  onMouseLeave={(e) => {
    e.currentTarget.style.background = '#eef2ff';
    e.currentTarget.style.color = '#4F46E5';
    e.currentTarget.style.borderColor = '#c7d2fe';
  }}
>
  View all
</button>
                </div>

                {latestApplications.length === 0 ? (
                  <div className="empty-state">
                    <span className="empty-state-icon">↗</span>
                    <strong>No applications yet</strong>
                    <p>New submissions will appear here.</p>
                  </div>
                ) : (
                  <div className="application-table-wrap">
                    <table className="application-table">
                      <thead>
                        <tr>
                          <th>Applicant</th>
                          <th>Position</th>
                          <th>Status</th>
                          <th>Applied</th>
                        </tr>
                      </thead>
                      <tbody>
                        {latestApplications.map((application) => {
                          const applicantName =
                            application.applicant_name ||
                            application.full_name ||
                            application.name ||
                            "Applicant";
                          const status = STATUS_META[application.status] || {
                            label: application.status || "Unspecified",
                            tone: "neutral",
                          };

                          return (
                            <tr
                              key={application.id}
                              onClick={() => navigate(`/hr/jobs/${application.job_id}/candidates`)}
                              tabIndex={0}
                              onKeyDown={(event) => {
                                if (event.key === "Enter") {
                                  navigate(`/hr/jobs/${application.job_id}/candidates`);
                                }
                              }}
                            >
                              <td>
                                <div className="applicant-cell">
                                  <span className="applicant-avatar">{getInitials(applicantName)}</span>
                                  <span>{applicantName}</span>
                                </div>
                              </td>
                              <td className="position-cell">{application.job_postings?.position_title || "—"}</td>
                              <td><span className={`status-pill ${status.tone}`}>{status.label}</span></td>
                              <td className="date-cell">{formatRelativeDate(application.applied_date)} </td>
                              
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </article>
            </div>

            <aside className="dashboard-side-column">
              <article className="panel attention-panel">
                <div className="panel-header compact">
                  <div>
                    <span className="panel-overline">PRIORITIES</span>
                    <h2>Needs attention</h2>
                    <p>Items that may need an HR follow-up.</p>
                  </div>
                </div>
                <div className="attention-list">
                  <button type="button" className="attention-item" onClick={() => navigate("/hr/candidates?status=PENDING")}>
                    <span className="attention-icon amber">!</span>
                    <span className="attention-copy"><strong>Pending applications</strong><small>Awaiting initial review</small></span>
                    <b>{metrics.pending}</b>
                    <span className="attention-chevron">›</span>
                  </button>
                  <button type="button" className="attention-item" onClick={() => navigate("/hr/candidates?status=REVIEWING")}>
                    <span className="attention-icon blue">◷</span>
                    <span className="attention-copy"><strong>Under review</strong><small>Currently being assessed</small></span>
                    <b>{metrics.reviewing}</b>
                    <span className="attention-chevron">›</span>
                  </button>
                  {metrics.closingSoon > 0 && (
  <button 
    type="button"
    className="attention-item" 
    onClick={() => navigate("/hr/jobs?closing=soon")}
  >
    <span className="attention-icon rose"><BasiconsBriefcaseIcon size={14} color="currentColor" /></span>
    <span className="attention-copy">
      <strong>Jobs closing soon</strong>
      <small>Closing within 14 days</small>  {/* ← update */}
    </span>
    <b>{metrics.closingSoon}</b>
    <span className="attention-chevron">›</span>
  </button>
)}
                </div>
              </article>

              <article className="panel positions-panel">
                <div className="panel-header compact">
                  <div>
                    <span className="panel-overline">JOB POSTINGS</span>
                    <h2>Most applied positions</h2>
                    <p>Positions receiving the most applications.</p>
                  </div>
                </div>
                {positionBreakdown.length === 0 ? (
                  <div className="mini-empty">No application data to show yet.</div>
                ) : (
                  <div className="position-list">
                    {positionBreakdown.map((position, index) => {
                      const maxCount = Math.max(positionBreakdown[0]?.count || 1, 1);
                      return (
                        <div className="position-item" key={position.jobId}>
                          <div className="position-topline">
                            <span className="position-rank">{String(index + 1).padStart(2, "0")}</span>
                            <span className="position-name">{position.title}</span>
                            <strong>{position.count}</strong>
                          </div>
                          <div className="position-track">
                            <span style={{ width: `${(position.count / maxCount) * 100}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </article>

              <article className="panel quick-actions-panel">
                <div className="panel-header compact">
                  <div>
                    <span className="panel-overline">SHORTCUTS</span>
                    <h2>Quick actions</h2>
                    <p>Common recruitment tasks.</p>
                  </div>
                </div>
                <div className="quick-action-list">
                  <button type="button" onClick={() => navigate("/hr/jobs")}>
                    <span className="quick-action-icon">＋</span>
                    <span><strong>Manage job postings</strong><small>Create or update vacancies</small></span>
                    <span className="quick-action-arrow">→</span>
                  </button>
                  <button type="button" onClick={() => navigate("/hr/candidates")}>
                    <span className="quick-action-icon">▤</span>
                    <span><strong>Review applications</strong><small>Open applicant records</small></span>
                    <span className="quick-action-arrow">→</span>
                  </button>
                </div>
              </article>

              <article className="minimal-note">
                <span className="minimal-note-mark">i</span>
                <p><strong>HR review remains essential.</strong> Dashboard counts summarize application records and do not make hiring decisions.</p>
              </article>
            </aside>
          </section>

          <footer className="dashboard-footer">
            <span>HR Recruitment &amp; Screening Portal</span>
            <span>Dashboard · {today.getFullYear()}</span>
          </footer>
        </div>
      </main>
    </>
  );
}

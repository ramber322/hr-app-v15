import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Navbar from "../components/Navbar";
import { supabase } from "../lib/supabase";
import { DocumentListIcon, NewspaperIcon } from "../components/icons/CustomIcons";
import Loader from '../components/Loader';

export default function CandidatesPage() {
  
  const navigate = useNavigate();
    const [searchParams] = useSearchParams();
  
  // 🆕 Read status from URL param (fallback to "All")
  const initialStatus = searchParams.get("status") || "All";


  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState(initialStatus);  // ← changed
  const [filterDepartment, setFilterDepartment] = useState("All");
  const [departments, setDepartments] = useState([]);

  useEffect(() => {
    loadApplications();
  }, []);

  const loadApplications = async () => {
    setLoading(true);
    
    try {
      // 1. Fetch all applications (non-withdrawn)
      const { data: appsData, error: appsError } = await supabase
        .from('applications')
        .select('*')
        .neq('status', 'WITHDRAWN')
        .order('applied_date', { ascending: false });
      
      if (appsError) throw appsError;
      
      if (!appsData || appsData.length === 0) {
        setApplications([]);
        setLoading(false);
        return;
      }
      
      // 2. Fetch job details for each application
      const jobIds = [...new Set(appsData.map(app => app.job_id))];
      
      const { data: jobsData, error: jobsError } = await supabase
        .from('job_postings')
        .select('*')
        .in('id', jobIds);
      
      if (jobsError) throw jobsError;
      
      const jobsMap = {};
      jobsData.forEach(job => {
        jobsMap[job.id] = job;
      });
      
      // 3. Fetch applicant details
      const applicantIds = [...new Set(appsData.map(app => app.applicant_id))];
      
      const { data: applicantsData, error: applicantsError } = await supabase
        .from('applicants')
        .select('*')
        .in('id', applicantIds);
      
      if (applicantsError) throw applicantsError;
      
      const applicantsMap = {};
      applicantsData.forEach(applicant => {
        applicantsMap[applicant.id] = applicant;
      });
      
      // 4. Combine data
      const combinedData = appsData.map(app => {
        const job = jobsMap[app.job_id] || {};
        const applicant = applicantsMap[app.applicant_id] || {};
        const aiData = app.ai_explanation || {};
        
        return {
          id: app.id,
          applicant_id: app.applicant_id,
          applicant_name: applicant.full_name || 'Unknown',
          applicant_email: applicant.email || 'No email',
          position_title: job.position_title || 'Position Not Found',
          department: job.place_of_assignment || 'N/A',
          applied_date: app.applied_date,
          status: app.status || 'PENDING',
          ai_match_score: app.ai_match_score || 0,
          requirements_met: aiData.requirements_met || '0/0',
          job_id: app.job_id,
          docs_submitted: app.docs_submitted || {}
        };
      });
      
      setApplications(combinedData);
      
      // Extract unique departments for filter
      const deptList = [...new Set(combinedData.map(app => app.department).filter(Boolean))];
      setDepartments(deptList);
      
    } catch (error) {
      console.error('Error loading applications:', error);
      alert('Error loading applications: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      PENDING: { bg: "#FFF3E0", color: "#E65100", label: "Pending" },
      REVIEWING: { bg: "#E3F2FD", color: "#1565C0", label: "Under Review" },
      QUALIFIED: { bg: "#F3E5F5", color: "#7B1FA2", label: "Qualified" },
      SHORTLISTED: { bg: "#F3E5F5", color: "#7B1FA2", label: "Shortlisted" },
      FOR_INTERVIEW: { bg: "#E8F5E9", color: "#2E7D32", label: "For Interview" },
      INTERVIEW_SCHEDULED: { bg: "#E8F5E9", color: "#2E7D32", label: "Interview Scheduled" },
      HIRED: { bg: "#E8F5E9", color: "#1B5E20", label: "Hired" },
      NOT_SELECTED: { bg: "#FFEBEE", color: "#C62828", label: "Not Selected" },
      REJECTED: { bg: "#FFEBEE", color: "#C62828", label: "Rejected" },
      WITHDRAWN: { bg: "#F3E5F5", color: "#6A1B9A", label: "Withdrawn" }
    };
    return colors[status] || colors["PENDING"];
  };

  const getScoreColor = (score) => {
    if (!score) return "#6c757d";
    if (score >= 80) return "#2e7d32";
    if (score >= 60) return "#e65100";
    return "#c62828";
  };

  const getScoreBg = (score) => {
    if (!score) return "#f5f5f5";
    if (score >= 80) return "#e8f5e9";
    if (score >= 60) return "#fff3e0";
    return "#ffebee";
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  

  // Filter applications
  const filteredApplications = applications
    .filter((app) => {
      const matchesSearch = app.applicant_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           app.position_title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           app.applicant_email.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = filterStatus === "All" || app.status === filterStatus;
      const matchesDepartment = filterDepartment === "All" || app.department === filterDepartment;
      return matchesSearch && matchesStatus && matchesDepartment;
    });

  const stats = {
    total: applications.length,
    pending: applications.filter(a => a.status === "PENDING").length,
    reviewing: applications.filter(a => a.status === "REVIEWING").length,
    shortlisted: applications.filter(a => a.status === "SHORTLISTED" || a.status === "QUALIFIED").length,
    hired: applications.filter(a => a.status === "HIRED").length,
  };

  const styles = `
    .candidates-container {
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
      margin-top: 8px;
    }

    .stats-cards {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      margin-bottom: 20px;
    }

    .stat-card {
      background: white;
      border-radius: 10px;
      padding: 14px 16px;
      text-align: center;
      box-shadow: 0 1px 3px rgba(0,0,0,0.08);
    }

    .stat-number {
      font-size: 24px;
      font-weight: bold;
      color: #1a1f36;
      display: block;
    }

    .stat-label {
      font-size: 11px;
      color: #6c757d;
      margin-top: 2px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
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
    }

    .search-input {
      flex: 1;
      min-width: 180px;
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

    .table-wrapper {
      background: white;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0,0,0,0.08);
    }

    table {
      width: 100%;
      border-collapse: collapse;
    }

    th {
      text-align: left;
      padding: 14px 16px;
      background: #f8f9fa;
      font-size: 12px;
      font-weight: 600;
      color: #495057;
      border-bottom: 1px solid #e9ecef;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }

    td {
      padding: 14px 16px;
      border-bottom: 1px solid #f0f0f0;
      font-size: 14px;
      color: #212529;
    }

    tr:hover {
      background: #f8f9fa;
    }

    .applicant-cell {
      display: flex;
      align-items: center;
      gap: 12px;
    }

   .avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 600;
  font-size: 14px;
  flex-shrink: 0;
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.2);
}

    .applicant-info {
      display: flex;
      flex-direction: column;
    }

    .applicant-name {
      font-weight: 500;
      color: #1a1f36;
    }

    .applicant-email {
      font-size: 12px;
      color: #6c757d;
    }

    .status-badge {
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 11px;
      font-weight: 500;
      display: inline-block;
    }

    .score-badge {
      padding: 4px 10px;
      border-radius: 20px;
      font-size: 13px;
      font-weight: 600;
      display: inline-block;
    }

    .doc-status {
      font-weight: 600;
      font-size: 13px;
    }

    .doc-complete {
      color: #2e7d32;
    }

    .doc-incomplete {
      color: #c62828;
    }

    .view-btn {
      padding: 6px 16px;
      background: #4f46e5;
      color: white;
      border: none;
      border-radius: 6px;
      font-size: 12px;
      cursor: pointer;
    }

    .view-btn:hover {
      background: #4338ca;
    }

    .view-btn-small {
      padding: 4px 12px;
      background: #4f46e5;
      color: white;
      border: none;
      border-radius: 4px;
      font-size: 11px;
      cursor: pointer;
    }

    .view-btn-small:hover {
      background: #4338ca;
    }

    .empty-state {
      text-align: center;
      padding: 40px;
      color: #6c757d;
    }

    .loading-state {
      text-align: center;
      padding: 60px;
      background: white;
      border-radius: 12px;
      color: #6c757d;
    }

    .requirements-cell {
      font-size: 13px;
      color: #1a1f36;
      font-weight: 500;
    }

    @media (max-width: 768px) {
      .candidates-container { padding: 16px; padding-top: 80px; }
      .controls { flex-direction: column; }
      .search-input { width: 100%; }
      .stats-cards { grid-template-columns: repeat(2, 1fr); }
      table { font-size: 12px; }
      th, td { padding: 10px 8px; }
    }
  `;

  return (
    <>
      <Navbar userRole="hr" />
      <style>{styles}</style>

      <div className="candidates-container">
        <div className="page-header" >
       <h1 style={{ 
  display: 'flex', 
  alignItems: 'center', 
  justifyContent: 'flex-start',
  gap: '10px',
  padding: '12px 20px',
  borderRadius: '8px',
  marginLeft: '-20px'
}}>
  
  <NewspaperIcon size={33} color="#1a3a5c" /> 
  Applications
</h1>
          <p>View and manage all job applications across all postings</p>
        </div>

        <div className="stats-cards">
          <div className="stat-card">
            <span className="stat-number">{stats.total}</span>
            <span className="stat-label">Total Applications</span>
          </div>
          <div className="stat-card">
            <span className="stat-number">{stats.pending}</span>
            <span className="stat-label">Pending</span>
          </div>
          <div className="stat-card">
            <span className="stat-number">{stats.reviewing}</span>
            <span className="stat-label">Under Review</span>
          </div>
          <div className="stat-card">
            <span className="stat-number">{stats.shortlisted}</span>
            <span className="stat-label">Shortlisted</span>
          </div>
        </div>

        <div className="controls">
          <input
            type="text"
            className="search-input"
            placeholder="Search by name, position, or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <select
            className="filter-select"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="All">All Status</option>
            <option value="PENDING">Pending</option>
            <option value="REVIEWING">Under Review</option>
            <option value="SHORTLISTED">Shortlisted</option>
            <option value="QUALIFIED">Qualified</option>
            <option value="FOR_INTERVIEW">For Interview</option>
            <option value="INTERVIEW_SCHEDULED">Interview Scheduled</option>
            <option value="HIRED">Hired</option>
            <option value="NOT_SELECTED">Not Selected</option>
            <option value="REJECTED">Rejected</option>
          </select>
          <select
            className="filter-select"
            value={filterDepartment}
            onChange={(e) => setFilterDepartment(e.target.value)}
          >
            <option value="All">All Departments</option>
            {departments.map((dept) => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>
        </div>

        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Applicant</th>
                <th>Position</th>
                <th>Department</th>
                <th>Date Applied</th>
                <th>Score</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" style={{ position: 'relative' }} >
                    <div className="loading-state"><Loader/></div>
                  </td>
                </tr>
              ) : filteredApplications.length === 0 ? (
                <tr>
                  <td colSpan="8">
                    <div className="empty-state">No applications found</div>
                  </td>
                </tr>
              ) : (
                filteredApplications.map((app) => {
                  const statusStyle = getStatusColor(app.status);

                  return (
                    <tr key={app.id}>
                      <td>
                        <div className="applicant-cell">
                          <div className="avatar">{app.applicant_name.charAt(0)}</div>
                          <div className="applicant-info">
                            <span className="applicant-name">{app.applicant_name}</span>
                            <span className="applicant-email">{app.applicant_email}</span>
                          </div>
                        </div>
                      </td>
                      <td>{app.position_title}</td>
                      <td>{app.department}</td>
                      <td>{formatDate(app.applied_date)}</td>
                      <td>
                        <span
                          className="score-badge"
                          style={{
                            background: getScoreBg(app.ai_match_score),
                            color: getScoreColor(app.ai_match_score),
                          }}
                        >
                          {app.ai_match_score}%
                        </span>
                      </td>
                      <td>
                        <span
                          className="status-badge"
                          style={{
                            backgroundColor: statusStyle.bg,
                            color: statusStyle.color,
                          }}
                        >
                          {statusStyle.label}
                        </span>
                      </td>
                      <td>
                        <button
  className="view-btn-small"
  onClick={() => navigate(`/hr/jobs/${app.job_id}/candidates`, { 
    state: { from: '/hr/candidates' } 
  })}
>
  View
</button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {!loading && filteredApplications.length > 0 && (
          <div style={{ marginTop: 12, fontSize: 13, color: '#6c757d' }}>
            Showing {filteredApplications.length} of {applications.length} applications
          </div>
        )}
      </div>
    </>
  );
}
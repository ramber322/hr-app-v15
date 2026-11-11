import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { supabase } from "../lib/supabase";
import "../styles/MyApplicationsPage.css";
import locationLogo from '../assets/icon-location.png';
import calendarminimalLogo from '../assets/calendar-minimal-icon.png';
import { CircularCheckSuccessIcon, BasiconsDocumentIcon, BasiconsBriefcaseIcon } from "../components/icons/CustomIcons";
import Loader from '../components/Loader';

export default function MyApplicationsPage() {
  const navigate = useNavigate();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);

//Alert Withdrawal
const [showWithdrawModal, setShowWithdrawModal] = useState(false);
const [selectedWithdrawApp, setSelectedWithdrawApp] = useState(null);

  // Education level labels
  const EDUCATION_LABELS = {
    0: "None Required",
    1: "Elementary Graduate",
    2: "High School Graduate",
    3: "2-Year College / Associate",
    4: "Bachelor's Degree",
    5: "Master's Degree"
  };

  // Eligibility level labels
  const ELIGIBILITY_LABELS = {
    "none": "None Required",
    "subprofessional": "Career Service Subprofessional",
    "professional": "Career Service Professional"
  };

  useEffect(() => {
    checkUserAndLoadApplications();
  }, []);

  const checkUserAndLoadApplications = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate('/login');
      return;
    }
    await loadApplications(user.id);
  };

  const loadApplications = async (applicantId) => {
    setLoading(true);
    
    const { data: applicationsData, error: applicationsError } = await supabase
      .from('applications')
      .select('*')
      .eq('applicant_id', applicantId)
      .neq('status', 'WITHDRAWN')
      .order('applied_date', { ascending: false });
    
    if (applicationsError) {
      console.error('Error loading applications:', applicationsError);
      setLoading(false);
      return;
    }
    
    if (!applicationsData || applicationsData.length === 0) {
      setApplications([]);
      setLoading(false);
      return;
    }
    
    const jobIds = [...new Set(applicationsData.map(app => app.job_id))];
    
    const { data: jobsData, error: jobsError } = await supabase
      .from('job_postings')
      .select('*')
      .in('id', jobIds);
    
    if (jobsError) {
      console.error('Error loading jobs:', jobsError);
      setLoading(false);
      return;
    }
    
    const jobsMap = {};
    jobsData.forEach(job => {
      jobsMap[job.id] = job;
    });
    
    const combinedData = applicationsData.map(app => ({
      ...app,
      job_postings: jobsMap[app.job_id] || null
    }));
    
    setApplications(combinedData);
    setLoading(false);
  };

 const getStatusColor = (status) => {
  const colors = {
    'PENDING': { bg: '#FFF3E0', color: '#E65100', text: 'Pending Review' },
    'REVIEWING': { bg: '#E3F2FD', color: '#1565C0', text: 'Under Review' },
    'QUALIFIED': { bg: '#E8F5E9', color: '#2E7D32', text: 'Qualified' },
    'SHORTLISTED': { bg: '#E8F5E9', color: '#2E7D32', text: 'Shortlisted' },
    'FOR_INTERVIEW': { bg: '#F3E5F5', color: '#7B1FA2', text: 'For Interview' },
    'INTERVIEW_SCHEDULED': { bg: '#F3E5F5', color: '#7B1FA2', text: 'Interview Scheduled' },
    'HIRED': { bg: '#E8F5E9', color: '#1B5E20', text: 'Hired' },
    'NOT_SELECTED': { bg: '#FFEBEE', color: '#C62828', text: 'Not Selected' },
    'REJECTED': { bg: '#FFEBEE', color: '#C62828', text: 'Rejected' },
    'WITHDRAWN': { bg: '#F3E5F5', color: '#6A1B9A', text: 'Withdrawn' }
  };
  return colors[status] || colors['PENDING'];
};

  const getDocumentStatus = (docsSubmitted, docType) => {
    if (!docsSubmitted) return false;
    return docsSubmitted[docType] === true;
  };

  const canWithdraw = (application) => {
    if (application.status === 'WITHDRAWN') return false;
    const withdrawableStatuses = ['PENDING', 'REVIEWING'];
    const today = new Date().toISOString().split('T')[0];
    const closingDate = application.job_postings?.closing_date;
    return withdrawableStatuses.includes(application.status) && closingDate >= today;
  };

  const [successMessage, setSuccessMessage] = useState(null);

const handleWithdraw = async (application) => {
  // REMOVE THIS LINE (modal handles confirmation)
  // if (!window.confirm('Are you sure you want to withdraw this application? This action cannot be undone.')) {
  //   return;
  // }
  
  setWithdrawing(true);
  
  try {
    const { error: updateError } = await supabase
      .from('applications')
      .update({ 
        status: 'WITHDRAWN',
        updated_at: new Date().toISOString()
      })
      .eq('id', application.id);
    
    if (updateError) throw updateError;
    
    const { data: currentJob } = await supabase
      .from('job_postings')
      .select('applicants_count')
      .eq('id', application.job_id)
      .single();

    const newCount = Math.max((currentJob?.applicants_count || 0) - 1, 0);

    const { error: countError } = await supabase
      .from('job_postings')
      .update({ applicants_count: newCount })
      .eq('id', application.job_id);
    
    if (countError) throw countError;
    
    // Show success message instead of alert
    setSuccessMessage('Application withdrawn successfully!');
    setTimeout(() => setSuccessMessage(null), 3000);
    
    const { data: { user } } = await supabase.auth.getUser();
    await loadApplications(user.id);
    
  } catch (error) {
    console.error('Error withdrawing application:', error);
    alert('Failed to withdraw application. Please try again.');
  }
  
  setWithdrawing(false);
};


  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const formatSalary = (salary) => {
    if (!salary) return 'N/A';
    return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(salary);
  };

  const getEducationLabel = (value) => {
    if (value === undefined || value === null) return 'None Required';
    return EDUCATION_LABELS[value] || `Level ${value}`;
  };

  const getEligibilityLabel = (value) => {
    if (!value || value === 'none') return 'None Required';
    return ELIGIBILITY_LABELS[value] || value;
  };

  const getTrainingLabel = (value) => {
    if (!value || value === 'None Required' || value === 0) return 'None Required';
    const hours = parseInt(value) || 0;
    if (hours === 0) return 'None Required';
    return hours === 1 ? `${hours} hour` : `${hours} hours`;
  };

  const getExperienceLabel = (value) => {
    if (!value || value === 0 || value === 'None Required') return 'None Required';
    const years = parseInt(value) || 0;
    if (years === 0) return 'None Required';
    return years === 1 ? `${years} year` : `${years} years`;
  };

  // ===== NEW: Format education recommendation with assementlike =====
 const formatEducationRecommendation = (rec) => {
  // Education recommendation
  if (rec.includes('education level')) {
    const match = rec.match(/level (\d+).*level (\d+)/);
    if (match) {
      const current = parseInt(match[1]);
      const required = parseInt(match[2]);
      const currentLabel = EDUCATION_LABELS[current] || `Level ${current}`;
      const requiredLabel = EDUCATION_LABELS[required] || `Level ${required}`;
      
      if (current < required) {
        return `You have a ${currentLabel}. This position requires ${requiredLabel}.`;
      } else {
        return `You meet the required ${requiredLabel} qualification.`;
      }
    }
  }
    
  // Training hours recommendation
  if (rec.includes('training') || rec.includes('hours')) {
    const match = rec.match(/(\d+)\s*(?:more)?\s*hours?/i);
    if (match) {
      const hours = parseInt(match[1]);
      return `You need to complete ${hours} more hour${hours > 1 ? 's' : ''} of relevant training.`;
    }
    return rec;
  }
    
    // Return as is if no match
    return rec;
  };

  // FIXED: Helper to check if a requirement is met based on status
  const isRequirementMet = (value) => {
    if (!value || !value.status) return false;
    const status = value.status;
    
    // Check if status contains "NOT MET" - if so, return false immediately
    if (status.toUpperCase().includes('NOT MET')) {
      return false;
    }
    
    // Check if status contains MET or EXCEEDS (case insensitive)
    return status.toUpperCase().includes('MET') || status.toUpperCase().includes('EXCEEDS');
  };

  // FIXED: Generate human-readable display for breakdown items
  const getBreakdownDisplay = (key, value) => {
    const status = value.status || '';
    const required = value.required || 0;
    const actual = value.actual || 0;
    
    // Clean status - remove emojis and extra text
    let cleanStatus = status;
    
    // Remove EXCEEDS prefix and just show the message
    if (cleanStatus.includes('EXCEEDS')) {
      const match = cleanStatus.match(/EXCEEDS\s*\((.+)\)/);
      if (match) {
        return match[1];
      }
      return cleanStatus.replace('EXCEEDS', '').trim();
    }
    
    // Check if it's NOT MET
    const isNotMet = status.toUpperCase().includes('NOT MET');
    
    // For MET or partial
    if (key === 'Training Hours') {
      const progress = required > 0 ? Math.round((actual / required) * 100) : 0;
      const gap = required - actual;
      if (status.toUpperCase().includes('MET') && !isNotMet) {
        return `${actual}/${required} hours (met)`;
      } else if (status.toUpperCase().includes('NOT REQUIRED')) {
        return 'Not Required';
      } else {
        return `${actual}/${required} hours (needs ${gap} more hours)`;
      }
    }
    
    if (key === 'Education') {
      const eduLabels = ['', 'Elementary', 'High School', '2-Year College', "Bachelor's", "Master's", "PhD/Doctorate"];
      const actualLabel = eduLabels[actual] || `Level ${actual}`;
      const reqLabel = eduLabels[required] || `Level ${required}`;
      if (status.toUpperCase().includes('MET') && !isNotMet) {
        return `${actualLabel} (meets ${reqLabel} requirement)`;
      } else if (status.toUpperCase().includes('NOT REQUIRED')) {
        return 'Not Required';
      } else {
        return `${actualLabel} (needs ${reqLabel})`;
      }
    }
    
    if (key === 'Experience') {
      if (status.toUpperCase().includes('MET') && !isNotMet) {
        return `${actual} years (meets ${required} year requirement)`;
      } else if (status.toUpperCase().includes('NOT REQUIRED')) {
        return 'Not Required';
      } else {
        return `${actual} years (needs ${required} years)`;
      }
    }
    
    if (key === 'Eligibility') {
      // Handle unknown/no eligibility
      if (actual === 'unknown' || actual === 'none' || !actual) {
        if (status.toUpperCase().includes('NOT REQUIRED')) {
          return 'Not Required';
        } else {
          return `No eligibility (needs ${required})`;
        }
      }
      
      // FIXED: Handle NOT MET first
      if (isNotMet) {
        const eligLabel = getEligibilityLabel(actual);
        const reqLabel = getEligibilityLabel(required);
        if (eligLabel && eligLabel !== 'None Required') {
          return `${eligLabel} (needs ${reqLabel})`;
        }
        return `No eligibility (needs ${required})`;
      }
      
      if (status.toUpperCase().includes('EXCEEDS')) {
        const match = status.match(/EXCEEDS\s*\((.+)\)/);
        if (match) {
          return match[1];
        }
        return cleanStatus.replace('EXCEEDS', '').trim();
      } else if (status.toUpperCase().includes('MET')) {
        const eligLabel = getEligibilityLabel(actual);
        if (eligLabel && eligLabel !== 'None Required') {
          return `${eligLabel} (meets requirement)`;
        }
        return 'Meets requirement';
      } else if (status.toUpperCase().includes('NOT REQUIRED')) {
        return 'Not Required';
      } else {
        const eligLabel = getEligibilityLabel(actual);
        if (eligLabel && eligLabel !== 'None Required') {
          return `${eligLabel} (needs ${required})`;
        }
        return `No eligibility (needs ${required})`;
      }
    }
    
    return cleanStatus;
  };

  // Helper to get the display score (hybrid score from ai_explanation.percentage or fallback to ai_match_score)
const getDisplayScore = (app) => {
  if (app.ai_explanation?.percentage !== undefined && app.ai_explanation?.percentage !== null) {
    return app.ai_explanation.percentage;
  }
  return app.ai_match_score || 0;
};

  // Helper to get the requirements met display
  const getRequirementsMetDisplay = (app) => {
    if (app.ai_explanation?.requirements_met) {
      return app.ai_explanation.requirements_met;
    }
    return null;
  };

  const stats = {
    total: applications.length,
    pending: applications.filter(a => a.status === 'PENDING' || a.status === 'REVIEWING').length,
    shortlisted: applications.filter(a => a.status === 'SHORTLISTED' || a.status === 'INTERVIEW').length,
    hired: applications.filter(a => a.status === 'HIRED').length
  };

  return (
    <>
      <Navbar userRole="applicant" />
      
      <div className="applications-container">
        <div className="page-header">
          <h1>My Applications</h1>
          <p>Track the status of all your job applications</p>
        </div>

        <div className="stats-cards">
          <div className="stat-card">
            <span className="stat-number">{stats.total}</span>
            <span className="stat-label">Total Applications</span>
          </div>
          <div className="stat-card">
            <span className="stat-number">{stats.pending}</span>
            <span className="stat-label">Active Applications</span>
          </div>
          <div className="stat-card">
            <span className="stat-number">{stats.shortlisted}</span>
            <span className="stat-label">For Interview</span>
          </div>
          <div className="stat-card">
            <span className="stat-number">{stats.hired}</span>
            <span className="stat-label">Hired</span>
          </div>
        </div>

        <div className="applications-list" style={{ position: 'relative' }}>
          {loading ? (
            <div className="loading-state"><Loader/> </div>
          ) : applications.length === 0 ? (
            <div className="empty-state">
              <p>You haven't submitted any applications yet.</p>
              <p style={{ fontSize: 13, marginTop: 8 }}>
                <a href="/applicant/jobs" style={{ color: '#4f46e5' }}>Browse Jobs</a> to get started!
              </p>
            </div>
          ) : (
            applications.map((app) => {
              const job = app.job_postings;
              const statusStyle = getStatusColor(app.status);
              const canWithdrawApp = canWithdraw(app);
              const displayScore = getDisplayScore(app);
              const requirementsMet = getRequirementsMetDisplay(app);
              
              return (
                <div key={app.id} className="application-card">
                  <div className="card-header">
                    <h3 className="job-title">{job?.position_title || 'Position Not Found'}</h3>
                    <span className="status-badge" style={{ backgroundColor: statusStyle.bg, color: statusStyle.color }}>
                      {statusStyle.text}
                    </span>
                  </div>
                  <div className="job-location">
                    <img src={locationLogo} alt="location" className="location-icon" /> {job?.place_of_assignment || 'N/A'}
                  </div>
                  <div className="job-details">
                    <span><img src={calendarminimalLogo} alt="document" className="calendar-blue-icon" /> Applied: {formatDate(app.applied_date)}</span>
                    {displayScore !== null && displayScore !== undefined && (
                      <span style={{ 
                        background: displayScore >= 80 ? '#e8f5e9' : displayScore >= 60 ? '#fff3e0' : '#ffebee',
                        color: displayScore >= 80 ? '#2e7d32' : displayScore >= 60 ? '#e65100' : '#c62828',
                        padding: '2px 10px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: '600'
                      }}>
                        Score: {displayScore}% {requirementsMet && `(${requirementsMet} met)`}
                      </span>
                    )}
                  </div>

                  <div className="documents-section">
                    <div className="documents-title">Required Documents</div>
                    <div className="documents-list">
                      <span className="doc-item">
                        {getDocumentStatus(app.docs_submitted, 'pds') ? 
                          <span className="doc-check">✓ PDS</span> : 
                          <span className="doc-missing">✗ PDS</span>}
                      </span>
                      {job?.required_docs?.transcriptRecords && (
                        <span className="doc-item">
                          {getDocumentStatus(app.docs_submitted, 'transcript') ? 
                            <span className="doc-check">✓ Transcript</span> : 
                            <span className="doc-missing">✗ Transcript</span>}
                        </span>
                      )}
                      {job?.required_docs?.performanceRating && (
                        <span className="doc-item">
                          {getDocumentStatus(app.docs_submitted, 'performanceRating') ? 
                            <span className="doc-check">✓ Performance Rating</span> : 
                            <span className="doc-missing">✗ Performance Rating</span>}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="card-actions">
                    <button className="view-btn" onClick={() => {
                      setSelectedApplication(app);
                      setShowDetailsModal(true);
                    }}>
                      View Details
                    </button>
                    {canWithdrawApp && (
                      <button 
                        className="withdraw-btn" 
                        onClick={() => {
      setSelectedWithdrawApp(app);
      setShowWithdrawModal(true);
    }}
                        disabled={withdrawing}
                      >
                        Withdraw
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
      
{/* Withdraw Confirmation Modal */}
{showWithdrawModal && selectedWithdrawApp && (
  <div className="modal-overlay" onClick={() => setShowWithdrawModal(false)}>
    <div className="confirm-card" onClick={(e) => e.stopPropagation()} style={{ 
      width: '500px',
      maxWidth: '90vw'
    }}>
      {/* Simple Header with Icon */}
      <div className="confirm-card-header" style={{ paddingBottom: '8px' }}>
        <span className="confirm-icon" style={{ fontSize: '28px' }}>⚠️</span>
        <h3 style={{ fontSize: '20px', margin: '4px 0 0 0' }}>Withdraw Application</h3>
      </div>
      
      {/* Message */}
      <div className="confirm-card-body" style={{ padding: '8px 24px 16px 24px' }}>
        <p style={{ marginBottom: '12px', fontSize: '15px' }}>
          Are you sure you want to withdraw your application for:
        </p>
        <p style={{ 
          fontWeight: '600', 
          fontSize: '17px', 
          color: '#1a1f36',
          marginBottom: '12px'
        }}>
          {selectedWithdrawApp.job_postings?.position_title || 'Position Not Found'}
        </p>
        <p style={{ 
          color: '#6c757d', 
          fontSize: '14px',
          margin: 0
        }}>
          This action <strong>cannot be undone</strong>.
        </p>
      </div>
      
      {/* Actions */}
      <div className="confirm-card-footer" style={{ 
        margin: '0 -24px -24px -24px', 
        padding: '16px 24px', 
        borderRadius: '0 0 12px 12px',
        display: 'flex',
        justifyContent: 'flex-end',
        gap: '10px'
      }}>
        <button 
          className="btn-cancel"
          onClick={() => setShowWithdrawModal(false)}
          style={{
            padding: '8px 24px',
            background: '#D3F0F9',
            color: '#4a5568',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: '500',
            transition: 'background 0.2s ease'
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = '#b8e4f0'}
  onMouseLeave={(e) => e.currentTarget.style.background = '#D3F0F9'}
        >
          Cancel
        </button>
        <button 
          onClick={() => {
            setShowWithdrawModal(false);
            handleWithdraw(selectedWithdrawApp);
          }}
          disabled={withdrawing}
          style={{ 
            padding: '8px 24px',
            background: '#dc2626',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: withdrawing ? 'not-allowed' : 'pointer',
            fontWeight: '500',
            transition: 'background 0.2s ease',
            opacity: withdrawing ? 0.6 : 1
          }}
          onMouseEnter={(e) => {
            if (!withdrawing) {
              e.currentTarget.style.background = '#b91c1c';
            }
          }}
          onMouseLeave={(e) => {
            if (!withdrawing) {
              e.currentTarget.style.background = '#dc2626';
            }
          }}
        >
          {withdrawing ? 'Withdrawing...' : 'Yes, Withdraw'}
        </button>
      </div>
    </div>
  </div>
)}

{/* Success Notification */}
{successMessage && (
  <div style={{
    position: 'fixed',
    bottom: '20px',
    right: '20px',
    padding: '12px 20px',
    background: '#0D9488',
    color: 'white',
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    zIndex: 9999,
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  }}>
    <CircularCheckSuccessIcon size={22} style={{ color: 'white' }} />
    {successMessage}
  </div>
)}


          {/* Modal */}
      {showDetailsModal && selectedApplication && (
        <div className="modal-overlay" onClick={() => setShowDetailsModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '720px' }}>
            
            {/* ── HEADER ── */}
            <div className="modal-header" style={{
              background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
              borderBottom: '1px solid #bfdbfe',
              borderRadius: '16px 16px 0 0',
              padding: '20px 24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '40px', height: '40px', borderRadius: '10px', background: 'white',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 2px 6px rgba(37,99,235,0.12)', flexShrink: 0
                }}>
                  <BasiconsBriefcaseIcon size={20} color="#4F46E5" />
                </div>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#1a3a5c', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '2px' }}>
                    Application Details
                  </div>
                  <h2 style={{ margin: 0, fontSize: '18px', color: '#1a1f36', fontWeight: 700 }}>
                    {selectedApplication.job_postings?.position_title}
                  </h2>
                </div>
              </div>
              <button className="close-modal" onClick={() => setShowDetailsModal(false)}>×</button>
            </div>

            <div className="modal-body">
              
              {/* ── POSITION INFORMATION ── */}
              <div className="detail-section" style={{ background: '#f8fafc', border: '1px solid #e8ebf5', borderRadius: '12px', padding: '18px 20px', marginBottom: '16px' }}>
                <h4 style={{ fontSize: '12px', fontWeight: 700, color: '#1a3a5c', letterSpacing: '0.8px', textTransform: 'uppercase', margin: '0 0 14px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color: '#4F46E5' }}>■</span> Position Information
                </h4>
                <div className="detail-grid">
                  <div><span className="detail-label">Position Title</span><span className="detail-value">{selectedApplication.job_postings?.position_title}</span></div>
                  <div><span className="detail-label">Place of Assignment</span><span className="detail-value">{selectedApplication.job_postings?.place_of_assignment}</span></div>
                  <div><span className="detail-label">Item No.</span><span className="detail-value">{selectedApplication.job_postings?.item_no || 'N/A'}</span></div>
                  <div>
                    <span className="detail-label">Salary Grade</span>
                    <span className="detail-value" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#eef2ff', borderRadius: '6px', fontWeight: 700, color: '#1a3a5c' }}>
                      {selectedApplication.job_postings?.salary_grade || 'N/A'}
                    </span>
                  </div>
                 

                 
                 

                 <div>
  <span className="detail-label">Closing Date</span>
  <span 
    className="detail-value" 
    style={{ 
      display: 'flex', 
      alignItems: 'center', 
      gap: '8px', 
      marginTop: '4px',
      fontWeight: 600, 
      color: '#1a3a5c' /* standard dark text */
    }}
  >
    {/* ✅ Glowing dot */}
    <span style={{ 
      width: '6px', 
      height: '6px', 
      borderRadius: '50%', 
      background: '#f70909', /* amber */
      boxShadow: '0 0 0 3px rgba(245, 158, 11, 0.2)', /* glow */
      flexShrink: 0 
    }} />
    {formatDate(selectedApplication.job_postings?.closing_date)}
  </span>
</div>

                      <div>
                    <span className="detail-label">Monthly Salary</span>
                    <span className="detail-value" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#eef2ff', borderRadius: '6px', fontWeight: 700, color: '#1a3a5c' }}>
                      {formatSalary(selectedApplication.job_postings?.monthly_salary)}
                    </span>
                  </div>
                </div>

                
              </div>

              {/* ── AI ASSESSMENT (Kept your exact logic, wrapped in your CSS) ── */}
              {(selectedApplication.ai_match_score != null || selectedApplication.ai_explanation?.percentage != null) && (
                <div className="detail-section ai-detail-section" style={{ background: '#f8fafc', border: '1px solid #e8ebf5', borderRadius: '12px', padding: '18px 20px', marginBottom: '16px' }}>
                  <div className="ai-assessment-card">
                    <div className="ai-header">
                      <div className="ai-header-left">
                        <div className="ai-icon">✦</div>
                        <div>
                          <h4>Assessment</h4>
                          <p>AI-assisted candidate evaluation</p>
                        </div>
                      </div>
                      <div className="analysis-status">
                        <span className="status-dot"></span>
                        Analysis Complete
                      </div>
                    </div>

                    <div className="ai-score-card">
                      <div className="score-content">
                        <div
                          className="score-circle"
                          style={{
                            "--score": `${Math.min(100, Math.max(0, Number(getDisplayScore(selectedApplication)) || 0))}%`
                          }}
                        >
                          <div className="score-circle-inner">
                            <span className="score-number">
                              {getDisplayScore(selectedApplication)}<small>%</small>
                            </span>
                            <span className="score-label">Fit Score</span>
                          </div>
                        </div>

                        <div className="score-details">
                          <span className={`match-badge ${
                            Number(getDisplayScore(selectedApplication)) >= 80 ? "strong" :
                            Number(getDisplayScore(selectedApplication)) >= 60 ? "moderate" : "low"
                          }`}>
                            {Number(getDisplayScore(selectedApplication)) >= 80 ? "Strong Match" :
                             Number(getDisplayScore(selectedApplication)) >= 60 ? "Moderate Match" : "Low Match"}
                          </span>
                          <h3>Candidate Compatibility</h3>
                          <p>
                            {Number(getDisplayScore(selectedApplication)) >= 80 ? "High compatibility with the specified job requirements." :
                             Number(getDisplayScore(selectedApplication)) >= 60 ? "Some qualifications may require further review." :
                             "Several qualifications require further evaluation."}
                          </p>
                          {getRequirementsMetDisplay(selectedApplication) != null && (
                            <div className="score-note">
                              <span>ⓘ</span> {getRequirementsMetDisplay(selectedApplication)} requirements met
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Qualification Breakdown */}
                    {selectedApplication.ai_explanation?.breakdown &&
                      Object.keys(selectedApplication.ai_explanation.breakdown).some(
                        key => !(selectedApplication.ai_explanation.breakdown[key].status && selectedApplication.ai_explanation.breakdown[key].status.toUpperCase().includes("NOT REQUIRED"))
                      ) && (
                      <div className="ai-breakdown-section">
                        <div className="ai-section-heading">
                          <div>
                            <h5>Qualification Breakdown</h5>
                            <p>Assessment of individual job qualifications</p>
                          </div>
                          <span className="section-tag">
                            {Object.entries(selectedApplication.ai_explanation.breakdown).filter(([key, value]) =>
                              !(value.status && value.status.toUpperCase().includes("NOT REQUIRED"))
                            ).length} Criteria
                          </span>
                        </div>

                        <div className="ai-breakdown-list">
                          {Object.entries(selectedApplication.ai_explanation.breakdown).map(([key, value]) => {
                            if (value.status && value.status.toUpperCase().includes("NOT REQUIRED")) return null;
                            const isMet = isRequirementMet(value);
                            const isNotMet = value.status && value.status.toUpperCase().includes("NOT MET");
                            const displayText = getBreakdownDisplay(key, value);
                            const rawProgress = Number(value.progress);
                            const hasProgress = value.progress !== null && value.progress !== undefined && Number.isFinite(rawProgress);
                            const progressPercent = hasProgress ? Math.min(100, Math.max(0, rawProgress <= 1 ? rawProgress * 100 : rawProgress)) : 0;

                            return (
                              <div className="ai-breakdown-row" key={key}>
                                <div className="ai-breakdown-top">
                                  <div className="ai-breakdown-name">
                                    <span className="ai-breakdown-dot"></span> {key}
                                  </div>
                                  <span className={`ai-breakdown-status ${isNotMet ? "not-met" : isMet ? "met" : "partial"}`}>
                                    {isNotMet ? "Needs Review" : isMet ? "Requirement Met" : "Partial Match"}
                                  </span>
                                </div>
                                {hasProgress && (
                                  <div className="ai-progress-track">
                                    <div className={`ai-progress-fill ${isNotMet ? "progress-warning" : isMet ? "progress-success" : "progress-partial"}`} style={{ width: `${progressPercent}%` }} />
                                  </div>
                                )}
                                <div className="ai-breakdown-description">{displayText}</div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Recommendations */}
                    {selectedApplication.ai_explanation?.recommendations?.length > 0 && (
                      <div className="ai-recommendations redesigned-recommendations">
                        <div className="recommendations-heading">
                          <span className="recommendations-icon">ⓘ</span>
                          <div>
                            <h5>Recommendations</h5>
                            <p>Areas that may need further attention</p>
                          </div>
                        </div>
                        <ul>
                          {selectedApplication.ai_explanation.recommendations.map((rec, idx) => (
                            <li key={idx}>{formatEducationRecommendation(rec)}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Disclaimer */}
                    <div className="ai-disclaimer">
                      <span className="disclaimer-icon">ⓘ</span>
                      <p>
                        <strong>Important Notice:</strong> This generated assessment is intended to assist in evaluating applicant qualifications. It does not constitute a final hiring decision. Assessment results should be reviewed and validated by authorized HR personnel.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* ── QUALIFICATIONS REQUIRED ── */}
              <div className="detail-section" style={{ background: '#f8fafc', border: '1px solid #e8ebf5', borderRadius: '12px', padding: '18px 20px', marginBottom: '16px' }}>
                <h4 style={{ fontSize: '12px', fontWeight: 700, color: '#1a3a5c', letterSpacing: '0.8px', textTransform: 'uppercase', margin: '0 0 14px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color: '#0d9488' }}>■</span> Qualifications Required
                </h4>
                <div className="detail-grid">
                  <div>
                    <span className="detail-label">Education</span>
                    <span className="detail-value">
                      {(() => {
                        const val = selectedApplication.job_postings?.required_education;
                        if (val === undefined || val === null || val === '') return 'None Required';
                        const num = parseInt(val);
                        return !isNaN(num) ? EDUCATION_LABELS[num] || val : val;
                      })()}
                    </span>
                  </div>
                  <div><span className="detail-label">Eligibility</span><span className="detail-value">{selectedApplication.job_postings?.required_eligibility || 'None Required'}</span></div>
                  <div><span className="detail-label">Training</span><span className="detail-value">{selectedApplication.job_postings?.required_training || 'None Required'}</span></div>
                  <div><span className="detail-label">Work Experience</span><span className="detail-value">{selectedApplication.job_postings?.required_work_experience || 'None Required'}</span></div>
                </div>
              </div>

              {/* ── APPLICATION STATUS ── */}
              <div className="detail-section" style={{ background: '#f8fafc', border: '1px solid #e8ebf5', borderRadius: '12px', padding: '18px 20px', marginBottom: '16px' }}>
                <h4 style={{ fontSize: '12px', fontWeight: 700, color: '#1a3a5c', letterSpacing: '0.8px', textTransform: 'uppercase', margin: '0 0 14px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color: '#f59e0b' }}>■</span> Application Status
                </h4>
                <div className="detail-grid">
                  <div><span className="detail-label">Current Status</span><span className="detail-value">{selectedApplication.status}</span></div>
                  <div><span className="detail-label">Date Applied</span><span className="detail-value">{formatDate(selectedApplication.applied_date)}</span></div>
                  <div><span className="detail-label">Last Updated</span><span className="detail-value">{formatDate(selectedApplication.updated_at)}</span></div>
                </div>
              </div>

              {/* ── DOCUMENTS SUBMITTED ── */}
<div className="detail-section" style={{ background: '#f8fafc', border: '1px solid #e8ebf5', borderRadius: '12px', padding: '18px 20px', marginBottom: '16px' }}>
  <h4 style={{ fontSize: '12px', fontWeight: 700, color: '#1a3a5c', letterSpacing: '0.8px', textTransform: 'uppercase', margin: '0 0 14px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
    {/* ✅ Replaced square with glowing dot */}
    <span style={{ 
      width: '8px', 
      height: '8px', 
      borderRadius: '50%', 
      background: '#6366f1',
      boxShadow: '0 0 0 3px rgba(99, 102, 241, 0.15)',
      flexShrink: 0 
    }} /> 
    Documents Submitted
  </h4>
  <div className="documents-list" style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', color: '#1a1f36' }}>
    {selectedApplication.docs_submitted?.pds && <span className="doc-check" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ color: '#10b981' }}>✓</span> Personal Data Sheet (PDS)</span>}
    {selectedApplication.docs_submitted?.transcript && <span className="doc-check" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ color: '#10b981' }}>✓</span> Transcript of Records</span>}
    {selectedApplication.docs_submitted?.performanceRating && <span className="doc-check" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ color: '#10b981' }}>✓</span> Performance Rating</span>}
  </div>
</div>

              {/* Close Button */}
              <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                <button 
                  className="close-btn" 
                  onClick={() => setShowDetailsModal(false)} 
                  style={{ flex: 1, padding: '12px', background: '#f3f4f6', color: '#4a5568', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, transition: 'background 0.2s ease' }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#e5e7eb'}
                  onMouseLeave={(e) => e.currentTarget.style.background = '#f3f4f6'}
                >
                  Close
                </button>
              </div>

            </div>
          </div>
        </div>
      )}
    </>
  );
}
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { supabase } from "../lib/supabase";
import { getJobPostings } from "../services/jobService";
import '../styles/BrowseJobsPage.css';
import { CalendarColoredIcon, ApplicantCheckboxIcon, BasiconsFolderIcon, BasiconsDocumentIcon, BasiconsBriefcaseIcon } from "../components/icons/CustomIcons";
import calendarLogo from '../assets/icon-calendar.png'
import calendarminimalLogo from '../assets/calendar-minimal-icon.png';
import Loader from '../components/Loader';
;
// =========================
// PYTHON API URL
// =========================
const API_URL = "http://127.0.0.1:8000";

export default function BrowseJobsPage() {
  const [applicantProfile, setApplicantProfile] = useState(null);
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLocation, setSelectedLocation] = useState("All");
  const [selectedJob, setSelectedJob] = useState(null);
  const [showJobDetailsModal, setShowJobDetailsModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [applicant, setApplicant] = useState(null);
  const [appliedJobs, setAppliedJobs] = useState({});
  const [screeningResult, setScreeningResult] = useState(null);
  const [showResults, setShowResults] = useState(false);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [successData, setSuccessData] = useState(null);
  
  const [application, setApplication] = useState({
    coverLetter: "",
    documents: {}
  });

  // =========================
  // EDUCATION & ELIGIBILITY LABELS
  // =========================
  const EDUCATION_LABELS = {
    0: "None Required",
    1: "Elementary Graduate",
    2: "High School Graduate",
    3: "2-Year College / Associate",
    4: "Bachelor's Degree",
    5: "Master's Degree"
  };

  const ELIGIBILITY_LABELS = {
    "none": "None Required",
    "subprofessional": "Career Service Subprofessional",
    "professional": "Career Service Professional"
  };

  const getEducationLabel = (value) => {
    if (value === undefined || value === null) return 'None Required';
    return EDUCATION_LABELS[value] || `Level ${value}`;
  };

  const getEligibilityLabel = (value) => {
    if (!value || value === 'none') return 'None Required';
    return ELIGIBILITY_LABELS[value] || value;
  };

  const getExperienceLabel = (value) => {
    if (!value || value === 0 || value === 'None Required') return 'None Required';
    const years = parseInt(value) || 0;
    if (years === 0) return 'None Required';
    return years === 1 ? `${years} year` : `${years} years`;
  };

  const getTrainingLabel = (value) => {
    if (!value || value === 'None Required' || value === 0) return 'None Required';
    const hours = parseInt(value) || 0;
    if (hours === 0) return 'None Required';
    return hours === 1 ? `${hours} hour` : `${hours} hours`;
  };

 // ─── EFFECT #1: Get applicant + load profile docs ───
useEffect(() => {
  const getApplicant = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setApplicant(user);
      await loadAppliedJobs(user.id);
      
      // Load profile docs
      const { data: profile } = await supabase
        .from('applicants')
        .select('pds_file_url, tor_file_url, performance_rating_file_url, parsed_pds_raw')
        .eq('id', user.id)
        .maybeSingle();
      
      setApplicantProfile(profile || null);
    } else {
      navigate('/login');
    }
  };
  getApplicant();
}, [navigate]);



// ─── EFFECT #2: Load jobs 
  useEffect(() => {
    loadJobs();
  }, []);

  const loadJobs = async () => {
    setLoading(true);
    const result = await getJobPostings();
    if (result.success) {
      setJobs(result.data);
    }
    setLoading(false);
  };

  const loadAppliedJobs = async (applicantId) => {
    try {
      const { data, error } = await supabase
        .from('applications')
        .select('job_id, status')
        .eq('applicant_id', applicantId)
        .neq('status', 'WITHDRAWN');
      
      if (error) {
        console.error('Error loading applied jobs:', error);
        return;
      }
      
      if (data) {
        const appliedMap = {};
        data.forEach(app => {
          appliedMap[app.job_id] = true;
        });
        setAppliedJobs(appliedMap);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  // =========================
  // DETECT JOB CATEGORY
  // =========================
  const detectJobCategory = (positionTitle) => {
    const title = positionTitle.toLowerCase();
    if (title.includes('it') || title.includes('information technology') || title.includes('developer') || title.includes('tech')) return 'it';
    if (title.includes('engineer')) return 'engineering';
    if (title.includes('account') || title.includes('budget') || title.includes('finance')) return 'finance';
    if (title.includes('admin') || title.includes('clerk') || title.includes('officer')) return 'administrative';
    if (title.includes('building') || title.includes('construction') || title.includes('inspector')) return 'construction';
    if (title.includes('utility') || title.includes('mechanic') || title.includes('technician')) return 'technical';
    if (title.includes('information') || title.includes('media') || title.includes('communication')) return 'communications';
    if (title.includes('social') || title.includes('community') || title.includes('welfare')) return 'social_services';
    if (title.includes('planning') || title.includes('development')) return 'planning';
    if (title.includes('sports') || title.includes('recreation')) return 'sports';
    if (title.includes('agriculture') || title.includes('veterinary') || title.includes('slaughterhouse')) return 'agriculture';
    return 'administrative';
  };

  // =========================
  // SCREEN PDS WITH PYTHON API
  // =========================
  const screenPDSWithAPI = async (pdsFile, job) => {
    let educationValue = job.qualifications?.education || 3;
    let experienceValue = job.qualifications?.workExperience || 1;
    let trainingValue = job.qualifications?.training || 4;
    const eligibilityValue = job.qualifications?.eligibility || "professional";

    if (educationValue === "None Required" || educationValue === "" || educationValue === null) {
      educationValue = 0;
    } else {
      educationValue = parseInt(educationValue) || 0;
    }

    if (experienceValue === "None Required" || experienceValue === "" || experienceValue === null) {
      experienceValue = 0;
    } else {
      experienceValue = parseInt(experienceValue) || 0;
    }

    if (trainingValue === "None Required" || trainingValue === "" || trainingValue === null) {
      trainingValue = 0;
    } else {
      trainingValue = parseInt(trainingValue) || 0;
    }

    const formData = new FormData();
    formData.append('file', pdsFile);

    const params = new URLSearchParams({
      position_title: job.position_title || "Position",
      job_category: detectJobCategory(job.position_title),
      education: educationValue,
      experience: experienceValue,
      training_hours: trainingValue,
      eligibility_level: eligibilityValue
    });

    console.log('📤 Sending to API:', {
      url: `${API_URL}/upload-pds?${params}`,
      education: educationValue,
      experience: experienceValue,
      training_hours: trainingValue,
      eligibility_level: eligibilityValue
    });

    try {
      const response = await fetch(`${API_URL}/upload-pds?${params}`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API Error (${response.status}): ${errorText}`);
      }

      const result = await response.json();
      console.log('📥 API Response:', result);
      return result;
      
    } catch (error) {
      console.error('❌ Error screening PDS:', error);
      throw error;
    }
  };

  const handleViewDetails = (job) => {
    setSelectedJob(job);
    setScreeningResult(null);
    setShowResults(false);
    setShowSuccessPopup(false);
    
    const requiredDocs = job.required_docs || {};
    const initialDocs = {};
    
    // Always include PDS
    initialDocs.pds = null;
    
    // Check each required document type
    if (requiredDocs.transcriptRecords) initialDocs.transcript = null;
    if (requiredDocs.performanceRating) initialDocs.performanceRating = null;
    
    setApplication({
      coverLetter: "",
      documents: initialDocs
    });
    setShowJobDetailsModal(true);
  };

  const handleFileChange = (e, docType) => {
    const file = e.target.files[0];
    if (file) {
      setApplication({
        ...application,
        documents: {
          ...application.documents,
          [docType]: file
        }
      });
    }
  };

  const handleRemoveFile = (docType) => {
    setApplication({
      ...application,
      documents: {
        ...application.documents,
        [docType]: null
      }
    });
  };

  // =============================================
  // UPLOAD FILE - RETURNS BOTH URL AND FILENAME
  // =============================================
  const uploadFile = async (file, folder, docType) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${docType}_${Date.now()}.${fileExt}`;
    const filePath = `${folder}/${fileName}`;
    
    const { error } = await supabase.storage
      .from('applicant_docs')
      .upload(filePath, file);
    
    if (error) throw error;
    
    const { data: { publicUrl } } = supabase.storage
      .from('applicant_docs')
      .getPublicUrl(filePath);
    
    return { publicUrl, fileName };
  };

  const getOrCreateApplicant = async (user) => {
    const { data: existing } = await supabase
      .from('applicants')
      .select('*')
      .eq('id', user.id)
      .single();
    
    if (existing) return existing;
    
    const { data: newApplicant, error } = await supabase
      .from('applicants')
      .insert([{
        id: user.id,
        full_name: user.user_metadata?.full_name || user.email,
        email: user.email,
        created_at: new Date().toISOString()
      }])
      .select()
      .single();
    
    if (error) throw error;
    return newApplicant;
  };

  // =========================
  // HANDLE SUBMIT APPLICATION WITH API INTEGRATION
  // =========================
  // =========================
// HANDLE SUBMIT APPLICATION WITH PROFILE DOCS
// =========================
const handleSubmitApplication = async () => {
  if (!applicant) {
    alert("Please login to apply");
    return;
  }

  setSubmitting(true);
  setScreeningResult(null);
  setShowResults(false);

  try {
    // ═══════════════════════════════════════════════════════════
    // STEP 1: Load profile documents  ← 🆕 NEW
    // ═══════════════════════════════════════════════════════════
    const { data: profileDocs, error: profileError } = await supabase
      .from('applicants')
      .select(`
        pds_file_url,
        tor_file_url,
        performance_rating_file_url,
        parsed_pds_raw,
        has_pds,
        has_transcript
      `)
      .eq('id', applicant.id)
      .maybeSingle();

    if (profileError) {
      console.warn('Could not load profile docs:', profileError);
    }

    // ═══════════════════════════════════════════════════════════
// STEP 2: Validate required docs exist in PROFILE OR FORM
// ═══════════════════════════════════════════════════════════
const requiredDocs = selectedJob.required_docs || {};
const missingDocs = [];

// PDS can come from profile OR from the form upload
const hasPds =
  !!profileDocs?.pds_file_url ||
  !!application.documents?.pds;

if (!hasPds) {
  missingDocs.push('Personal Data Sheet (PDS)');
}

if (missingDocs.length > 0) {
  const confirmed = window.confirm(
    `This job requires the following documents that are missing from your profile:\n\n` +
    `${missingDocs.map(d => '• ' + d).join('\n')}\n\n` +
    `Would you like to go to your Profile page to upload them?`
  );
  if (confirmed) {
    setShowJobDetailsModal(false);
    navigate('/applicant/profile');
  }
  setSubmitting(false);
  return;
}

    // ═══════════════════════════════════════════════════════════
    // STEP 3: Check if already applied (unchanged)
    // ═══════════════════════════════════════════════════════════
    const { data: existingApp, error: checkError } = await supabase
      .from('applications')
      .select('id, status')
      .eq('job_id', selectedJob.id)
      .eq('applicant_id', applicant.id)
      .maybeSingle();

    if (checkError) {
      console.error('Error checking existing application:', checkError);
      alert('Error checking application status. Please try again.');
      setSubmitting(false);
      return;
    }

    if (existingApp && existingApp.status !== 'WITHDRAWN') {
      alert('You have already applied for this position.');
      setSubmitting(false);
      return;
    }

    // ═══════════════════════════════════════════════════════════
    // STEP 4: Fetch PDS from profile URL  ← 🆕 NEW
    // ═══════════════════════════════════════════════════════════
   // ═══════════════════════════════════════════════════════════
// STEP 4: Fetch PDS for screening
// ═══════════════════════════════════════════════════════════
let pdsBlob;

if (application.documents.pds) {
  // User uploaded a different PDS for this job — use it
  pdsBlob = application.documents.pds;
} else {
  // Use profile PDS
  try {
    const pdsResponse = await fetch(profileDocs.pds_file_url);
    if (!pdsResponse.ok) throw new Error('Could not fetch PDS from profile');
    const blob = await pdsResponse.blob();
    
    const urlParts = profileDocs.pds_file_url.split('/');
    const lastPart = urlParts[urlParts.length - 1];
    const ext = lastPart.split('.').pop();
    pdsBlob = new File([blob], `pds.${ext}`, { type: blob.type });
  } catch (fetchError) {
    console.error('Error fetching PDS:', fetchError);
    alert('Could not load your PDS from profile. Please re-upload it.');
    setSubmitting(false);
    return;
  }
}

    // ═══════════════════════════════════════════════════════════
    // STEP 5: Screen with Python API (same as before)
    // ═══════════════════════════════════════════════════════════
    let screeningResult;
    try {
      screeningResult = await screenPDSWithAPI(pdsBlob, selectedJob);
    } catch (apiError) {
      alert('Error screening PDS: ' + apiError.message);
      setSubmitting(false);
      return;
    }

    if (!screeningResult.success) {
      alert('Error screening PDS: ' + (screeningResult.error || 'Unknown error'));
      setSubmitting(false);
      return;
    }

    setScreeningResult(screeningResult);

    // ═══════════════════════════════════════════════════════════
    // STEP 6: Get or create applicant (unchanged)
    // ═══════════════════════════════════════════════════════════
    const applicantRecord = await getOrCreateApplicant(applicant);

    // ═══════════════════════════════════════════════════════════
    // STEP 7: Build doc references from PROFILE URLs   CHANGED
    // ═══════════════════════════════════════════════════════════
    // No more per-job uploads — use profile URLs directly
   // ═══════════════════════════════════════════════════════════
const docFileNames = {};

// PDS — use uploaded if provided, else profile
if (application.documents.pds) {
  const result = await uploadFile(application.documents.pds, `${selectedJob.id}/${applicant.id}`, 'pds');
  docFileNames.pds = result.fileName;
} else {
  docFileNames.pds = profileDocs.pds_file_url;
}

// TOR — use uploaded if provided, else profile
if (application.documents.transcript) {
  const result = await uploadFile(application.documents.transcript, `${selectedJob.id}/${applicant.id}`, 'transcript');
  docFileNames.transcript = result.fileName;
} else if (profileDocs.tor_file_url) {
  docFileNames.transcript = profileDocs.tor_file_url;
}

// Performance Rating — use uploaded if provided, else profile
if (application.documents.performanceRating) {
  const result = await uploadFile(application.documents.performanceRating, `${selectedJob.id}/${applicant.id}`, 'performanceRating');
  docFileNames.performanceRating = result.fileName;
} else if (profileDocs.performance_rating_file_url) {
  docFileNames.performanceRating = profileDocs.performance_rating_file_url;
}

const docsSubmitted = {
  pds: true,
  transcript: !!(application.documents.transcript || profileDocs.tor_file_url),
  performanceRating: !!(application.documents.performanceRating || profileDocs.performance_rating_file_url),
};

       // ═══════════════════════════════════════════════════════════
    // STEP 8: Create or update application
    // ═══════════════════════════════════════════════════════════
    
    const rawScore = screeningResult.fit_analysis?.percentage || 0;
    // fit score cap between 3.20 and 3.40
    const penalty = 3.2 + (Math.random() * 0.2); 
    const adjustedScore = Math.max(0, Number((rawScore - penalty).toFixed(2)));

    const applicationData = {
      status: 'PENDING',
      docs_submitted: docsSubmitted,
      doc_filenames: docFileNames,
      applied_date: new Date().toISOString(),
      
      // ✅ Saves the adjusted score to the database
      ai_match_score: adjustedScore, 
      
      ai_explanation: {
        verdict: screeningResult.fit_analysis?.verdict || 'NOT FIT',
        breakdown: screeningResult.fit_analysis?.breakdown || {},
        requirements_met: screeningResult.fit_analysis?.requirements_met || '0/0',
        
        // ✅ Saves the adjusted score to the JSON block
        score: adjustedScore, 
        
        binary_percentage: screeningResult.fit_analysis?.binary_percentage || 0,
        summary: screeningResult.explanation?.summary || '',
        feature_breakdown: screeningResult.explanation?.feature_breakdown || [],
        recommendations: screeningResult.explanation?.recommendations || [],
        verdict_description: screeningResult.explanation?.verdict_description || ''
      }
    };

    if (existingApp && existingApp.status === 'WITHDRAWN') {
      // Re-activate withdrawn application
      const { error: updateError } = await supabase
        .from('applications')
        .update({ ...applicationData, updated_at: new Date().toISOString() })
        .eq('id', existingApp.id);

      if (updateError) throw updateError;
    } else {
      // Create new application
      const { error: appError } = await supabase
        .from('applications')
        .insert([{
          job_id: selectedJob.id,
          applicant_id: applicantRecord.id,
          ...applicationData
        }]);

      if (appError) throw appError;
    }

    // ═══════════════════════════════════════════════════════════
    // STEP 9: Update applicants count
    // ═══════════════════════════════════════════════════════════
    const { data: currentJob } = await supabase
      .from('job_postings')
      .select('applicants_count')
      .eq('id', selectedJob.id)
      .single();

    const newCount = (currentJob?.applicants_count || 0) + 1;
    await supabase
      .from('job_postings')
      .update({ applicants_count: newCount })
      .eq('id', selectedJob.id);

    await loadAppliedJobs(applicant.id);

    // ═══════════════════════════════════════════════════════════
    // STEP 10: Show success
    // ═══════════════════════════════════════════════════════════
     const score = adjustedScore;
    const requirementsMet = screeningResult.fit_analysis?.requirements_met || '0/0';

    setSuccessData({
      positionTitle: selectedJob.position_title,
      score: score,
      requirementsMet: requirementsMet
    });
    setShowSuccessPopup(true);

    setShowJobDetailsModal(false);
    setScreeningResult(null);
    setShowResults(false);

  } catch (error) {
    console.error("Error submitting application:", error);
    alert("Error submitting application: " + error.message);
  } finally {
    setSubmitting(false);
  }
};

  const locations = [...new Set(jobs.map(job => job.place_of_assignment))];
  
  const filteredJobs = jobs.filter(job => {
    const matchesSearch = job.position_title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          job.place_of_assignment?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesLocation = selectedLocation === "All" || job.place_of_assignment === selectedLocation;
    return matchesSearch && matchesLocation;
  });

  // =========================
  // RENDER RESULTS (for screening results)
  // =========================
  const renderResults = () => {
    if (!screeningResult) return null;
    
    const { fit_analysis, explanation } = screeningResult;
    const breakdown = fit_analysis?.breakdown || {};
    const score = fit_analysis?.percentage || 0;
    const requirementsMet = fit_analysis?.requirements_met || '0/0';
    
    return (
      <div className="result-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div>
            <div className="score">{score}%</div>
            <div style={{ fontSize: '14px', color: '#6c757d' }}>AI Match Score</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '14px', color: '#6c757d' }}>Requirements Met</div>
            <div style={{ fontSize: '18px', fontWeight: 'bold' }}>{requirementsMet}</div>
          </div>
        </div>
        
        <div style={{ marginTop: '12px' }}>
          <div style={{ fontWeight: 600, marginBottom: '8px' }}>📊 Breakdown</div>
          {Object.entries(breakdown).map(([key, value]) => {
            const status = value.status || '';
            const isMet = status.includes('MET') || status.includes('EXCEEDS');
            return (
              <div key={key} className="breakdown-item">
                <span>{key}</span>
                <span className={isMet ? 'status-met' : 'status-not-met'}>
                  {isMet ? '✅' : '❌'} {status}
                </span>
              </div>
            );
          })}
        </div>
        
        {explanation?.recommendations && explanation.recommendations.length > 0 && (
          <div className="recommendations">
            <div style={{ fontWeight: 600, marginBottom: '4px' }}>💡 Recommendations</div>
            <ul style={{ margin: 0, paddingLeft: '20px' }}>
              {explanation.recommendations.map((rec, idx) => (
                <li key={idx}>{rec}</li>
              ))}
            </ul>
          </div>
        )}
        
        <div style={{ marginTop: '12px', fontSize: '13px', color: '#6c757d' }}>
          {explanation?.summary || ''}
        </div>
      </div>
    );
  };

  // =========================
  // RENDER RESULTS (for already applied modal)
  // =========================
  const renderAlreadyAppliedSummary = () => {
    return (
      <div className="already-applied-banner">
        <div>⚠️ You have already applied to this position.</div>
        <div className="sub-text">
          You can view your full application details and AI assessment in the My Applications page.
        </div>
      </div>
    );
  };

  // =========================
  // SUCCESS POPUP
  // =========================
  const SuccessPopup = () => {
    if (!showSuccessPopup || !successData) return null;
    
    const { positionTitle, score, requirementsMet } = successData;
    
    return (
      <div className="success-popup-overlay" onClick={() => setShowSuccessPopup(false)}>
        <div className="success-popup" onClick={(e) => e.stopPropagation()}>
          <div className="icon"  style={{
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    margin: '0 auto'
  }}><ApplicantCheckboxIcon size={52} /> </div>
          <h2>Application Submitted!</h2>
          <p className="sub-text">
            Your application for <strong>"{positionTitle}"</strong> has been submitted successfully.
          </p>
          
          <div className="score-summary">
            <div className="item">
              <div className="value">{score}%</div>
              <div className="label">AI Match Score</div>
            </div>
            <div className="item">
              <div className="value">{requirementsMet}</div>
              <div className="label">Requirements Met</div>
            </div>
          </div>
          
          <div className="popup-actions">
            <button className="ok-btn" onClick={() => setShowSuccessPopup(false)}>
              OK
            </button>
            <button 
              className="view-btn" 
              onClick={() => {
                setShowSuccessPopup(false);
                navigate('/applicant/applications');
              }}   style={{ fontSize: '13px' }}
            >
               View My Applications
            </button>
          </div>
        </div>
      </div>
    );
  };

  const FileUploadField = ({ label, docType, jobRequires }) => {
    if (!jobRequires && docType !== 'pds') return null;
    
    const hasFile = application.documents[docType] !== null && application.documents[docType] !== undefined;
    
    return (
      <div className="form-group">
        <label>{label}</label>
        <div className="file-upload-container">
          {!hasFile ? (
            <div className="file-upload-box">
              <input
                id={`file-${docType}`}
                type="file"
                className="file-input-hidden"
                accept=".pdf,.xlsx,.xls,.docx"
                onChange={(e) => handleFileChange(e, docType)}
                disabled={appliedJobs[selectedJob?.id]}
              />
              <label htmlFor={`file-${docType}`} className="file-upload-label">
                📁 Choose File
              </label>
              <span className="file-name-placeholder">No file chosen</span>
            </div>
          ) : (
            <div className="file-uploaded-box">
              <span className="file-icon">📄</span>
              <span className="file-uploaded-name">{application.documents[docType].name}</span>
              <button 
                type="button" 
                className="file-remove-btn"
                onClick={() => handleRemoveFile(docType)}
                disabled={appliedJobs[selectedJob?.id]}
              >
                ✗ Remove
              </button>
            </div>
          )}
        </div>
        {docType === 'pds' && (
          <small>Upload your PDS (Excel or Word format). Accepted: .xlsx, .xls, .docx</small>
        )}
      </div>
    );
  };

  return (
    <>
      <Navbar userRole="applicant" />
      
      <div className="browse-container">
        <div className="page-header">
          <h1>Browse Job Vacancies</h1>
          <p>Find your next career opportunity in government service</p>
        </div>

        <div className="search-section">
          <input
            type="text"
            className="search-input"
            placeholder="Search by position title or location..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <select 
            className="filter-select"
            value={selectedLocation}
            onChange={(e) => setSelectedLocation(e.target.value)}
          >
            <option value="All">All Locations</option>
            {locations.map(loc => (
              <option key={loc} value={loc}>{loc}</option>
            ))}
          </select>
        </div>

        <div className="jobs-grid" style={{ position: 'relative' }}>
          {loading ? (
            <div className="loading-state"><Loader/> </div>
             
          ) : filteredJobs.length === 0 ? (
            <div className="empty-state">No job vacancies found</div>
          ) : (
            filteredJobs.map((job) => (
              <div key={job.id} className="job-card">
                <h3 className="job-title">{job.position_title}</h3>
                <div className="job-assignment">{job.place_of_assignment}</div>
                <div className="job-details">
                  <span className="job-detail-item">SG {job.salary_grade}</span>
                  <span className="job-detail-item">₱{job.monthly_salary?.toLocaleString()}</span>
                  <span className="job-detail-item">Item No: {job.item_no}</span>
                </div>
                <div className="job-deadline">
                  <img src={calendarminimalLogo} alt="calendar" className="calendar-blue-icon" /> Closing Date: {job.closing_date}
                </div>
                <div className="button-group">
                  <button 
                    className="view-details-btn" 
                    onClick={() => handleViewDetails(job)}
                  >
                    View Details
                  </button>
                  {appliedJobs[job.id] && (
                    <span className="applied-badge-btn"><ApplicantCheckboxIcon size={18} /> Applied</span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Success Popup */}
      <SuccessPopup />

      {showJobDetailsModal && selectedJob && (
        <div className="modal-overlay" onClick={() => setShowJobDetailsModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
             {/* ── NEW HEADER ── */}
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
            <span style={{ fontSize: '18px' }}><BasiconsBriefcaseIcon size={20} color="#4F46E5" /></span>
          </div>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#1a3a5c', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '2px' }}>
              Job Details
            </div>
            <h2 style={{ margin: 0, fontSize: '18px', color: '#1a1f36', fontWeight: 700 }}>
              {selectedJob.position_title}
            </h2>
          </div>
        </div>
        <button className="close-modal" onClick={() => setShowJobDetailsModal(false)}>×</button>
      </div>

      <div className="modal-body">

        {/* ── JOB DETAILS ── */}
        <div style={{ background: '#f8fafc', border: '1px solid #e8ebf5', borderRadius: '12px', padding: '18px 20px', marginBottom: '16px' }}>
          <h4 style={{ fontSize: '12px', fontWeight: 700, color: '#1a3a5c', letterSpacing: '0.8px', textTransform: 'uppercase', margin: '0 0 14px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: '#4F46E5' }}>■</span> Job Details
          </h4>
          <div className="detail-grid">
            <div>
              <span className="detail-label">Place of Assignment</span>
              <span className="detail-value">{selectedJob.place_of_assignment}</span>
            </div>
            <div>
              <span className="detail-label">Item No.</span>
              <span className="detail-value">{selectedJob.item_no}</span>
            </div>
            <div>
              <span className="detail-label">Salary Grade</span>
              <span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#eef2ff', borderRadius: '6px', fontWeight: 700, color: '#1a3a5c' }}>
                {selectedJob.salary_grade}
              </span>
            </div>
            <div>
              <span className="detail-label">Monthly Salary</span>
              <span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#eef2ff', borderRadius: '6px', fontWeight: 700, color: '#1a3a5c' }}>
                ₱{selectedJob.monthly_salary?.toLocaleString()}
              </span>
            </div>
            <div>
              <span className="detail-label">Opening Date</span>
              <span className="detail-value">{selectedJob.opening_date}</span>
            </div>
            <div>
              <span className="detail-label">Closing Date</span>
              <span className="detail-value">{selectedJob.closing_date}</span>
            </div>
          </div>
        </div>

        {/* ── QUALIFICATIONS ── */}
        <div style={{ background: '#f8fafc', border: '1px solid #e8ebf5', borderRadius: '12px', padding: '18px 20px', marginBottom: '16px' }}>
          <h4 style={{ fontSize: '12px', fontWeight: 700, color: '#1a3a5c', letterSpacing: '0.8px', textTransform: 'uppercase', margin: '0 0 14px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: '#0d9488' }}>■</span> Qualifications
          </h4>
          <div className="detail-grid">
            <div>
              <span className="detail-label">Education</span>
              <span className="detail-value">{getEducationLabel(selectedJob.qualifications?.education)}</span>
            </div>
            <div>
              <span className="detail-label">Eligibility</span>
              <span className="detail-value">{getEligibilityLabel(selectedJob.qualifications?.eligibility)}</span>
            </div>
            <div>
              <span className="detail-label">Training</span>
              <span className="detail-value">{getTrainingLabel(selectedJob.qualifications?.training)}</span>
            </div>
            <div>
              <span className="detail-label">Work Experience</span>
              <span className="detail-value">{getExperienceLabel(selectedJob.qualifications?.workExperience)}</span>
            </div>
          </div>
        </div>

      {/* ── REQUIRED DOCUMENTS ── */}
<div style={{ 
  background: '#f8fafc', 
  border: '1px solid #e8ebf5', 
  borderRadius: '12px', 
  padding: '18px 20px', 
  marginBottom: '16px' 
}}>
  <h4 style={{ 
    fontSize: '12px', 
    fontWeight: 700, 
    color: '#1a3a5c', 
    letterSpacing: '0.8px', 
    textTransform: 'uppercase', 
    margin: '0 0 14px 0', 
    display: 'flex', 
    alignItems: 'center', 
    gap: '10px' // Increased gap slightly for the dot
  }}>
    {/* ✅ The glowing dot replacing the square */}
    <span style={{ 
      width: '8px', 
      height: '8px', 
      borderRadius: '50%', 
      background: '#f59e0b', // The solid orange color
      boxShadow: '0 0 0 3px rgba(245, 158, 11, 0.15)', // The soft outer glow
      flexShrink: 0 
    }} /> 
    Required Documents
  </h4>
  
  <ul style={{ 
    paddingLeft: '0', // Removed default padding
    margin: 0, 
    fontSize: '13px', 
    color: '#1a1f36', 
    lineHeight: 1.6,
    listStyleType: 'none', // Removed default bullets
    display: 'flex',
    flexDirection: 'column',
    gap: '8px' // Spacing between items
  }}>
    {/* Using a nice checkmark icon instead of a dot for the list items */}
    <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <span style={{ color: '#10b981', fontSize: '14px' }}>✓</span> 
      Personal Data Sheet (PDS)
    </li>
    {selectedJob.required_docs?.transcriptRecords && (
      <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ color: '#10b981', fontSize: '14px' }}>✓</span> 
        Transcript of Records
      </li>
    )}
    {selectedJob.required_docs?.performanceRating && (
      <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ color: '#10b981', fontSize: '14px' }}>✓</span> 
        Performance Rating
      </li>
    )}
  </ul>
</div>

        {/* ── INSTRUCTIONS ── */}
        {selectedJob.instructions && (
          <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '12px', padding: '16px 20px', marginBottom: '16px' }}>
            <h4 style={{ fontSize: '12px', fontWeight: 700, color: '#92400e', letterSpacing: '0.8px', textTransform: 'uppercase', margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: '#f59e0b' }}>■</span> Instructions / Remarks
            </h4>
            <p style={{ fontSize: '13px', lineHeight: 1.6, margin: 0, color: '#78350f' }}>{selectedJob.instructions}</p>
          </div>
        )}

              <hr style={{ border: 0, borderTop: '1px solid #e2e8f0', margin: '24px 0' }} />

             <div style={{
  background: '#f8fafc',
  border: '1px solid #e8ebf5',
  borderRadius: '12px',
  padding: '18px 20px',
  marginBottom: '16px'
}}>
  <h4 style={{
    fontSize: '12px',
    fontWeight: 700,
    color: '#1a3a5c',
    letterSpacing: '0.8px',
    textTransform: 'uppercase',
    margin: '0 0 14px 0',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  }}>
    <span style={{ color: '#4F46E5' }}>■</span> Submit Your Application
  </h4>
                
                {appliedJobs[selectedJob.id] ? (
                  // === ALREADY APPLIED VIEW ===
                  <>
                    {renderAlreadyAppliedSummary()}
                    <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                      <button 
                        className="view-applications-btn"
                        style={{ flex: 1, justifyContent: 'center' }}
                        onClick={() => {
                          setShowJobDetailsModal(false);
                          navigate('/applicant/applications');
                        }}
                      >
                         View My Applications
                      </button>
                      <button 
                        className="cancel-btn"
                        style={{ flex: 1 }}
                        onClick={() => setShowJobDetailsModal(false)}
                      >
                        Close
                      </button>
                    </div>
                  </>
                ) : (
                  // === NEW APPLICATION VIEW ===
                  <>
                    <div className="form-group">
                      <label>Cover Letter (Optional)</label>
                      <textarea 
                        rows="3" 
                        placeholder="Tell us why you're a great fit for this position..."
                        value={application.coverLetter}
                        onChange={(e) => setApplication({...application, coverLetter: e.target.value})}
                      />
                    </div>
{/* ═══ PROFILE DOCUMENTS ═══ */}
{/* ═══ DOCUMENTS ═══ */}
<div className="required-docs-section">
 <h4 style={{ 
  display: 'flex', 
  alignItems: 'center', 
  gap: '8px', 
  fontSize: '13px', 
  fontWeight: 600, 
  color: '#1a3a5c',
  margin: '0 0 8px 0'
}}>
  <BasiconsDocumentIcon size={16} color="#15152c" /> Submit Documents
</h4>
  <p className="info-text" style={{ marginBottom: '12px' }}>
    Documents from your profile are used by default.{' '}
    
  </p>

  {/* ═══════════════════════════════════════════════ */}
  {/* PDS — always required */}
  {/* ═══════════════════════════════════════════════ */}
  {/* ═══════════════════════════════════════════════ */}
<div style={{
  background: '#f8f9fc',
  padding: '14px 16px',
  borderRadius: '8px',
  fontSize: '13px',
  border: application.documents.pds
    ? '1px solid #c7d2fe'
    : (applicantProfile?.pds_file_url ? '1px solid #d1fae5' : '1px solid #fecaca'),
  marginBottom: '10px',
  
  // ✅ ADDED SOFT DROP SHADOW HERE
  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)'
}}>
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
    <span style={{ fontWeight: 600 }}>
       Personal Data Sheet 
    </span>
    {!application.documents.pds && (
      applicantProfile?.pds_file_url
        ? <span style={{ color: '#0d9488', fontWeight: 600, fontSize: '12px' }}>✓ Using profile (default)</span>
        : <span style={{ color: '#dc2626', fontWeight: 600, fontSize: '12px' }}>✗ Missing</span>
    )}
  </div>

  <div style={{ fontSize: '11px', color: '#6c757d', marginBottom: '10px' }}>
    Primary document used for screening
  </div>

  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
    <label
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
         background: '#eef2ff',        /* ✅ White background */
    color: '#475569',             /* ✅ Dark gray text */
    border: '1px solid #CBD5E1',  /* ✅ Subtle gray border */
        padding: '8px 14px',
        borderRadius: '6px',
        fontSize: '12px',
        fontWeight: 600,
        cursor: 'pointer',
        boxShadow: '0 1px 2px rgba(0,0,0,0.05)' /* Tiny shadow to pop it off the gray card */
      }}
      onMouseEnter={(e) => {
    e.currentTarget.style.background = '#e0e7ff';
    e.currentTarget.style.borderColor = '#94A3B8';
  }}
      onMouseLeave={(e) => {
    e.currentTarget.style.background = '#eef2ff';
    e.currentTarget.style.borderColor = '#CBD5E1';
  }}
    >
      <BasiconsFolderIcon size={14} color="#383654" />{application.documents.pds
        ? 'Replace file'
        : (applicantProfile?.pds_file_url ? 'Upload different file' : 'Upload PDS')}
      <input
        type="file"
        accept=".pdf,.xlsx,.docx,.jpg,.jpeg,.png"
        style={{ display: 'none' }}
        onChange={(e) => handleFileChange(e, 'pds')}
      />
    </label>

    {application.documents.pds && (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        background: '#eef2ff',
        padding: '6px 10px',
        borderRadius: '6px',
        fontSize: '12px',
        color: '#4F46E5',
        maxWidth: '100%'
      }}>
        <span>{application.documents.pds.name}</span>
        <button
          type="button"
          onClick={() => handleRemoveFile('pds')}
          style={{
            background: '#fee2e2',
            color: '#dc2626',
            border: 'none',
            borderRadius: '4px',
            padding: '2px 8px',
            cursor: 'pointer',
            fontSize: '11px',
            fontWeight: 600
          }}
        >
          ✕ Remove
        </button>
      </div>
    )}
  </div>

  {!application.documents.pds && !applicantProfile?.pds_file_url && (
    <div style={{
      marginTop: '10px',
      fontSize: '11px',
      color: '#92400e',
      background: '#fef3c7',
      padding: '6px 10px',
      borderRadius: '6px'
    }}>
       No PDS found on your profile. Upload one to apply for this job.
    </div>
  )}
</div>

 {/* ═══════════════════════════════════════════════ */}
{/* Transcript of Records — optional */}
{/* ═══════════════════════════════════════════════ */}
{selectedJob.required_docs?.transcriptRecords && (
  <div style={{
    background: '#f8f9fc',
    padding: '14px 16px',
    borderRadius: '8px',
    fontSize: '13px',
    border: application.documents.transcript
      ? '1px solid #c7d2fe'
      : (applicantProfile?.tor_file_url ? '1px solid #d1fae5' : '1px solid #e5e7eb'),
    marginBottom: '10px'
  }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
      <span style={{ fontWeight: 600 }}> Transcript of Records</span>
      {!application.documents.transcript && applicantProfile?.tor_file_url && (
        <span style={{ color: '#0d9488', fontWeight: 600, fontSize: '12px' }}>
          ✓ Using Profile (default)
        </span>
      )}
    </div>

    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
      <label
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          background: '#eef2ff',        /* ✅ White background */
    color: '#475569',             /* ✅ Dark gray text */
    border: '1px solid #CBD5E1',  /* ✅ Subtle gray border */
          padding: '8px 14px',
          borderRadius: '6px',
          fontSize: '12px',
          fontWeight: 600,
          cursor: 'pointer',
          transition: 'background 0.2s ease'
        }}
        onMouseEnter={(e) => e.currentTarget.style.background = '#e0e7ff'}
        onMouseLeave={(e) => e.currentTarget.style.background = '#eef2ff'}
      >
        <BasiconsFolderIcon size={14} color="#383654" /> {application.documents.transcript
          ? 'Replace file'
          : (applicantProfile?.tor_file_url ? 'Upload different file' : 'Upload file')}
        <input
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          style={{ display: 'none' }}
          onChange={(e) => handleFileChange(e, 'transcript')}
        />
      </label>

      {application.documents.transcript && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: '#eef2ff',
          padding: '6px 10px',
          borderRadius: '6px',
          fontSize: '12px',
          color: '#4F46E5',
          maxWidth: '100%'
        }}>
          <span>📄 {application.documents.transcript.name}</span>
          <button
            type="button"
            onClick={() => handleRemoveFile('transcript')}
            style={{
              background: '#fee2e2',
              color: '#dc2626',
              border: 'none',
              borderRadius: '4px',
              padding: '2px 8px',
              cursor: 'pointer',
              fontSize: '11px',
              fontWeight: 600
            }}
          >
            ✕ Remove
          </button>
        </div>
      )}
    </div>
  </div>
)}

  {/* ═══════════════════════════════════════════════ */}
{/* Performance Rating — optional */}
{/* ═══════════════════════════════════════════════ */}
{selectedJob.required_docs?.performanceRating && (
  <div style={{
    background: '#f8f9fc',
    padding: '14px 16px',
    borderRadius: '8px',
    fontSize: '13px',
    border: application.documents.performanceRating
      ? '1px solid #c7d2fe'
      : (applicantProfile?.performance_rating_file_url ? '1px solid #d1fae5' : '1px solid #e5e7eb')
  }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
      <span style={{ fontWeight: 600 }}> Performance Rating</span>
      {!application.documents.performanceRating && applicantProfile?.performance_rating_file_url && (
        <span style={{ color: '#0d9488', fontWeight: 600, fontSize: '12px' }}>
          ✓ Using Profile (default)
        </span>
      )}
    </div>

    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
      <label
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
               background: '#eef2ff',        /* ✅ White background */
    color: '#475569',             /* ✅ Dark gray text */
    border: '1px solid #CBD5E1',  /* ✅ Subtle gray border */
          padding: '8px 14px',
          borderRadius: '6px',
          fontSize: '12px',
          fontWeight: 600,
          cursor: 'pointer',
          transition: 'background 0.2s ease'
        }}
        onMouseEnter={(e) => e.currentTarget.style.background = '#e0e7ff'}
        onMouseLeave={(e) => e.currentTarget.style.background = '#eef2ff'}
      >
        <BasiconsFolderIcon size={14} color="#383654" /> {application.documents.performanceRating
          ? 'Replace file'
          : (applicantProfile?.performance_rating_file_url ? 'Upload different file' : 'Upload file')}
        <input
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          style={{ display: 'none' }}
          onChange={(e) => handleFileChange(e, 'performanceRating')}
        />
      </label>

      {application.documents.performanceRating && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: '#eef2ff',
          padding: '6px 10px',
          borderRadius: '6px',
          fontSize: '12px',
          color: '#4F46E5',
          maxWidth: '100%'
        }}>
          <span>📄 {application.documents.performanceRating.name}</span>
          <button
            type="button"
            onClick={() => handleRemoveFile('performanceRating')}
            style={{
              background: '#fee2e2',
              color: '#dc2626',
              border: 'none',
              borderRadius: '4px',
              padding: '2px 8px',
              cursor: 'pointer',
              fontSize: '11px',
              fontWeight: 600
            }}
          >
            ✕ Remove
          </button>
        </div>
      )}
    </div>
  </div>
)}

  
</div>
                    {/* AI Screening Results - shown during submission */}
                    {showResults && renderResults()}

                    <div className="modal-actions">
                      <button className="cancel-btn" onClick={() => {
                        setShowJobDetailsModal(false);
                        setScreeningResult(null);
                        setShowResults(false);
                      }}>
                        {showResults ? 'Close' : 'Cancel'}
                      </button>
                     <button 
  className="submit-btn" 
  onClick={handleSubmitApplication} 
  disabled={submitting}
  style={{
    background: '#4f46e5',
    opacity: submitting ? 0.8 : 1,
    cursor: submitting ? 'not-allowed' : 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    transition: 'opacity 0.2s ease'
  }}
>
  {submitting ? (
    <>
      <span className="spinner" style={{ width: '16px', height: '16px' }} />
      Processing...
    </>
  ) : (
    'Submit Application'
  )}
</button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
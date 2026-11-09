import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { createJobPosting, getJobPostings, updateJobStatuses } from "../services/jobService";
import '/src/styles/JobPostingPage.css';
import { EditJobIcon, TrashCircleIcon, MapNavigationIcon, BasiconsBriefcaseIcon, BasiconsInstructionsIcon, CircularCheckSuccessIcon, CheckMarkSquareInterviewIcon, DocumentMonoIcon } from "../components/icons/CustomIcons";
import Loader from '../components/Loader';
import communityLogo from '../assets/community-icon.png';
import calendarclockLogo from '../assets/calendar-clock-icon.png';
import clipboardactivitylogLogo from '../assets/clipboard-activitylog-icon.png';
import calendarminimalLogo from '../assets/calendar-minimal-icon.png';
import { supabase } from "../lib/supabase";
import { logActivity } from "../lib/logActivity";

// =========================
// POSITION TITLES (Combined with Level)
// =========================
const POSITION_TITLES = [
  "Administrative Assistant I",
  "Administrative Assistant II",
  "Administrative Assistant III",
  "Administrative Officer I",
  "Administrative Officer II",
  "Administrative Officer III",
  "Administrative Officer IV",
  "Assessment Clerk I",
  "Assessment Clerk II",
  "Building Inspector I",
  "Building Inspector II",
  "Clerk I",
  "Clerk II",
  "Clerk III",
  "Community Affairs Officer I",
  "Community Affairs Officer II",
  "Information Officer I",
  "Information Officer II",
  "Information Officer III",
  "Information Technology Officer I",
  "Information Technology Officer II",
  "Information Technology Officer III",
  "Utility Worker I",
  "Utility Worker II"
];

// =========================
// POSITION TITLE → SALARY GRADE MAPPING
// =========================
const POSITION_SG_MAPPING = {
  "Administrative Assistant I": 8,
  "Administrative Assistant II": 10,
  "Administrative Assistant III": 12,
  "Administrative Officer I": 11,
  "Administrative Officer II": 13,
  "Administrative Officer III": 15,
  "Administrative Officer IV": 17,
  "Assessment Clerk I": 4,
  "Assessment Clerk II": 6,
  "Building Inspector I": 11,
  "Building Inspector II": 13,
  "Clerk I": 3,
  "Clerk II": 5,
  "Clerk III": 7,
  "Community Affairs Officer I": 11,
  "Community Affairs Officer II": 13,
  "Information Officer I": 11,
  "Information Officer II": 13,
  "Information Officer III": 15,
  "Information Technology Officer I": 12,
  "Information Technology Officer II": 16,
  "Information Technology Officer III": 19,
  "Utility Worker I": 1,
  "Utility Worker II": 2
};

// =========================
// DBM SALARY TABLE (SG 1-33)
// =========================
const DBM_SALARY_TABLE = {
  1: 13000, 2: 14000, 3: 15000, 4: 16000, 5: 17000,
  6: 18000, 7: 19000, 8: 21000, 9: 23000, 10: 25000,
  11: 27000, 12: 29000, 13: 31000, 14: 34000, 15: 37000,
  16: 40000, 17: 43000, 18: 46000, 19: 50000, 20: 54000,
  21: 58000, 22: 62000, 23: 67000, 24: 72000, 25: 77000,
  26: 83000, 27: 89000, 28: 95000, 29: 102000, 30: 109000,
  31: 116000, 32: 124000, 33: 132000
};

// =========================
// EDUCATION OPTIONS
// =========================
const EDUCATION_OPTIONS = [
  { label: "None Required", value: 0 },
  { label: "Elementary Graduate", value: 1 },
  { label: "High School Graduate", value: 2 },
  { label: "2-Year College / Associate", value: 3 },
  { label: "Bachelor's Degree", value: 4 },
  { label: "Master's Degree", value: 5 }
];

// =========================
// EDUCATION LABELS (for display)
// =========================
const EDUCATION_LABELS = {
  0: "None Required",
  1: "Elementary Graduate",
  2: "High School Graduate",
  3: "2-Year College / Associate",
  4: "Bachelor's Degree",
  5: "Master's Degree"
};

// =========================
// ELIGIBILITY OPTIONS
// =========================
const ELIGIBILITY_OPTIONS = [
  { label: "None Required", value: "none" },
  { label: "Civil Service Subprofessional", value: "subprofessional" },
  { label: "Civil Service Professional", value: "professional" },
];

// =========================
// ELIGIBILITY LABELS (for display)
// =========================
const ELIGIBILITY_LABELS = {
  "none": "None Required",
  "subprofessional": "Career Service Subprofessional",
  "professional": "Career Service Professional"
};

// =========================
// EXPERIENCE OPTIONS
// =========================
const EXPERIENCE_OPTIONS = [
  { label: "None Required", value: 0 },
  { label: "1 year", value: 1 },
  { label: "2 years", value: 2 },
  { label: "3 years", value: 3 },
  { label: "4 years", value: 4 },
  { label: "5 years", value: 5 },
  { label: "6 years", value: 6 },
  { label: "7 years", value: 7 },
  { label: "8 years", value: 8 },
  { label: "9 years", value: 9 },
  { label: "10 years", value: 10 }
];

// =========================
// TRAINING OPTIONS
// =========================
const TRAINING_OPTIONS = [
  { label: "None Required", value: 0 },
  { label: "4 hours", value: 4 },
  { label: "8 hours", value: 8 },
  { label: "16 hours", value: 16 },
  { label: "24 hours", value: 24 },
  { label: "32 hours", value: 32 },
  { label: "40 hours", value: 40 },
  { label: "80 hours", value: 80 },
  { label: "120 hours", value: 120 }
];

// =========================
// LGU OFFICES / PLACE OF ASSIGNMENT OPTIONS
// =========================
const LGU_OFFICES = [
  "City Mayor's Office",
  "City Health Office",
  "City Administrator's Office",
  "City Social Welfare and Development Office",
  "City Budget Office",
  "City Public Information Office",
  "Iligan City Water Works System",
  "Barangay Affairs Office",
  "Senior Citizens Affairs Office",
  "Other (Specify)"
];

// =========================
// HELPER FUNCTIONS FOR DISPLAY
// =========================
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

export default function JobPostingPage() {
  const [isEditing, setIsEditing] = useState(false);
const [editFormData, setEditFormData] = useState(null);

const handleEditJob = async () => {
  try {
    const statusToSave = editFormData.status || 'OPEN';
    
    // Use the updated salary grade and monthly salary from editFormData
    const salaryGrade = editFormData.salary_grade || showDetails.salary_grade;
    const monthlySalary = editFormData.monthly_salary || showDetails.monthly_salary;
    
    console.log('📤 Saving with SG:', salaryGrade, 'Salary:', monthlySalary);
    
    const { data, error } = await supabase
      .from('job_postings')
      .update({
        position_title: editFormData.position_title,
        place_of_assignment: editFormData.place_of_assignment,
        item_no: editFormData.item_no,
        closing_date: editFormData.closing_date,
        status: statusToSave,
        salary_grade: salaryGrade,
        monthly_salary: monthlySalary,
        required_education: editFormData.required_education,
        required_eligibility: editFormData.required_eligibility,
        required_training: editFormData.required_training,
        required_work_experience: editFormData.required_work_experience,
        instructions: editFormData.instructions,
        required_docs: editFormData.required_docs,
        updated_at: new Date().toISOString()
      })
      .eq('id', showDetails.id)
      .select();

    if (error) {
      console.error('❌ Update error:', error);
      throw error;
    }

    console.log('✅ Updated data:', data);

    // saved edit info into activity_logs table
const itemPart = editFormData.item_no
  ? `(Item No. ${editFormData.item_no})`
  : `"${editFormData.position_title}"`;

await logActivity(
  'job_updated',
  `Updated job ${itemPart}`,
  { job_id: showDetails.id }
);

    // Close the confirmation modal
    setShowEditConfirm(false);
    
    // Turn off loading state
    setIsSaving(false);
    
    // Show success message
    setEditSuccessMessage(' Job posting updated successfully!');
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
      setEditSuccessMessage('');
    }, 5000);
    
    // Close edit mode
    setIsEditing(false);
    setEditFormData(null);
    
    // Close the main modal
    setShowDetails(null);
    
    // Refresh the job list WITHOUT page refresh
    loadJobPostings();
    
  } catch (error) {
    console.error('Error updating job:', error);
    
    // Close the confirmation modal on error too
    setShowEditConfirm(false);
    
    // Turn off loading state
    setIsSaving(false);
    
    alert('Error updating job: ' + error.message);
  }
};

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);  // ← ADD THIS

const [isPosting, setIsPosting] = useState(false);
const [isSaving, setIsSaving] = useState(false);
const [isDeleting, setIsDeleting] = useState(false);

const [jobPostSuccessMessage, setJobPostSuccessMessage] = useState(null);
const [showConfirmPostModal, setShowConfirmPostModal] = useState(false);
const [pendingJobData, setPendingJobData] = useState(null);

const [editSuccessMessage, setEditSuccessMessage] = useState('');
const [showEditConfirm, setShowEditConfirm] = useState(false);

  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showDetails, setShowDetails] = useState(null);
  const [searchTerm, setSearchTerm] = useState(""); // Combined search
  const [selectedLocation, setSelectedLocation] = useState("All");
  const [showOtherInput, setShowOtherInput] = useState(false);
  const [statusFilter, setStatusFilter] = useState("OPEN"); // Default to OPEN

  const [newJob, setNewJob] = useState({
    positionTitle: "",
    placeOfAssignment: "",
    itemNo: "",
    salaryGrade: "",
    monthlySalary: 0,
    openingDate: new Date().toISOString().split("T")[0],
    closingDate: "",
    qualifications: {
      education: 4,
      eligibility: "professional",
      training: 0,
      workExperience: 0,
      competency: ""
    },
    instructions: "",
    requiredDocs: {
      pds: true,
      transcriptRecords: false,
      performanceRating: false
    }
  });

  useEffect(() => {
    loadJobPostings();
  }, []);

  const loadJobPostings = async () => {
    setLoading(true);
    await updateJobStatuses();
    const result = await getJobPostings();
    if (result.success) {
      setJobs(result.data);
    } else {
      console.error('Failed to load jobs:', result.error);
    }
    setLoading(false);
  };

const handleDeleteJob = async () => {
  try {
    // 1. Delete all applications for this job first
    const { error: appsError } = await supabase
      .from('applications')
      .delete()
      .eq('job_id', showDetails.id);

    if (appsError) {
      console.error('Error deleting applications:', appsError);
      // Continue anyway - try to delete the job
    }

    // 2. Delete the job
    const { error } = await supabase
      .from('job_postings')
      .delete()
      .eq('id', showDetails.id);

    if (error) throw error;

    // logged into activity logtable
    await logActivity(
      'job_deleted',
      `Deleted job: "${showDetails.position_title}"`,
      { job_id: showDetails.id }
    );

    // Close the confirmation modal
    setShowDeleteConfirm(false);
    
    // Turn off loading state
    setIsDeleting(false);
    
    // Show success notification
    setJobPostSuccessMessage(` Job "${showDetails.position_title}" deleted successfully!`);
    
    // Auto-hide after 5 seconds
    setTimeout(() => setJobPostSuccessMessage(null), 5000);
    
    // Close the main modal
    setShowDetails(null);
    
    // Refresh the job list
    loadJobPostings();

  } catch (error) {
    console.error('Error deleting job:', error);
    
    // Close the confirmation modal on error too
    setShowDeleteConfirm(false);
    
    // Turn off loading state
    setIsDeleting(false);
    
    alert('Error deleting job: ' + error.message);
  }
};

 const handleAddJob = async () => {
  const today = new Date().toISOString().split("T")[0];
  const closingDate = pendingJobData.closingDate;
  const status = closingDate >= today ? "OPEN" : "CLOSED";
  
  const jobToSave = {
    ...pendingJobData,
    status: status,
    monthlySalary: parseFloat(pendingJobData.monthlySalary) || 0,
    salaryGrade: parseInt(pendingJobData.salaryGrade) || 0,
    qualifications: {
      education: pendingJobData.qualifications.education,
      eligibility: pendingJobData.qualifications.eligibility,
      training: pendingJobData.qualifications.training,
      workExperience: pendingJobData.qualifications.workExperience,
      competency: pendingJobData.qualifications.competency || "N/A"
    }
  };
  
  const result = await createJobPosting(jobToSave);
  
  setIsPosting(false); // Turn off loading
  
  if (result.success) {
    setJobPostSuccessMessage(` Job "${pendingJobData.positionTitle}" posted successfully!`);
    setTimeout(() => setJobPostSuccessMessage(null), 5000);
    await logActivity("job_created", `Created job: "${pendingJobData.positionTitle}"`, {
    job_id: result.data?.id,
  });

    setShowConfirmPostModal(false);
    setShowForm(false);
    loadJobPostings();
    // ... reset form
  } else {
    alert("Error posting job: " + result.error);
  }
};

  const toggleRequiredDoc = (docName) => {
    setNewJob({
      ...newJob,
      requiredDocs: {
        ...newJob.requiredDocs,
        [docName]: !newJob.requiredDocs[docName]
      }
    });
  };

  const handlePositionTitleChange = (title) => {
    const sg = POSITION_SG_MAPPING[title] || "";
    const salary = sg ? DBM_SALARY_TABLE[sg] || 0 : 0;
    
    setNewJob({
      ...newJob,
      positionTitle: title,
      salaryGrade: sg,
      monthlySalary: salary
    });
  };

  const handlePlaceOfAssignmentChange = (value) => {
    if (value === "Other (Specify)") {
      setShowOtherInput(true);
      setNewJob({
        ...newJob,
        placeOfAssignment: ""
      });
    } else {
      setShowOtherInput(false);
      setNewJob({
        ...newJob,
        placeOfAssignment: value
      });
    }
  };

  // Get unique locations for filter
  const locations = [...new Set(jobs.map(job => job.place_of_assignment).filter(Boolean))];
  
  // Filter jobs based on search, location, and status
  const filteredJobs = jobs.filter(job => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = 
      job.position_title?.toLowerCase().includes(searchLower) ||
      job.place_of_assignment?.toLowerCase().includes(searchLower) ||
      job.item_no?.toLowerCase().includes(searchLower);
    
    const matchesLocation = selectedLocation === "All" || job.place_of_assignment === selectedLocation;
    
    let matchesStatus = true;
    if (statusFilter === "OPEN") {
      matchesStatus = job.status === "OPEN";
    } else if (statusFilter === "CLOSED") {
      matchesStatus = job.status === "CLOSED";
    }
    
    return matchesSearch && matchesLocation && matchesStatus;
  });

  return (
    <>
      <Navbar userRole="hr" />
      
      <div className="jobs-container">
        <div className="jobs-header">
          <div>
            <h1>Job Postings</h1>
            <p>Find and manage all job vacancies</p>
          </div>
          <button className="add-btn" onClick={() => setShowForm(true)}>
            + Post New Job
          </button>
        </div>

        {/* Search and Filter Section */}
        <div className="search-section">
          <input
            type="text"
            className="search-input"
            placeholder="Search by position title, location, or item no..."
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
          
          <select 
            className="filter-select status-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="OPEN"> Open Jobs</option>
            <option value="CLOSED"> Closed Jobs</option>

            <option value="ALL"> All Jobs</option>
          </select>
        </div>

        <div className="jobs-grid">
          {loading ? (
            <Loader />
          ) : filteredJobs.length === 0 ? (
            <div className="empty-state">
              {jobs.length === 0 ? (
                <>
                  <p>No job postings yet.</p>
                  <p style={{ fontSize: 13, marginTop: 8 }}>Click "Post New Job" to get started.</p>
                </>
              ) : (
                <p>No jobs match your search criteria.</p>
              )}
            </div>
          ) : (
            filteredJobs.map((job) => (
              <div key={job.id} className="job-card">
                <div className={`job-status ${job.status === 'OPEN' ? 'status-open' : 'status-closed'}`}>
                  {job.status}
                </div>
                <h3 className="job-title">{job.position_title}</h3>
                <div className="job-assignment">{job.place_of_assignment}</div>
                <div className="job-details">
                  <span className="job-detail-item">SG {job.salary_grade}</span>
                  <span className="job-detail-item">₱{job.monthly_salary?.toLocaleString()}</span>
                  <span className="job-detail-item">Item No: {job.item_no}</span>
                </div>
                <div className="job-applicants">
                  <DocumentMonoIcon/> {job.applicants_count || 0} applicant(s) applied
                </div>
                <div className="job-deadline">
                  <img src={calendarclockLogo} alt="Calendar" className="calendar-icon" /> Closing Date: {job.closing_date}
                </div>
                <div className="job-card-actions">
                  <button className="view-btn" onClick={() => setShowDetails(job)}>
                    View Details
                  </button>
                  <button 
                    className="view-candidates-btn" 
                    onClick={() => navigate(`/hr/jobs/${job.id}/candidates`)}
                  >
                    <img src={communityLogo} alt="Community"  style={{ 
                width: 16, 
                height: 16,
                marginRight: 2,
                marginBottom: 2,
                 display: 'inline-block',

        verticalAlign: 'middle',
                filter: 'brightness(0) saturate(100%) invert(25%) sepia(50%) saturate(800%) hue-rotate(180deg) brightness(95%) contrast(90%)'
    }}  className="community-icon" /> View Candidates ({job.applicants_count || 0})
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Add Job Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Post New Job Vacancy</h2>
              <button className="close-modal" onClick={() => setShowForm(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Position Title </label>
                <select
                  value={newJob.positionTitle}
                  onChange={(e) => handlePositionTitleChange(e.target.value)}
                  required
                >
                  <option value="">Select Position...</option>
                  {POSITION_TITLES.map((title) => (
                    <option key={title} value={title}>{title}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Place of Assignment </label>
                <select
                  value={showOtherInput ? "Other (Specify)" : newJob.placeOfAssignment || ""}
                  onChange={(e) => handlePlaceOfAssignmentChange(e.target.value)}
                  required
                >
                  <option value="">Select Office/Department...</option>
                  {LGU_OFFICES.map((office) => (
                    <option key={office} value={office}>{office}</option>
                  ))}
                </select>
                {showOtherInput && (
                  <input
                    type="text"
                    className="other-input"
                    placeholder="Please specify office/department..."
                    value={newJob.placeOfAssignment}
                    onChange={(e) => setNewJob({...newJob, placeOfAssignment: e.target.value})}
                    style={{ marginTop: '8px', width: '100%', padding: '8px 12px', border: '1px solid #dee2e6', borderRadius: '6px' }}
                    required
                  />
                )}
                <small>Select an office from the list or choose "Other (Specify)" to type manually</small>
              </div>

              <div className="form-group">
                <label>Item No.</label>
                <input 
                  type="text" 
                  placeholder="e.g., ICWS-025" 
                  value={newJob.itemNo}
                  onChange={(e) => setNewJob({...newJob, itemNo: e.target.value})} 
                />
              </div>

              <div className="form-group">
                <label>Salary Grade</label>
                <div className="salary-input-wrapper">
                  <input 
                    type="number" 
                    value={newJob.salaryGrade || ""}
                    readOnly
                    className="salary-input"
                    style={{ 
                      background: '#f3f4f6', 
                      cursor: 'not-allowed',
                      fontWeight: 'bold',
                      paddingRight: '140px'
                    }}
                  />
                  <span className="salary-display">
                    {newJob.monthlySalary > 0 && `₱${newJob.monthlySalary.toLocaleString()} / month`}
                  </span>
                </div>
                <small>Auto-filled based on position title</small>
              </div>

              <div className="form-group">
                <label>Closing Date </label>
                <input 
                  type="date" 
                  value={newJob.closingDate}
                  onChange={(e) => setNewJob({...newJob, closingDate: e.target.value})} 
                />
              </div>

              <div className="qualifications-section">
                <h4 style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}><img 
                  src={clipboardactivitylogLogo} 
                  alt="Activity Log" 
                  style={{ 
                    width: 22, 
                    height: 22,
                    filter: 'brightness(0) saturate(100%) invert(13%) sepia(97%) saturate(1600%) hue-rotate(190deg) brightness(92%) contrast(98%)'
                  }} 
                /> Qualifications</h4>
                
                <div className="form-group">
                  <label>Education</label>
                  <select
                    value={newJob.qualifications.education}
                    onChange={(e) => setNewJob({
                      ...newJob, 
                      qualifications: {...newJob.qualifications, education: parseInt(e.target.value)}
                    })}
                  >
                    {EDUCATION_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Eligibility</label>
                  <select
                    value={newJob.qualifications.eligibility}
                    onChange={(e) => setNewJob({
                      ...newJob, 
                      qualifications: {...newJob.qualifications, eligibility: e.target.value}
                    })}
                  >
                    {ELIGIBILITY_OPTIONS.map((opt, index) => (
                      <option key={index} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Training (in hours)</label>
                  <select
                    value={newJob.qualifications.training}
                    onChange={(e) => setNewJob({
                      ...newJob, 
                      qualifications: {...newJob.qualifications, training: parseInt(e.target.value)}
                    })}
                  >
                    {TRAINING_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Work Experience (in years)</label>
                  <select
                    value={newJob.qualifications.workExperience}
                    onChange={(e) => setNewJob({
                      ...newJob, 
                      qualifications: {...newJob.qualifications, workExperience: parseInt(e.target.value)}
                    })}
                  >
                    {EXPERIENCE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Instructions / Remarks</label>
                <textarea 
                  rows="3" 
                  placeholder="Application instructions..." 
                  value={newJob.instructions}
                  onChange={(e) => setNewJob({...newJob, instructions: e.target.value})} 
                />
              </div>

              <div className="form-group">
                <label>Required Documents</label>
                <div className="required-docs-section">
                  <div className="checkbox-group">
                    <input 
                      type="checkbox" 
                      checked={newJob.requiredDocs.pds} 
                      onChange={() => toggleRequiredDoc('pds')} 
                    />
                    <label>Personal Data Sheet (PDS)</label>
                  </div>
                  <div className="checkbox-group">
                    <input 
                      type="checkbox" 
                      checked={newJob.requiredDocs.transcriptRecords} 
                      onChange={() => toggleRequiredDoc('transcriptRecords')} 
                    />
                    <label>Transcript of Records</label>
                  </div>
                  <div className="checkbox-group">
                    <input 
                      type="checkbox" 
                      checked={newJob.requiredDocs.performanceRating} 
                      onChange={() => toggleRequiredDoc('performanceRating')} 
                    />
                    <label>Performance Rating</label>
                  </div>
                </div>
              </div>

              <div className="modal-actions">
                <button className="cancel-btn" onClick={() => setShowForm(false)}>Cancel</button>
               <button 
  className="save-btn" 
  onClick={() => {
    // Validate first
    if (!newJob.positionTitle || !newJob.placeOfAssignment || !newJob.closingDate) {
      alert("Please fill in all required fields (*)");
      return;
    }
    setPendingJobData(newJob);
    setShowConfirmPostModal(true);
  }}
>
  Post Job
</button>
              </div>
            </div>
          </div>
        </div>
      )}


{/* Confirm Post Job Modal */}
{showConfirmPostModal && pendingJobData && (
  <div className="modal-overlay" onClick={() => setShowConfirmPostModal(false)}>
    <div className="confirm-card" onClick={(e) => e.stopPropagation()} style={{ 
      width: '500px',
      maxWidth: '90vw'
    }}>
      {/* Header */}
      <div className="confirm-card-header" style={{ paddingBottom: '8px' }}>
        <span className="confirm-icon" style={{ fontSize: '28px', marginLeft: '0px' }}><CheckMarkSquareInterviewIcon size={40}  color="#43ae4d"/></span>
        <h3 style={{ fontSize: '20px', margin: '4px 0 0 0' }}>Confirm Job Posting</h3>
      </div>
      
      {/* Body */}
      <div className="confirm-card-body" style={{ padding: '8px 24px 16px 24px' }}>
        <p style={{ marginBottom: '8px', fontSize: '15px' }}>
          Are you sure you want to post this job?
        </p>
        <div style={{ 
          background: '#f8fafc', 
          padding: '12px 16px', 
          borderRadius: '8px',
          marginBottom: '12px'
        }}>
          <p style={{ fontWeight: '600', fontSize: '16px', color: '#1a1f36', marginBottom: '4px' }}>
            {pendingJobData.positionTitle}
          </p>
         <p style={{ 
  fontSize: '13px', 
  color: '#6c757d', 
  marginBottom: '2px',
  display: 'flex',
  alignItems: 'center',
  gap: '4px'
}}>
  <MapNavigationIcon size={14} />
  <span>{pendingJobData.placeOfAssignment}</span>
</p>
          <div style={{ 
  display: 'flex', 
  alignItems: 'center', 
  gap: '8px',
  marginTop: '8px',
  fontSize: '13px', 
  color: '#6c757d'
}}>
  <img 
    src={calendarminimalLogo} 
    alt="Calendar" 
    style={{ 
      width: '16px', 
      height: '16px',
      display: 'block',
       filter: 'brightness(0) saturate(100%) invert(13%) sepia(97%) saturate(1600%) hue-rotate(190deg) brightness(92%) contrast(98%)'
    }} 
  />
  <span>Closing: {pendingJobData.closingDate}</span>
</div>
        </div>
        <p style={{ color: '#6c757d', fontSize: '14px', margin: 0 }}>
          This action <strong>cannot be undone</strong>.
        </p>
      </div>
      
      {/* Footer */}
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
          onClick={() => setShowConfirmPostModal(false)}
          disabled={isPosting}
          style={{
            padding: '8px 24px',
            background: '#D3F0F9',
            color: '#1a3a5c',
            border: 'none',
            borderRadius: '6px',
            cursor: isPosting ? 'not-allowed' : 'pointer',
            fontWeight: '500',
            transition: 'background 0.2s ease',
            opacity: isPosting ? 0.5 : 1
          }}
          onMouseEnter={(e) => {
            if (!isPosting) e.currentTarget.style.background = '#b8e4f0';
          }}
          onMouseLeave={(e) => {
            if (!isPosting) e.currentTarget.style.background = '#D3F0F9';
          }}
        >
          Cancel
        </button>
       <button 
  className="btn-confirm"
  onClick={() => {
    setIsPosting(true);
    handleAddJob();
  }}
  disabled={isPosting}
  style={{
    padding: '8px 24px',
    background: isPosting ? '#0f766e' : '#0d9488',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: isPosting ? 'not-allowed' : 'pointer',
    fontWeight: '500',
    transition: 'background 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    opacity: isPosting ? 0.7 : 1
  }}
  onMouseEnter={(e) => {
    if (!isPosting) {
      e.currentTarget.style.background = '#0f766e';
    }
  }}
  onMouseLeave={(e) => {
    if (!isPosting) {
      e.currentTarget.style.background = '#0d9488';
    }
  }}
>
  {isPosting ? (
    <>
      <span className="spinner" />
      Posting...
    </>
  ) : (
    'Confirm'
  )}
</button>
      </div>
    </div>
  </div>
)}

{/* Dynamic Success Notification */}
{jobPostSuccessMessage && (
  <div style={{
    position: 'fixed',
    bottom: '20px',
    right: '20px',
    padding: '12px 20px',
    background: jobPostSuccessMessage.includes('deleted') ? '#dc2626' : '#0D9488',
    color: 'white',
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    zIndex: 9999,
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    animation: 'slideIn 0.3s ease'
  }}>
    {jobPostSuccessMessage.includes('deleted') ? (
      <span style={{ fontSize: '18px' }}><TrashCircleIcon size = {29} /></span>
    ) : (
      <CircularCheckSuccessIcon size={19} style={{ color: 'white' }} />
    )}
    <span>{jobPostSuccessMessage}</span>
  </div>
)}

{/* Edit Success Notification */}
{editSuccessMessage && (
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
    gap: '10px',
    animation: 'slideIn 0.3s ease'
  }}>
    <CircularCheckSuccessIcon size={19} style={{ color: 'white' }} />
    <span>{editSuccessMessage}</span>
  </div>
)}



  {/* View Job Details Modal */}
{showDetails && (
  <div className="modal-overlay" onClick={() => {
    if (!isEditing) setShowDetails(null);
  }}>
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
        {isEditing ? (
          <select
            value={editFormData?.position_title || ''}
            onChange={(e) => {
              const title = e.target.value;
              const sg = POSITION_SG_MAPPING[title] || "";
              const salary = sg ? DBM_SALARY_TABLE[sg] || 0 : 0;

              setEditFormData({
                ...editFormData,
                position_title: title,
                salary_grade: sg,
                monthly_salary: salary
              });
            }}
            style={{
              width: '100%',
              padding: '10px 14px',
              border: '1px solid #bfdbfe',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 500,
              height: '42px',
              background: 'white'
            }}
          >
            <option value="">Select Position...</option>
            {POSITION_TITLES.map(title => (
              <option key={title} value={title}>{title}</option>
            ))}
          </select>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 6px rgba(37,99,235,0.12)',
              flexShrink: 0
            }}>
              <span style={{ fontSize: '18px' }}><BasiconsBriefcaseIcon size={20} color="#4F46E5" /></span>
            </div>
            <div>
              <div style={{
                fontSize: '11px',
                fontWeight: 700,
                color: '#1a3a5c',
                letterSpacing: '1px',
                textTransform: 'uppercase',
                marginBottom: '2px'
              }}>
                Job Details
              </div>
              <h2 style={{ margin: 0, fontSize: '18px', color: '#1a1f36', fontWeight: 700 }}>
                {showDetails.position_title}
              </h2>
            </div>
          </div>
        )}
        <button className="close-modal" onClick={() => {
          if (!isEditing) setShowDetails(null);
        }}>×</button>
      </div>

      <div className="modal-body">

        {/* ── JOB DETAILS ── */}
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
            <span style={{ color: '#4F46E5' }}>■</span> Job Details
          </h4>
          <div className="detail-grid">
            <div>
              <span className="detail-label">Place of Assignment</span>
              {isEditing ? (
                <select
                  value={editFormData?.place_of_assignment || ''}
                  onChange={(e) => setEditFormData({...editFormData, place_of_assignment: e.target.value})}
                  style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px' }}
                >
                  <option value="">Select Office...</option>
                  {LGU_OFFICES.map(office => (
                    <option key={office} value={office}>{office}</option>
                  ))}
                </select>
              ) : (
                <span className="detail-value">{showDetails.place_of_assignment}</span>
              )}
            </div>
            <div>
              <span className="detail-label">Item No.</span>
              {isEditing ? (
                <input
                  type="text"
                  value={editFormData?.item_no || ''}
                  onChange={(e) => setEditFormData({...editFormData, item_no: e.target.value})}
                  style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px' }}
                />
              ) : (
                <span className="detail-value">{showDetails.item_no}</span>
              )}
            </div>
            <div>
              <span className="detail-label">Salary Grade</span>
              <span style={{
                display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '8px 12px',
  background: '#eef2ff',
  borderRadius: '6px',
  fontWeight: 700,
  color: '#1a3a5c'
              }}>
                {editFormData?.salary_grade || showDetails.salary_grade} <span style={{ fontSize: '10px', fontWeight: 400, color: '#6c757d' }}>(auto-set)</span>
              </span>
            </div>
            <div>
              <span className="detail-label">Monthly Salary</span>
              <span style={{
               display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '8px 12px',
  background: '#eef2ff',
  borderRadius: '6px',
  fontWeight: 700,
  color: '#1a3a5c'
              }}>
                ₱{(editFormData?.monthly_salary || showDetails.monthly_salary)?.toLocaleString()} <span style={{ fontSize: '10px', fontWeight: 400, color: '#6c757d' }}>(auto-set)</span>
              </span>
            </div>
            <div>
              <span className="detail-label">Closing Date</span>
              {isEditing ? (
                <input
                  type="date"
                  value={editFormData?.closing_date || ''}
                  onChange={(e) => setEditFormData({...editFormData, closing_date: e.target.value})}
                  style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px' }}
                />
              ) : (
                <span className="detail-value">{showDetails.closing_date}</span>
              )}
            </div>
           <div>
  <span className="detail-label">Status</span>
  {isEditing ? (
    <select
      value={editFormData?.status || 'OPEN'}
      onChange={(e) => setEditFormData({...editFormData, status: e.target.value})}
      style={{ 
        width: '100%', 
        padding: '8px', 
        border: '1px solid #ddd', 
        borderRadius: '6px' 
      }}
    >
      <option value="OPEN">OPEN</option>
      <option value="CLOSED">CLOSED</option>
    </select>
  ) : (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      padding: '4px 12px',
      borderRadius: '999px',
      fontSize: '12px',
      fontWeight: 700,
      letterSpacing: '0.3px',
      background: showDetails.status === 'OPEN' ? '#dcfce7' : '#fef2f2',
      color: showDetails.status === 'OPEN' ? '#166534' : '#dc2626',
      border: `1px solid ${showDetails.status === 'OPEN' ? '#bbf7d0' : '#fecaca'}`
    }}>
      <span style={{
        width: '6px',
        height: '6px',
        borderRadius: '50%',
        background: showDetails.status === 'OPEN' ? '#16a34a' : '#dc2626'
      }} />
      {showDetails.status}
    </span>
  )}
</div>
          </div>
        </div>

        {/* ── QUALIFICATIONS ── */}
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
            <span style={{ color: '#0d9488' }}>■</span> Qualifications
          </h4>
          <div className="detail-grid">
            <div>
              <span className="detail-label">Education</span>
              {isEditing ? (
                <select
                  value={editFormData?.required_education || ''}
                  onChange={(e) => setEditFormData({...editFormData, required_education: parseInt(e.target.value)})}
                  style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px' }}
                >
                  {EDUCATION_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              ) : (
                <span className="detail-value">{getEducationLabel(showDetails.qualifications?.education)}</span>
              )}
            </div>
            <div>
              <span className="detail-label">Eligibility</span>
              {isEditing ? (
                <select
                  value={editFormData?.required_eligibility || ''}
                  onChange={(e) => setEditFormData({...editFormData, required_eligibility: e.target.value})}
                  style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px' }}
                >
                  {ELIGIBILITY_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              ) : (
                <span className="detail-value">{getEligibilityLabel(showDetails.qualifications?.eligibility)}</span>
              )}
            </div>
            <div>
              <span className="detail-label">Training</span>
              {isEditing ? (
                <select
                  value={editFormData?.required_training || ''}
                  onChange={(e) => setEditFormData({...editFormData, required_training: parseInt(e.target.value)})}
                  style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px' }}
                >
                  {TRAINING_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              ) : (
                <span className="detail-value">{getTrainingLabel(showDetails.qualifications?.training)}</span>
              )}
            </div>
            <div>
              <span className="detail-label">Work Experience</span>
              {isEditing ? (
                <select
                  value={editFormData?.required_work_experience || ''}
                  onChange={(e) => setEditFormData({...editFormData, required_work_experience: parseInt(e.target.value)})}
                  style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px' }}
                >
                  {EXPERIENCE_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              ) : (
                <span className="detail-value">{getExperienceLabel(showDetails.qualifications?.workExperience)}</span>
              )}
            </div>
          </div>
        </div>

        {/* ── INSTRUCTIONS ── */}
        {isEditing ? (
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
              margin: '0 0 12px 0',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span style={{ color: '#f59e0b' }}>■</span> Instructions / Remarks
            </h4>
            <textarea
              value={editFormData?.instructions || ''}
              onChange={(e) => setEditFormData({...editFormData, instructions: e.target.value})}
              rows="3"
              style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '13px', fontFamily: 'inherit' }}
            />
          </div>
        ) : (
          showDetails.instructions && (
            <div style={{
              background: '#fffbeb',
              border: '1px solid #fde68a',
              borderRadius: '12px',
              padding: '16px 20px',
              marginBottom: '16px'
            }}>
              <h4 style={{
                fontSize: '12px',
                fontWeight: 700,
                color: '#92400e',
                letterSpacing: '0.8px',
                textTransform: 'uppercase',
                margin: '0 0 8px 0',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <BasiconsInstructionsIcon size={16} color="#92400e" /> Instructions / Remarks
              </h4>
              <p style={{ fontSize: '13px', lineHeight: 1.6, margin: 0, color: '#78350f' }}>{showDetails.instructions}</p>
            </div>
          )
        )}

        {/* ── ACTIONS ── */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '20px' }}>
          {isEditing ? (
            <>
              <button
                className="cancel-btn"
                onClick={() => {
                  setIsEditing(false);
                  setEditFormData(null);
                }}
                style={{ flex: 1, backgroundColor: '#f3f4f6', color: '#4a5568', border: 'none', padding: '12px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, minWidth: '120px', transition: 'background 0.2s ease' }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#e5e7eb'}
                onMouseLeave={(e) => e.currentTarget.style.background = '#f3f4f6'}
              >
                Cancel Edit
              </button>
              <button
                className="save-btn"
                onClick={() => setShowEditConfirm(true)}
                style={{ flex: 1, backgroundColor: '#0d9488', color: 'white', border: 'none', padding: '12px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, minWidth: '120px', transition: 'background 0.2s ease' }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#0f766e'}
                onMouseLeave={(e) => e.currentTarget.style.background = '#0d9488'}
              >
                Save Changes
              </button>
            </>
          ) : (
            <>
              
              <button
                className="delete-btn"
                onClick={() => setShowDeleteConfirm(true)}
                style={{
                  flex: 1,
                  backgroundColor: '#dc2626',
                  color: 'white',
                  border: 'none',
                  padding: '12px 20px',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',  // ← add for centering
                  gap: '8px',
                  cursor: 'pointer',
                  
                  fontWeight: 600,
                  transition: 'background 0.2s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#b91c1c'}
                onMouseLeave={(e) => e.currentTarget.style.background = '#dc2626'}
              >
                 <span style={{
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    transform: 'translateX(-16px)'   // ← shifts ONLY the content
  }}>
                <TrashCircleIcon size={26} color="white" />
                Delete
                </span>
              </button>

              <button
                className="edit-btn"
                onClick={() => {
                  setEditFormData({
                    position_title: showDetails.position_title,
                    place_of_assignment: showDetails.place_of_assignment,
                    item_no: showDetails.item_no || '',
                    closing_date: showDetails.closing_date,
                    status: showDetails.status || 'OPEN',
                    required_education: showDetails.qualifications?.education || '',
                    required_eligibility: showDetails.qualifications?.eligibility || '',
                    required_training: showDetails.qualifications?.training || '',
                    required_work_experience: showDetails.qualifications?.workExperience || '',
                    instructions: showDetails.instructions || '',
                    required_docs: showDetails.required_docs || {}
                  });
                  setIsEditing(true);
                }}
                style={{
                  flex: 1,
                  backgroundColor: '#4f46e5',
                  color: 'white',
                  border: 'none',
                  padding: '12px 20px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  transition: 'background 0.2s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#4338ca'}
                onMouseLeave={(e) => e.currentTarget.style.background = '#4f46e5'}
              >
                 <span style={{
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    transform: 'translateX(-10px)'   // ← shifts ONLY the content
  }}>
                <EditJobIcon size={26} color="white" />
                Edit Job
                </span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  </div>
)}








{/* Delete Confirmation Modal */}
{showDeleteConfirm && (
  <div className="modal-overlay" onClick={() => {
    if (!isDeleting) setShowDeleteConfirm(false);
  }}>
    <div className="confirm-card" onClick={(e) => e.stopPropagation()}>
      <div className="confirm-card-header">
        <span className="confirm-icon" style={{ fontSize: '28px' }}>⚠️</span>
        <h3>Delete Job Posting</h3>
      </div>
      <div className="confirm-card-body">
        <p>Are you sure you want to delete this job posting?</p>
        <p style={{ 
          fontWeight: '600', 
          fontSize: '16px', 
          color: '#1a1f36',
          marginTop: '8px'
        }}>
          {showDetails?.position_title}
        </p>
        <p style={{ color: '#6c757d', fontSize: '14px', marginTop: '8px' }}>
          This action <strong>cannot be undone</strong>.
        </p>
      </div>
      <div className="confirm-card-footer" style={{ margin: '0 -24px -24px -24px', padding: '16px 24px', borderRadius: '0 0 12px 12px' }}>
        <button 
          className="btn-cancel" 
          onClick={() => setShowDeleteConfirm(false)}
          disabled={isDeleting}
          style={{
            padding: '8px 24px',
            background: '#D3F0F9',
            color: '#1a3a5c',
            border: 'none',
            borderRadius: '6px',
            cursor: isDeleting ? 'not-allowed' : 'pointer',
            fontWeight: '500',
            transition: 'background 0.2s ease',
            opacity: isDeleting ? 0.5 : 1
          }}
          onMouseEnter={(e) => {
            if (!isDeleting) e.currentTarget.style.background = '#b8e4f0';
          }}
          onMouseLeave={(e) => {
            if (!isDeleting) e.currentTarget.style.background = '#D3F0F9';
          }}
        >
          Cancel
        </button>
        <button 
          className="btn-confirm" 
          onClick={() => {
            setIsDeleting(true);
            handleDeleteJob();
          }}
          disabled={isDeleting}
          style={{
            padding: '8px 24px',
            background: isDeleting ? '#991b1b' : '#dc2626',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: isDeleting ? 'not-allowed' : 'pointer',
            fontWeight: '500',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            opacity: isDeleting ? 0.7 : 1
          }}
          onMouseEnter={(e) => {
            if (!isDeleting) e.currentTarget.style.background = '#b91c1c';
          }}
          onMouseLeave={(e) => {
            if (!isDeleting) e.currentTarget.style.background = '#dc2626';
          }}
        >
          {isDeleting ? (
            <>
              <span className="spinner" />
              Deleting...
            </>
          ) : (
            'Delete'
          )}
        </button>
      </div>
    </div>
  </div>
)}





{/* Edit Confirmation Modal */}
{showEditConfirm && (
  <div className="modal-overlay" onClick={() => {
    if (!isSaving) setShowEditConfirm(false);
  }}>
    <div className="confirm-card" onClick={(e) => e.stopPropagation()}>
      <div className="confirm-card-header">
        <span className="confirm-icon" style={{ fontSize: '28px' }}><CheckMarkSquareInterviewIcon size={40}  color="#43ae4d"/></span>
        <h3>Confirm Changes</h3>
      </div>
      <div className="confirm-card-body">
        <p>Are you sure you want to save these changes?</p>
        <p style={{ 
          fontWeight: '600', 
          fontSize: '16px', 
          color: '#1a1f36',
          marginTop: '8px'
        }}>
          {editFormData?.position_title || showDetails?.position_title}
        </p>
        <p style={{ color: '#6c757d', fontSize: '14px', marginTop: '8px' }}>
          This will update the job posting immediately.
        </p>
      </div>
      <div className="confirm-card-footer" style={{ margin: '0 -24px -24px -24px', padding: '16px 24px', borderRadius: '0 0 12px 12px' }}>
       <button 
          className="btn-cancel"
          onClick={() => setShowEditConfirm(false)}
          disabled={isSaving}
          style={{
            padding: '8px 24px',
            background: '#D3F0F9',
            color: '#1a3a5c',
            border: 'none',
            borderRadius: '6px',
            cursor: isSaving ? 'not-allowed' : 'pointer',
            fontWeight: '500',
            transition: 'background 0.2s ease',
            opacity: isSaving ? 0.5 : 1
          }}
          onMouseEnter={(e) => {
            if (!isSaving) e.currentTarget.style.background = '#b8e4f0';
          }}
          onMouseLeave={(e) => {
            if (!isSaving) e.currentTarget.style.background = '#D3F0F9';
          }}
        >
          Cancel
        </button>
        <button 
          className="btn-confirm"
          onClick={() => {
            // Don't close modal here - let handleEditJob close it after save
            setIsSaving(true);
            handleEditJob();
          }}
          disabled={isSaving}
          style={{
            padding: '8px 24px',
            background: isSaving ? '#0f766e' : '#0d9488',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: isSaving ? 'not-allowed' : 'pointer',
            fontWeight: '500',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            opacity: isSaving ? 0.7 : 1
          }}
          onMouseEnter={(e) => {
            if (!isSaving) {
              e.currentTarget.style.background = '#0f766e';
            }
          }}
          onMouseLeave={(e) => {
            if (!isSaving) {
              e.currentTarget.style.background = '#0d9488';
            }
          }}
        >
          {isSaving ? (
            <>
              <span className="spinner" />
              Saving...
            </>
          ) : (
            'Confirm'
          )}
        </button>
      </div>
    </div>
  </div>
)}
    </>
  );
}
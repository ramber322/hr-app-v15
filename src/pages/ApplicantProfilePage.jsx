import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from "../components/Navbar";
import { supabase } from '../lib/supabase';
import { PatternBackground } from '../components/PatternBackground';
import Loader from '../components/Loader';
import { BasiconsDocumentIcon, CircularCheckSuccessIcon } from "../components/icons/CustomIcons";

// ─── Helper: format file size ─────────────────────────
const formatFileSize = (bytes) => {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};

// ─── Helper: check if URL is set ──────────────────────
const hasFile = (url) => url && url !== '';

function ApplicantProfilePage() {
  const [profileSuccessMessage, setProfileSuccessMessage] = useState(null);
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);

  // ─── Profile state ────────────────────────────────
  const [profile, setProfile] = useState({
    firstName: "",
    surname: "",
    phoneNumber: "",
    email: "",
    age: "",
    gender: "",
    address: ""
  });

  // ─── Documents state ──────────────────────────────
  const [documents, setDocuments] = useState({
    pds: { url: null, uploading: false, parsing: false, filename: null },
    transcript: { url: null, uploading: false, filename: null },
    performanceRating: { url: null, uploading: false, filename: null },
    eligibility: { url: null, uploading: false, filename: null },
    trainingCert: { url: null, uploading: false, filename: null },
  });

  // ─── Parsed PDS state ─────────────────────────────
  const [parsedPDS, setParsedPDS] = useState(null);
  const [showPDSViewer, setShowPDSViewer] = useState(false);

  useEffect(() => {
    loadUserProfile();
  }, []);

  // ─── Load profile + documents + parsed data ────────
  const loadUserProfile = async () => {
    setLoading(true);

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) {
        navigate('/login');
        return;
      }

      const metadata = user.user_metadata || {};
      setProfile({
        firstName: metadata.first_name || "",
        surname: metadata.surname || "",
        phoneNumber: metadata.phone_number || "",
        email: user.email || "",
        age: metadata.age || "",
        gender: metadata.gender || "",
        address: metadata.address || ""
      });

      // ─── Load applicant documents ───────────────────
      const { data: applicantData, error: applicantError } = await supabase
        .from('applicants')
        .select(`
          pds_file_url,
          tor_file_url,
          performance_rating_file_url,
          eligibility_file_url,
          training_cert_file_url,
          parsed_pds_raw,
          has_pds,
          has_transcript,
          has_eligibility,
          has_training_cert
        `)
        .eq('id', user.id)
        .maybeSingle();

      if (applicantError) {
        console.warn('Could not load applicant docs:', applicantError);
      } else if (applicantData) {
        setDocuments({
          pds: {
            url: applicantData.pds_file_url,
            filename: applicantData.pds_file_url ? 'PDS.pdf' : null,
            uploading: false,
            parsing: false,
          },
          transcript: {
            url: applicantData.tor_file_url,
            filename: applicantData.tor_file_url ? 'Transcript.pdf' : null,
            uploading: false,
          },
          performanceRating: {
            url: applicantData.performance_rating_file_url,
            filename: applicantData.performance_rating_file_url ? 'PerformanceRating.pdf' : null,
            uploading: false,
          },
          eligibility: {
            url: applicantData.eligibility_file_url,
            filename: applicantData.eligibility_file_url ? 'Eligibility.pdf' : null,
            uploading: false,
          },
          trainingCert: {
            url: applicantData.training_cert_file_url,
            filename: applicantData.training_cert_file_url ? 'TrainingCert.pdf' : null,
            uploading: false,
          },
        });

        if (applicantData.parsed_pds_raw) {
          setParsedPDS(applicantData.parsed_pds_raw);
        }
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      alert('Error loading profile: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // ─── Save profile info ────────────────────────────
  const handleSave = async () => {
    setIsEditing(false);
    setLoading(true);

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error("User not found");

      const { error: updateError } = await supabase.auth.updateUser({
        data: {
          first_name: profile.firstName,
          surname: profile.surname,
          phone_number: profile.phoneNumber,
          age: profile.age,
          gender: profile.gender,
          address: profile.address
        }
      });

      if (updateError) throw updateError;

      const { error: applicantError } = await supabase
        .from('applicants')
        .update({
          full_name: `${profile.firstName} ${profile.surname}`,
          phone: profile.phoneNumber,
          email: profile.email,
          address: profile.address
        })
        .eq('id', user.id);

      if (applicantError) throw applicantError;

      setProfileSuccessMessage(' Profile saved successfully!');
      setTimeout(() => setProfileSuccessMessage(null), 5000);

    } catch (error) {
      console.error('Error saving profile:', error);
      alert('Error saving profile: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // ─── Upload a document ────────────────────────────
  const handleUploadDocument = async (docType, file) => {
    if (!file) return;

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('File is too large. Maximum size is 10MB.');
      return;
    }

    // Validate file type
  // ─── Validate file type ────────────────────────────────
const allowedTypes = [
  'application/pdf',                                                                    // .pdf
  'image/jpeg',                                                                         // .jpg
  'image/jpg',                                                                          // .jpeg (alias)
  'image/png',                                                                          // .png
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',                  // .xlsx (NEW)
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',            // .docx (NEW)
];

if (!allowedTypes.includes(file.type)) {
  // Specific messages for unsupported formats
  if (file.name.match(/\.xls$/i)) {
    alert(
      '❌ Old Excel format (.xls) is not supported.\n\n' +
      'Please save your PDS as .xlsx or PDF:\n' +
      '1. Open in Excel\n' +
      '2. File → Save As\n' +
      '3. Choose "Excel Workbook (.xlsx)" or "PDF"\n' +
      '4. Upload the new file'
    );
  } else if (file.name.match(/\.(doc|rtf|odt)$/i)) {
    alert(
      '❌ Only .docx is supported for Word documents.\n\n' +
      'Please save your file as .docx or PDF.'
    );
  } else {
    alert(
      '❌ Unsupported file type.\n\n' +
      'Accepted formats: PDF, XLSX, DOCX, JPG, PNG'
    );
  }
  return;
}

    setDocuments(prev => ({
      ...prev,
      [docType]: { ...prev[docType], uploading: true }
    }));

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not logged in');

      // Upload to profile folder
      const fileExt = file.name.split('.').pop();
      const timestamp = Date.now();
      const fileName = `${docType}_${timestamp}.${fileExt}`;
      const filePath = `profile/${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('applicant_docs')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('applicant_docs')
        .getPublicUrl(filePath);

      // ─── Map docType → DB column ─────────────────
      const columnMap = {
        pds: 'pds_file_url',
        transcript: 'tor_file_url',
        performanceRating: 'performance_rating_file_url',
        eligibility: 'eligibility_file_url',
        trainingCert: 'training_cert_file_url',
      };

      const booleanMap = {
        pds: 'has_pds',
        transcript: 'has_transcript',
        eligibility: 'has_eligibility',
        trainingCert: 'has_training_cert',
      };

      // ─── Save URL to DB ───────────────────────────
      const updateData = {
        [columnMap[docType]]: publicUrl,
      };

      if (booleanMap[docType]) {
        updateData[booleanMap[docType]] = true;
      }

      if (docType === 'pds') {
        updateData.pds_uploaded_at = new Date().toISOString();
      }

      const { error: dbError } = await supabase
        .from('applicants')
        .update(updateData)
        .eq('id', user.id);

      if (dbError) throw dbError;

      setDocuments(prev => ({
        ...prev,
        [docType]: {
          url: publicUrl,
          filename: fileName,
          uploading: false,
          parsing: false,
        }
      }));

      setProfileSuccessMessage(` ${getDocLabel(docType)} uploaded successfully!`);
      setTimeout(() => setProfileSuccessMessage(null), 5000);

    } catch (error) {
      console.error(`Error uploading ${docType}:`, error);
      alert('Error uploading file: ' + error.message);
      setDocuments(prev => ({
        ...prev,
        [docType]: { ...prev[docType], uploading: false }
      }));
    }
  };

  // ─── Delete a document ────────────────────────────
  const handleDeleteDocument = async (docType) => {
    if (!window.confirm(`Are you sure you want to delete your ${getDocLabel(docType)}?`)) {
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not logged in');

      const columnMap = {
        pds: 'pds_file_url',
        transcript: 'tor_file_url',
        performanceRating: 'performance_rating_file_url',
        eligibility: 'eligibility_file_url',
        trainingCert: 'training_cert_file_url',
      };

      const booleanMap = {
        pds: 'has_pds',
        transcript: 'has_transcript',
        eligibility: 'has_eligibility',
        trainingCert: 'has_training_cert',
      };

      const updateData = {
        [columnMap[docType]]: null,
      };

      if (booleanMap[docType]) {
        updateData[booleanMap[docType]] = false;
      }

      if (docType === 'pds') {
        updateData.parsed_pds_raw = null;
        updateData.pds_uploaded_at = null;
      }

      const { error: dbError } = await supabase
        .from('applicants')
        .update(updateData)
        .eq('id', user.id);

      if (dbError) throw dbError;

      setDocuments(prev => ({
        ...prev,
        [docType]: { url: null, filename: null, uploading: false, parsing: false }
      }));

      if (docType === 'pds') {
        setParsedPDS(null);
      }

      setProfileSuccessMessage(`🗑️ ${getDocLabel(docType)} deleted`);
      setTimeout(() => setProfileSuccessMessage(null), 5000);

    } catch (error) {
      console.error(`Error deleting ${docType}:`, error);
      alert('Error deleting file: ' + error.message);
    }
  };

  // ─── Get friendly doc labels ──────────────────────
  const getDocLabel = (docType) => {
    const labels = {
      pds: 'Personal Data Sheet',
      transcript: 'Transcript of Records',
      performanceRating: 'Performance Rating',
      eligibility: 'Certificate of Eligibility',
      trainingCert: 'Training Certificate',
    };
    return labels[docType] || docType;
  };

  // ─── Styles ───────────────────────────────────────
  const styles = `
    .profile-page {
      min-height: 100vh;
      background: #F5F6F8;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      padding-top: 70px;
      position: relative;
    }

    .profile-container {
      max-width: 1000px;
      margin: 0 auto;
      padding: 20px;
      position: relative;
      z-index: 1;
    }

    .profile-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
      flex-wrap: wrap;
      gap: 15px;
    }

    .profile-header h1 {
      margin: 0;
      font-size: 28px;
      color: #1a1f36;
    }

    .edit-btn, .save-btn, .cancel-btn {
      padding: 10px 24px;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }

    .edit-btn {
      background: #4f46e5;
      color: white;
      border: none;
    }

    .edit-btn:hover {
      background: #4338ca;
    }

    .save-btn {
      background: #0d9488;
      color: white;
      border: none;
    }

    .save-btn:hover {
      background: #0f766e;
    }

    .cancel-btn {
      background: white;
      color: #6c757d;
      border: 1px solid #dee2e6;
      margin-left: 10px;
    }

    .cancel-btn:hover {
      background: #f8f9fa;
    }

    .profile-card {
      background: white;
      border-radius: 16px;
      margin-bottom: 24px;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0,0,0,0.08);
    }

    .card-title {
      padding: 20px 24px;
      border-bottom: 1px solid #e9ecef;
      font-size: 18px;
      font-weight: 600;
      color: #1a1f36;
      margin: 0;
    }

    .card-content {
      padding: 24px;
    }

    .form-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 20px;
    }

    .form-group {
      display: flex;
      flex-direction: column;
    }

    .form-group.full-width {
      grid-column: span 2;
    }

    .form-group label {
      font-size: 13px;
      font-weight: 500;
      color: #4a5568;
      margin-bottom: 6px;
    }

    .form-group input, .form-group textarea, .form-group select {
      padding: 10px 12px;
      border: 1px solid #dee2e6;
      border-radius: 8px;
      font-size: 14px;
      font-family: inherit;
    }

    .form-group input:focus, .form-group textarea:focus, .form-group select:focus {
      outline: none;
      border-color: #4f46e5;
      box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
    }

    .form-group input:disabled, .form-group textarea:disabled, .form-group select:disabled {
      background: #f8f9fa;
      color: #1a1f36;
      cursor: not-allowed;
    }

    .loading-text {
      text-align: center;
      padding: 40px;
      color: #6c757d;
    }

    /* Document upload styles */
    .doc-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px;
      border: 1px solid #e5e7eb;
      border-radius: 10px;
      margin-bottom: 12px;
      gap: 16px;
      transition: background 0.2s ease;
    }

    .doc-item:hover {
      background: #fafbff;
    }

    .doc-info {
      flex: 1;
      min-width: 0;
    }

    .doc-name {
      font-size: 14px;
      font-weight: 600;
      color: #1a1f36;
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 4px;
    }

    .doc-desc {
      font-size: 12px;
      color: #6c757d;
    }

    .doc-status {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 600;
    }

    .doc-status.uploaded {
      background: #dcfce7;
      color: #166534;
    }

    .doc-status.missing {
      background: #fee2e2;
      color: #dc2626;
    }

    .doc-status.optional {
      background: #f3f4f6;
      color: #6c757d;
    }

    .doc-actions {
      display: flex;
      gap: 8px;
      flex-shrink: 0;
    }

    .doc-btn {
      padding: 6px 14px;
      border-radius: 6px;
      border: none;
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      transition: background 0.2s ease;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }

    .doc-btn.upload {
      background: #4f46e5;
      color: white;
    }

    .doc-btn.upload:hover {
      background: #4338ca;
    }

    .doc-btn.view {
      background: #D3F0F9;
      color: #1a3a5c;
    }

    .doc-btn.view:hover {
      background: #b8e4f0;
    }

    .doc-btn.delete {
      background: #fee2e2;
      color: #dc2626;
    }

    .doc-btn.delete:hover {
      background: #fecaca;
    }

    .doc-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .pds-primary {
      border-color: #c7d2fe;
      background: #f8f9ff;
    }

    .pds-primary .doc-name {
      color: #4f46e5;
    }

    @media (max-width: 768px) {
      .profile-container { padding: 15px; }
      .form-grid { grid-template-columns: 1fr; }
      .form-group.full-width { grid-column: span 1; }
      .profile-header { flex-direction: column; align-items: flex-start; }
      .doc-item { flex-direction: column; align-items: flex-start; }
      .doc-actions { width: 100%; }
      .doc-btn { flex: 1; justify-content: center; }
    }
  `;

  if (loading) {
    return (
      <>
        <Navbar userRole="applicant" />
        <div className="profile-page">
          <style>{styles}</style>
          <div className="profile-container">
            <div className="loading-text"><Loader /></div>
          </div>
        </div>
      </>
    );
  }

  // ─── Document list config ──────────────────────────
  const documentList = [
  {
    type: 'pds',
    label: 'Personal Data Sheet',
    desc: 'Primary document used for screening against job requirements (.xlsx)',
  },
  {
    type: 'transcript',
    label: 'Transcript of Records',
    desc: 'Academic records from your school',
  },
  {
    type: 'performanceRating',
    label: 'Performance Rating',
    desc: 'From your most recent employment',
  },
];

  return (
    <>
      <Navbar userRole="applicant" />
      <div className="profile-page">
        <style>{styles}</style>

        <PatternBackground color="#aeacde" opacity={0.04} strokeOpacity={0.1} />

        <div className="profile-container">
          <div className="profile-header">
            <h1>My Profile</h1>
            <div>
              {!isEditing ? (
                <button className="edit-btn" onClick={() => setIsEditing(true)}>Edit Profile</button>
              ) : (
                <>
                  <button className="save-btn" onClick={handleSave}>Save Changes</button>
                  <button className="cancel-btn" onClick={() => {
                    setIsEditing(false);
                    loadUserProfile();
                  }}>Cancel</button>
                </>
              )}
            </div>
          </div>

          {/* ═══════════ Personal Information ═══════════ */}
          <div className="profile-card">
            <h3 className="card-title">Personal Information</h3>
            <div className="card-content">
              <div className="form-grid">
                <div className="form-group">
                  <label>First Name</label>
                  <input
                    type="text"
                    value={profile.firstName}
                    disabled={!isEditing}
                    onChange={(e) => setProfile({ ...profile, firstName: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Surname</label>
                  <input
                    type="text"
                    value={profile.surname}
                    disabled={!isEditing}
                    onChange={(e) => setProfile({ ...profile, surname: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Phone Number</label>
                  <input
                    type="tel"
                    value={profile.phoneNumber}
                    disabled={!isEditing}
                    onChange={(e) => setProfile({ ...profile, phoneNumber: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Email Address</label>
                  <input type="email" value={profile.email} disabled={true} />
                </div>
                <div className="form-group">
                  <label>Age</label>
                  <input type="number" value={profile.age} disabled={true} />
                </div>
                <div className="form-group">
                  <label>Gender</label>
                  <select
                    value={profile.gender}
                    disabled={!isEditing}
                    onChange={(e) => setProfile({ ...profile, gender: e.target.value })}
                  >
                    <option value="">Select...</option>
                    <option>Male</option>
                    <option>Female</option>
                    <option>Other</option>
                  </select>
                </div>
                <div className="form-group full-width">
                  <label>Address</label>
                  <textarea
                    rows="2"
                    value={profile.address}
                    disabled={!isEditing}
                    onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ═══════════ My Documents ═══════════ */}
          <div className="profile-card">
           <h3 
  className="card-title" 
  style={{ 
    display: 'flex', 
    alignItems: 'center', 
    gap: '10px' 
  }}
>
  <BasiconsDocumentIcon size={24} color="#15152c" /> 
  My Documents
</h3>
            <div className="card-content">
              <p style={{ fontSize: '13px', color: '#6c757d', marginTop: 0, marginBottom: '20px' }}>
                Upload your documents once, they'll be reused across all your job applications. You can update them anytime.
              </p>

              {documentList.map((doc) => {
                const docState = documents[doc.type];
                const isUploaded = hasFile(docState.url);

                return (
                  <div
                    key={doc.type}
                    className={`doc-item ${doc.type === 'pds' ? 'pds-primary' : ''}`}
                  >
                    <div className="doc-info">
                      <div className="doc-name">
                        {doc.type === 'pds' && ''}
                        {doc.type === 'transcript' && ''}
                        {doc.type === 'performanceRating' && ''}
                        {doc.type === 'eligibility' && '🏅'}
                        {doc.type === 'trainingCert' && '📜'}
                        {doc.label}
                        {doc.required && (
                          <span className="doc-status missing" style={{ marginLeft: 'auto' }}>
                            Required
                          </span>
                        )}
                      </div>
                      <div className="doc-desc">{doc.desc}</div>
                {doc.type === 'pds' && (
  <div className="doc-desc" style={{ marginTop: '4px' }}>
    Refer to the official CSC Form 212:{' '}
    <a 
      href="https://csc.gov.ph/downloads/forms" 
      target="_blank" 
      rel="noopener noreferrer"
      style={{ color: '#4F46E5', fontWeight: 500, textDecoration: 'underline' }}
    >
      csc.gov.ph
    </a>
  </div>
)}
                      {isUploaded && (
                        <div style={{ marginTop: '6px' }}>
                          <span className="doc-status uploaded">✓ Uploaded</span>
                        </div>
                      )}
                    </div>

                    <div className="doc-actions">
                      {isUploaded && doc.type === 'pds' && parsedPDS && (
                        <button
                          className="doc-btn view"
                          onClick={() => setShowPDSViewer(true)}
                        >
                          👁 View
                        </button>
                      )}

                      {isUploaded && (
                        <a
                          href={docState.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="doc-btn view"
                          style={{ textDecoration: 'none' }}
                        >
                          🔗 Open
                        </a>
                      )}

                      <label className="doc-btn upload" style={{ cursor: 'pointer' }}>
                        {docState.uploading ? 'Uploading...' : isUploaded ? 'Replace' : 'Upload'}
                       <input
  type="file"
  accept=".pdf,.xlsx,.docx,.jpg,.jpeg,.png"
  style={{ display: 'none' }}
  disabled={docState.uploading}
  onChange={(e) => {
    const file = e.target.files?.[0];
    if (file) handleUploadDocument(doc.type, file);
    e.target.value = '';
  }}
/>
                      </label>

                      {isUploaded && (
                        <button
                          className="doc-btn delete"
                          onClick={() => handleDeleteDocument(doc.type)}
                        >
                          🗑
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════ PDS Viewer Modal ═══════════ */}
      {showPDSViewer && parsedPDS && (
        <PDSViewerModal
          data={parsedPDS}
          onClose={() => setShowPDSViewer(false)}
        />
      )}

      {/* ═══════════ Success Notification ═══════════ */}
      {profileSuccessMessage && (
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
          <CircularCheckSuccessIcon size={18} style={{ color: 'white' }} />
          <span>{profileSuccessMessage}</span>
        </div>
      )}
    </>
  );
}

// ═══════════════════════════════════════════════════════
// PDS VIEWER MODAL — Shows extracted PDS data
// ═══════════════════════════════════════════════════════
function PDSViewerModal({ data, onClose }) {
  // Handle different possible shapes of parsed PDS data
  const personal = data.personal_info || data.personal || {};
  const education = data.education || [];
  const experience = data.work_experience || data.experience || [];
  const eligibility = data.eligibility || [];
  const training = data.training || [];
  const skills = data.skills || [];

  return (
    <div
      style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
        padding: '20px'
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'white',
          borderRadius: '16px',
          maxWidth: '720px',
          width: '100%',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h3 style={{ margin: 0, fontSize: '18px', color: '#1a3a5c' }}>
            📋 Extracted Personal Data Sheet
          </h3>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: '#6c757d',
              padding: '4px 12px'
            }}
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>

          {/* Personal Info */}
          {Object.keys(personal).length > 0 && (
            <Section title="Personal Information">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                {personal.name && <InfoRow label="Name" value={personal.name} />}
                {personal.address && <InfoRow label="Address" value={personal.address} />}
                {personal.contact && <InfoRow label="Contact" value={personal.contact} />}
                {personal.email && <InfoRow label="Email" value={personal.email} />}
                {personal.birthdate && <InfoRow label="Birthdate" value={personal.birthdate} />}
              </div>
            </Section>
          )}

          {/* Education */}
          {education.length > 0 && (
            <Section title="Education">
              {education.map((edu, i) => (
                <ListItem key={i}>
                  <div style={{ fontWeight: 600, color: '#1a3a5c', marginBottom: '4px' }}>
                    {edu.degree || edu.level || 'Degree'}
                  </div>
                  <div style={{ fontSize: '13px', color: '#4a5568' }}>
                    {edu.school || edu.institution || 'School'}
                    {edu.year && <span> • {edu.year}</span>}
                    {edu.honors && <span> • {edu.honors}</span>}
                  </div>
                </ListItem>
              ))}
            </Section>
          )}

          {/* Work Experience */}
          {experience.length > 0 && (
            <Section title="Work Experience">
              {experience.map((exp, i) => (
                <ListItem key={i}>
                  <div style={{ fontWeight: 600, color: '#1a3a5c', marginBottom: '4px' }}>
                    {exp.position || exp.title || 'Position'}
                  </div>
                  <div style={{ fontSize: '13px', color: '#4a5568' }}>
                    {exp.company || exp.employer || 'Company'}
                    {(exp.start_date || exp.end_date) && (
                      <span> • {exp.start_date || '?'} – {exp.end_date || 'Present'}</span>
                    )}
                  </div>
                </ListItem>
              ))}
            </Section>
          )}

          {/* Eligibility */}
          {eligibility.length > 0 && (
            <Section title="Eligibility">
              {eligibility.map((el, i) => (
                <ListItem key={i}>
                  <div style={{ fontSize: '13px', color: '#4a5568' }}>
                    {typeof el === 'string' ? el : (el.name || el.title || 'Eligibility')}
                  </div>
                </ListItem>
              ))}
            </Section>
          )}

          {/* Training */}
          {training.length > 0 && (
            <Section title="Training">
              {training.map((tr, i) => (
                <ListItem key={i}>
                  <div style={{ fontWeight: 600, color: '#1a3a5c', marginBottom: '4px' }}>
                    {tr.title || tr.name || 'Training'}
                  </div>
                  <div style={{ fontSize: '13px', color: '#4a5568' }}>
                    {tr.hours && <span>{tr.hours} hours</span>}
                    {tr.date && <span> • {tr.date}</span>}
                  </div>
                </ListItem>
              ))}
            </Section>
          )}

          {/* Skills */}
          {skills.length > 0 && (
            <Section title="Skills">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {skills.map((skill, i) => (
                  <span key={i} style={{
                    background: '#eef2ff',
                    color: '#4f46e5',
                    padding: '4px 10px',
                    borderRadius: '12px',
                    fontSize: '12px',
                    fontWeight: 500
                  }}>
                    {typeof skill === 'string' ? skill : (skill.name || 'Skill')}
                  </span>
                ))}
              </div>
            </Section>
          )}

          {/* Fallback if no recognizable data */}
          {Object.keys(personal).length === 0 && education.length === 0 &&
           experience.length === 0 && eligibility.length === 0 && training.length === 0 && (
            <div style={{ padding: '40px', textAlign: 'center', color: '#6c757d' }}>
              <p>⚠️ No structured data available yet.</p>
              <p style={{ fontSize: '13px' }}>The extracted data will appear here after processing.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid #e5e7eb',
          display: 'flex',
          justifyContent: 'flex-end'
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '10px 24px',
              background: '#D3F0F9',
              color: '#1a3a5c',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: '500',
              transition: 'background 0.2s ease'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#b8e4f0'}
            onMouseLeave={(e) => e.currentTarget.style.background = '#D3F0F9'}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Small components for PDS viewer ─────────────────
function Section({ title, children }) {
  return (
    <div style={{ marginBottom: '20px' }}>
      <h4 style={{
        margin: '0 0 10px 0',
        fontSize: '13px',
        fontWeight: 700,
        color: '#4f46e5',
        textTransform: 'uppercase',
        letterSpacing: '0.5px'
      }}>
        {title}
      </h4>
      {children}
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div>
      <div style={{ fontSize: '11px', color: '#6c757d', marginBottom: '2px', fontWeight: 500 }}>
        {label}
      </div>
      <div style={{ fontSize: '13px', color: '#1a3a5c' }}>{value}</div>
    </div>
  );
}

function ListItem({ children }) {
  return (
    <div style={{
      padding: '10px 12px',
      background: '#f8f9fc',
      borderRadius: '8px',
      marginBottom: '8px'
    }}>
      {children}
    </div>
  );
}

export default ApplicantProfilePage;
import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import { supabase } from "../lib/supabase";
import Loader from "../components/Loader";
import { logActivity } from "../lib/logActivity";
import { BasiconsHrIcon, BasiconsApplicantIcon,
    BasiconsKeyIcon, BasiconsPencilIcon,
    BasiconsCopyIcon, NewspaperIcon,
    CheckInterviewIconDashboard, CheckMarkSquareInterviewIcon,
    CheckIcon, CheckboxMassIcon } from "../components/icons/CustomIcons";

export default function ManageUsersPage() {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('hr'); // 'hr' | 'applicant'

  const [resetSuccess, setResetSuccess] = useState(null); //

  // Create state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [creating, setCreating] = useState(false);

  // Edit state
  const [editingUser, setEditingUser] = useState(null);
  const [editName, setEditName] = useState('');
  const [saving, setSaving] = useState(false);

  // Password state
  const [passwordUser, setPasswordUser] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [updatingPassword, setUpdatingPassword] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    setError('');
    try {
      // use the same RPC but return ALL users, then filter client-side
      const { data, error } = await supabase.rpc('list_all_users');
      if (error) {
        // fallback: try old RPC for HR only
        const { data: hrData, error: hrError } = await supabase.rpc('list_hr_users');
        if (hrError) {
          setError(`Failed to load accounts: ${error.message}`);
          setUsers([]);
        } else {
          setUsers(hrData || []);
        }
      } else {
        setUsers(data || []);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const hrUsers = users.filter(u => u.role === 'hr');
  const applicantUsers = users.filter(u => u.role === 'applicant');
  const visibleUsers = activeTab === 'hr' ? hrUsers : applicantUsers;

  // ============ CREATE ============
  const handleCreateHR = async (e) => {
    e.preventDefault();

    if (!createForm.fullName || !createForm.email || !createForm.password) {
      alert('Please fill in all required fields');
      return;
    }

    if (createForm.password !== createForm.confirmPassword) {
      alert('Passwords do not match');
      return;
    }

    if (createForm.password.length < 6) {
      alert('Password must be at least 6 characters');
      return;
    }

    setCreating(true);

    try {
      const { data: { session: adminSession } } = await supabase.auth.getSession();

      const { data, error } = await supabase.auth.signUp({
        email: createForm.email,
        password: createForm.password,
        options: {
          data: {
            full_name: createForm.fullName,
            role: 'hr',
            email_verified: true,
          }
        }
      });

      if (error) throw error;

      if (adminSession) {
        await supabase.auth.setSession({
          access_token: adminSession.access_token,
          refresh_token: adminSession.refresh_token,
        });
      }

      // log activity
      await logActivity(
        'user_registered',
        `Created HR account: ${createForm.fullName} (${createForm.email})`,
        {
          user: adminSession?.user,
          metadata: {
            new_user_id: data.user?.id,
            new_user_email: createForm.email,
            new_user_role: 'hr',
          },
        }
      );

      setShowCreateModal(false);
      setCreateForm({
        fullName: '',
        email: '',
        password: '',
        confirmPassword: '',
      });

      alert(`HR account created for ${createForm.email}`);
      loadUsers();

    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setCreating(false);
    }
  };

  // ============ EDIT ============
  const handleEditClick = (user) => {
    setEditingUser(user);
    setEditName(user.full_name || '');
  };

  const handleSaveEdit = async () => {
    if (!editingUser) return;
    setSaving(true);

    const oldName = editingUser.full_name || '(no name)';

    try {
      const { data, error } = await supabase.rpc('update_hr_user_name', {
        target_user_id: editingUser.id,
        new_name: editName,
      });

      if (error || data?.error) {
        alert('Error: ' + (error?.message || data?.error));
        setSaving(false);
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      const isSelf = user && user.id === editingUser.id;

      // ✅ log the rename
      if (oldName !== editName) {
        await logActivity(
          'user_updated',
          `Renamed user ${oldName} → ${editName} (${editingUser.email})`,
          { user }
        );
      }

      setEditingUser(null);
      setSaving(false);

      if (isSelf) {
        await supabase.auth.updateUser({
          data: { full_name: editName }
        });
        window.location.reload();
      } else {
        loadUsers();
      }

    } catch (err) {
      alert('Error: ' + err.message);
      setSaving(false);
    }
  };

  // ============ SET PASSWORD ============
  const handleSetPassword = async () => {
    if (!passwordUser || !newPassword || newPassword.length < 6) {
      alert('Password must be at least 6 characters');
      return;
    }

    setUpdatingPassword(true);

    try {
      const { data, error } = await supabase.functions.invoke('set-user-password', {
        body: {
          userId: passwordUser.id,
          newPassword: newPassword,
        },
      });

           if (error || data?.error) {
        alert('Error: ' + (error?.message || data?.error));
      } else {
        // ✅ log the password reset
        await logActivity(
          'password_reset',
          `Reset password for ${passwordUser.full_name || passwordUser.email} (${passwordUser.email})`,
          { metadata: { target_user_id: passwordUser.id } }
        );

        // ✅ show styled success modal instead of alert()
        setResetSuccess({
          name: passwordUser.full_name || passwordUser.email,
          email: passwordUser.email,
          password: newPassword,
        });
        setPasswordUser(null);
        setNewPassword('');
      }
      
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setUpdatingPassword(false);
    }
  };

  // Tab button styling helper
  const tabStyle = (tab) => ({
    padding: '10px 18px',
    background: activeTab === tab ? '#4F46E5' : 'white',
    color: activeTab === tab ? 'white' : '#4a5568',
    border: activeTab === tab ? 'none' : '1px solid #e2e8f0',
    borderRadius: '8px',
    fontWeight: 600,
    fontSize: '13px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  });

  return (
    <>
      <Navbar userRole="superadmin" />
      <div style={{ padding: '100px 30px', maxWidth: '1200px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 style={{ fontSize: '28px', color: '#1a1f36', margin: 0, marginBottom: '6px' }}>
              Manage Users
            </h1>
            <p style={{ color: '#6c757d', margin: 0, fontSize: '14px' }}>
              Create HR accounts, edit names, or reset passwords
            </p>
          </div>
          {activeTab === 'hr' && (
            <button
              onClick={() => setShowCreateModal(true)}
              style={{
                padding: '10px 20px',
                background: '#4F46E5',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 600,
                fontSize: '14px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#4338ca'}
              onMouseLeave={(e) => e.currentTarget.style.background = '#4F46E5'}
            >
              <span style={{ fontSize: '18px', lineHeight: 1 }}>+</span>
              Create HR Account
            </button>
          )}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
          <button onClick={() => setActiveTab('hr')} style={tabStyle('hr')}>
            HR Staff ({hrUsers.length})
          </button>
          <button onClick={() => setActiveTab('applicant')} style={tabStyle('applicant')}>
            Applicants ({applicantUsers.length})
          </button>
        </div>

        {error && (
          <div style={{ padding: '14px 18px', background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', borderRadius: '8px', marginBottom: '20px', fontSize: '13px' }}>
            {error}
          </div>
        )}

        {/* Users Table */}
        <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)', borderBottom: '1px solid #bfdbfe', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
  width: '32px',
  height: '32px',
  borderRadius: '8px',
  background: 'white',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}}>
  {activeTab === 'hr'
    ? <BasiconsHrIcon size={18} color="#4F46E5" />
    : <BasiconsApplicantIcon size={18} color="#06b6d4" />}
</div>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#1a3a5c', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                  {activeTab === 'hr' ? 'HR Staff Accounts' : 'Applicant Accounts'}
                </div>
                <div style={{ fontSize: '12px', color: '#64748b' }}>
                  {visibleUsers.length} {visibleUsers.length === 1 ? 'account' : 'accounts'}
                </div>
              </div>
            </div>
            <button onClick={loadUsers} disabled={loading} style={{ padding: '6px 14px', background: 'white', border: '1px solid #c7d2fe', color: '#4F46E5', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.5 : 1 }}>
              ↻ Refresh
            </button>
          </div>

         {loading ? (
  <div style={{
    padding: '60px 20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    color: '#4F46E5',
    fontSize: '14px',
    fontWeight: 500,
  }}>
    <div style={{
      width: '20px',
      height: '20px',
      border: '2px solid #e0e7ff',
      borderTop: '2px solid #4F46E5',
      borderRadius: '50%',
      animation: 'spin 0.8s linear infinite',
    }} />
    Loading accounts...
  </div>
) : visibleUsers.length === 0 ? (
            <div style={{ padding: '60px 20px', textAlign: 'center' }}>
              <h3 style={{ fontSize: '16px', color: '#1a3a5c', margin: '0 0 6px' }}>
                {activeTab === 'hr' ? 'No HR accounts yet' : 'No applicants yet'}
              </h3>
              <p style={{ fontSize: '13px', color: '#6c757d', margin: 0 }}>
                {activeTab === 'hr'
                  ? 'Create your first HR staff account to get started'
                  : 'Applicants will appear here as they sign up'}
              </p>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <th style={{ textAlign: 'left', padding: '12px 20px', fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Name</th>
                  <th style={{ textAlign: 'left', padding: '12px 20px', fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Email</th>
                  <th style={{ textAlign: 'left', padding: '12px 20px', fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Created</th>
                  <th style={{ textAlign: 'right', padding: '12px 20px', fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {visibleUsers.map((user) => (
                  <tr key={user.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '14px 20px', fontSize: '13px', color: '#1a3a5c', fontWeight: 500 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: activeTab === 'hr' ? 'linear-gradient(135deg, #4F46E5 0%, #6366f1 100%)' : 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '12px' }}>
                          {(user.full_name || user.email || '?').charAt(0).toUpperCase()}
                        </div>
                        {user.full_name || '—'}
                      </div>
                    </td>
                    <td style={{ padding: '14px 20px', fontSize: '13px', color: '#4a5568' }}>{user.email}</td>
                    <td style={{ padding: '14px 20px', fontSize: '13px', color: '#6c757d' }}>
                      {user.created_at ? new Date(user.created_at).toLocaleDateString() : '—'}
                    </td>
                    <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                        {activeTab === 'hr' && (
                          <button
                            onClick={() => handleEditClick(user)}
                            style={{ padding: '6px 12px', background: '#eef2ff', color: '#4F46E5', border: '1px solid #c7d2fe', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer',display: 'inline-flex',
    alignItems: 'center',
    gap: '5px', }}
                            onMouseEnter={(e) => e.currentTarget.style.background = '#e0e7ff'}
                            onMouseLeave={(e) => e.currentTarget.style.background = '#eef2ff'}
                          >
                            <BasiconsPencilIcon size={14} color="#4F46E5" /> Edit
                          </button>
                        )}
                        <button
                          onClick={() => { setPasswordUser(user); setNewPassword(''); }}
                          style={{ padding: '6px 12px', background: '#fffbeb', color: '#92400e', border: '1px solid #fde68a', borderRadius: '6px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', display: 'inline-flex',
    alignItems: 'center',
    gap: '6px', }}
                          onMouseEnter={(e) => e.currentTarget.style.background = '#fef3c7'}
                          onMouseLeave={(e) => e.currentTarget.style.background = '#fffbeb'}
                        >
                          <BasiconsKeyIcon size={14} color="#92400e" /> Set Password
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* ==================== CREATE MODAL ==================== */}
        {showCreateModal && (
          <div
            onClick={() => !creating && setShowCreateModal(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px' }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{ background: 'white', borderRadius: '12px', padding: '24px', maxWidth: '480px', width: '100%' }}
            >
              <h3 style={{ margin: '0 0 8px', fontSize: '18px', color: '#1a3a5c' }}>Create HR Account</h3>
              <p style={{ margin: '0 0 20px', fontSize: '13px', color: '#6c757d' }}>Provision a new HR Staff account</p>

              <form onSubmit={handleCreateHR} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#4a5568', marginBottom: '6px' }}>Full Name *</label>
                  <input
                    type="text"
                    required
                    value={createForm.fullName}
                    onChange={(e) => setCreateForm({ ...createForm, fullName: e.target.value })}
                    disabled={creating}
                    placeholder="Juan Dela Cruz"
                    style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#4a5568', marginBottom: '6px' }}>Email *</label>
                  <input
                    type="email"
                    required
                    value={createForm.email}
                    onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                    disabled={creating}
                    placeholder="hr@chrmo.gov.ph"
                    style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#4a5568', marginBottom: '6px' }}>Password *</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={createForm.password}
                    onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                    disabled={creating}
                    placeholder="Min 6 characters"
                    style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#4a5568', marginBottom: '6px' }}>Confirm Password *</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={createForm.confirmPassword}
                    onChange={(e) => setCreateForm({ ...createForm, confirmPassword: e.target.value })}
                    disabled={creating}
                    style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px' }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    disabled={creating}
                    style={{ padding: '10px 20px', background: '#f3f4f6', color: '#4a5568', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: creating ? 'not-allowed' : 'pointer' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creating}
                    style={{ padding: '10px 20px', background: creating ? '#4338ca' : '#4F46E5', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: creating ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                  >
                    {creating ? 'Creating...' : 'Create HR Account'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ==================== EDIT MODAL ==================== */}
        {editingUser && (
          <div
            onClick={() => setEditingUser(null)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px' }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{ background: 'white', borderRadius: '12px', padding: '24px', maxWidth: '420px', width: '100%' }}
            >
              <h3 style={{ margin: '0 0 16px', fontSize: '18px', color: '#1a3a5c' }}>Edit HR Account</h3>
              <p style={{ margin: '0 0 16px', fontSize: '13px', color: '#6c757d' }}>{editingUser.email}</p>

              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#4a5568', marginBottom: '6px' }}>Full Name</label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px', marginBottom: '20px' }}
              />

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setEditingUser(null)}
                  disabled={saving}
                  style={{ padding: '10px 20px', background: '#f3f4f6', color: '#4a5568', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  disabled={saving}
                  style={{ padding: '10px 20px', background: saving ? '#4338ca' : '#4F46E5', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer' }}
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ==================== SET PASSWORD MODAL ==================== */}
        {passwordUser && (
          <div
            onClick={() => setPasswordUser(null)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px' }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{ background: 'white', borderRadius: '12px', padding: '24px', maxWidth: '440px', width: '100%' }}
            >
              <h3 style={{ margin: '0 0 8px', fontSize: '18px', color: '#1a3a5c', display: 'flex',
                alignItems: 'center',
                gap: '8px', }}>  <BasiconsKeyIcon size={28} color="#cf5e18" /> Set New Password</h3>
              <p style={{ margin: '0 0 20px', fontSize: '13px', color: '#6c757d' }}>
                For: <strong>{passwordUser.full_name || passwordUser.email}</strong><br />
                <span style={{ fontSize: '12px' }}>{passwordUser.email}</span>
              </p>

              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#4a5568', marginBottom: '6px' }}>New Password (min 6 characters)</label>
              <input
                type="text"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Type a temporary password"
                style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px', marginBottom: '16px', fontFamily: 'monospace' }}
              />

              <div style={{ padding: '10px 12px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '6px', fontSize: '12px', color: '#92400e', marginBottom: '20px' }}>
                 Copy this password and share it with the user privately.
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setPasswordUser(null)}
                  disabled={updatingPassword}
                  style={{ padding: '10px 20px', background: '#f3f4f6', color: '#4a5568', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: updatingPassword ? 'not-allowed' : 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSetPassword}
                  disabled={updatingPassword || newPassword.length < 6}
                  style={{ padding: '10px 20px', background: updatingPassword ? '#92400e' : '#d97706', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: updatingPassword || newPassword.length < 6 ? 'not-allowed' : 'pointer', opacity: newPassword.length < 6 ? 0.5 : 1 }}
                >
                  {updatingPassword ? 'Updating...' : 'Set Password'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ==================== PASSWORD RESET SUCCESS MODAL ==================== */}
{resetSuccess && (
  <div
    onClick={() => setResetSuccess(null)}
    style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 10000, padding: '20px',
    }}
  >
    <div
      onClick={(e) => e.stopPropagation()}
      style={{
        background: 'white', borderRadius: '12px', padding: '28px',
        maxWidth: '440px', width: '100%',
        boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
      }}
    >
      {/* Success icon */}
      <div style={{
        width: 56, height: 56, borderRadius: '50%',
        background: '#dcfce7', color: '#16a34a',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        margin: '0 auto 16px',
        fontSize: 28, fontWeight: 700,
      }}>
        <CheckIcon size={28} color="white" />
      </div>

      <h3 style={{
        margin: '0 0 8px', fontSize: '18px', color: '#1a3a5c',
        textAlign: 'center', fontWeight: 700,
      }}>
        Password Reset Successfully
      </h3>
      <p style={{
        margin: '0 0 24px', fontSize: '13px', color: '#6c757d',
        textAlign: 'center', lineHeight: 1.5,
      }}>
        For <strong style={{ color: '#1a3a5c' }}>{resetSuccess.name}</strong>
        <br />
        <span style={{ fontSize: '12px' }}>{resetSuccess.email}</span>
      </p>

      {/* Password display box */}
      <div style={{
        background: '#f8fafc',
        border: '1px solid #e2e8f0',
        borderRadius: '8px',
        padding: '14px 16px',
        marginBottom: '12px',
      }}>
        <div style={{
          fontSize: '11px', fontWeight: 700, color: '#64748b',
          textTransform: 'uppercase', letterSpacing: '0.5px',
          marginBottom: '8px',
        }}>
          New Password
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '10px',
        }}>
          <code style={{
            flex: 1,
            fontSize: '16px',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
            fontWeight: 600,
            color: '#1a3a5c',
            background: 'white',
            padding: '10px 12px',
            borderRadius: '6px',
            border: '1px solid #e2e8f0',
            wordBreak: 'break-all',
            userSelect: 'all',
          }}>
            {resetSuccess.password}
          </code>
          <button
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(resetSuccess.password);
                // temporary feedback — swap label
                const btn = document.getElementById('copy-pass-btn');
                if (btn) {
                  const original = btn.innerHTML;
                  btn.innerHTML = '✓ Copied';
                  btn.style.background = '#dcfce7';
                  btn.style.color = '#16a34a';
                  btn.style.borderColor = '#bbf7d0';
                  setTimeout(() => {
                    btn.innerHTML = original;
                    btn.style.background = '#4F46E5';
                    btn.style.color = 'white';
                    btn.style.borderColor = '#4F46E5';
                  }, 1500);
                }
              } catch {
                alert('Copy failed — select the password manually.');
              }
            }}
            id="copy-pass-btn"
            style={{
              padding: '10px 14px',
              background: '#4F46E5',
              color: 'white',
              border: '1px solid #4F46E5',
              borderRadius: '6px',
              fontWeight: 600,
              fontSize: '12px',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 0.2s ease',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <BasiconsCopyIcon size={14} color="white" /> Copy
          </button>
        </div>
      </div>

      {/* Warning */}
      <div style={{
        padding: '10px 12px',
        background: '#fffbeb',
        border: '1px solid #fde68a',
        borderRadius: '6px',
        fontSize: '12px',
        color: '#92400e',
        marginBottom: '20px',
        lineHeight: 1.5,
      }}>
         This password will not be displayed again. Please copy it and deliver it to the user privately.
      </div>

      {/* Done button */}
      <button
        onClick={() => setResetSuccess(null)}
        style={{
          width: '100%',
          padding: '12px',
          background: '#4F46E5',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          fontWeight: 600,
          fontSize: '14px',
          cursor: 'pointer',
          transition: 'background 0.2s ease',
        }}
        onMouseEnter={(e) => e.currentTarget.style.background = '#4338ca'}
        onMouseLeave={(e) => e.currentTarget.style.background = '#4F46E5'}
      >
        Done
      </button>
    </div>
  </div>
)}

      </div>
    </>
  );
}
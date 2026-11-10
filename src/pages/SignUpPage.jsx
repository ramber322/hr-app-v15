import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { logActivity } from '../lib/logActivity';
import lguLogo from '../assets/lgu-official-seal.png';
import chrmoLogo from '../assets/chrmo-official-seal.png';
import '../styles/SignUpPage.css';

function SignUpPage() {
  const navigate = useNavigate();

  const [firstName, setFirstName] = useState('');
  const [surname, setSurname] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!firstName.trim() || !surname.trim() || !email.trim() || !password) {
      setError('Please fill in all required fields');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            first_name: firstName.trim(),
            surname: surname.trim(),
            full_name: `${firstName.trim()} ${surname.trim()}`,
            phone_number: phoneNumber.trim(),
            role: 'applicant'
          }
        }
      });

      if (error) {
        setError(error.message);
        setIsLoading(false);
        return;
      }

      if (data.user) {
        const { error: applicantError } = await supabase
          .from('applicants')
          .insert({
            id: data.user.id,
            full_name: `${firstName.trim()} ${surname.trim()}`,
            email: email.trim(),
            phone: phoneNumber.trim()
          });

        if (applicantError) {
          console.error('Applicant creation failed:', applicantError);
          setError(applicantError.message);
          setIsLoading(false);
          return;
        }

        await logActivity(
          'user_registered',
          `New applicant registered: ${firstName.trim()} ${surname.trim()}`,
          { user: data.user }
        );

        alert('Account created successfully! Please login.');
        navigate('/login');
      }
    } catch (err) {
      setError('An unexpected error occurred');
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">

                <div className="auth-brand">
          <div className="auth-logos">
            <img src={chrmoLogo} alt="CHRMO" />
          </div>
          <div className="auth-brand-text">
            <span>CHRMO ILIGAN</span>
            <small>Human Resource Management Portal</small>
          </div>
        </div>

        <div className="auth-heading">
          <h1>Create Account</h1>
          <p>Join the portal to browse and apply for positions.</p>
        </div>

        {error && (
          <div className="auth-error">
            <span className="auth-error-icon">!</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="auth-form">

          <div className="auth-row">
            <div className="auth-field">
              <label htmlFor="firstName">First Name</label>
              <input
                id="firstName"
                type="text"
                placeholder="John"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                disabled={isLoading}
                autoComplete="given-name"
              />
            </div>
            <div className="auth-field">
              <label htmlFor="surname">Surname</label>
              <input
                id="surname"
                type="text"
                placeholder="Doe"
                value={surname}
                onChange={(e) => setSurname(e.target.value)}
                disabled={isLoading}
                autoComplete="family-name"
              />
            </div>
          </div>

          <div className="auth-row">
            <div className="auth-field">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                autoComplete="email"
              />
            </div>
            <div className="auth-field">
              <label htmlFor="phoneNumber">Phone</label>
              <div className="auth-phone">
                <input
                  id="phoneNumber"
                  type="tel"
                  placeholder="0912 345 6789"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  disabled={isLoading}
                  autoComplete="tel"
                />
                <span className="auth-phone-prefix">PH</span>
              </div>
            </div>
          </div>

          <div className="auth-row">
            <div className="auth-field">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                placeholder="Min 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                autoComplete="new-password"
              />
            </div>
            <div className="auth-field">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <input
                id="confirmPassword"
                type="password"
                placeholder="Re-enter password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={isLoading}
                autoComplete="new-password"
              />
            </div>
          </div>

          <button type="submit" className="auth-submit" disabled={isLoading}>
            {isLoading ? (
              <>
                <span className="auth-spinner" />
                Creating account...
              </>
            ) : (
              <>
                Create Account
              </>
            )}
          </button>
        </form>

        <div className="auth-footer">
          Already have an account? <Link to="/login">Login here</Link>
        </div>

        <div className="auth-note">
          <span className="auth-note-dot" />
          Secure applicant registration
        </div>

      </div>
    </div>
  );
}

export default SignUpPage;
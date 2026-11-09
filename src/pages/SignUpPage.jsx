// src/pages/SignUpPage.jsx
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { logActivity } from '../lib/logActivity';
import '/src/styles/SignUpPage.css';

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
    
    if (!firstName || !surname || !email || !password) {
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
        email,
        password,
        options: {
          data: {
            first_name: firstName,
            surname: surname,
            full_name: `${firstName} ${surname}`,
            phone_number: phoneNumber,
            role: 'applicant'   // ✅ locked — always applicant
          }
        }
      });

      if (error) {
        setError(error.message);
        setIsLoading(false);
        return;
      }

      if (data.user) {
        console.log('Sign up successful:', data.user);

        const { error: applicantError } = await supabase
          .from('applicants')
          .insert({
            id: data.user.id,
            full_name: `${firstName} ${surname}`,
            email: email,
            phone: phoneNumber
          });

        if (applicantError) {
          console.error('Applicant creation failed:', applicantError);
          setError(applicantError.message);
          setIsLoading(false);
          return;
        }

        // ✅ log the registration
        await logActivity(
          'user_registered',
          `New applicant registered: ${firstName} ${surname}`,
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
    <div className="signup-page">  
      <div className="signup-wrapper">
        {/* Background Shapes */}
        <div className="shapes">
          <div className="shape shape-1"></div>
          <div className="shape shape-2"></div>
          <div className="shape shape-3"></div>
          <div className="shape shape-4"></div>
          <div className="shape shape-5"></div>
        </div>

        <div className="signup-container">
          <div className="signup-card">
            <div className="signup-header">
              <h2>Create Account</h2>
              <p>Join CHRMO Iligan's HR Management Portal</p>
            </div>

            {error && <div className="error-message">{error}</div>}

            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="input-group half">
                  <label>First Name </label>
                  <input
                    type="text"
                    placeholder="John"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    disabled={isLoading}
                  />
                </div>

                <div className="input-group half">
                  <label>Surname </label>
                  <input
                    type="text"
                    placeholder="Doe"
                    value={surname}
                    onChange={(e) => setSurname(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div className="form-row contact-row">
                <div className="input-group half">
                  <label>Email Address</label>
                  <input
                    type="email"
                    placeholder="johan@gmail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoading}
                  />
                </div>

                <div className="input-group half">
                  <label>Phone Number</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="tel"
                      placeholder="0912 345 6789"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      disabled={isLoading}
                      style={{ paddingRight: '45px' }}
                    />
                    <span style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      pointerEvents: 'none',
                      fontSize: '12px',
                      fontWeight: '600',
                      color: '#6c757d',
                      letterSpacing: '0.5px'
                    }}>
                      PH
                    </span>
                  </div>
                </div>
              </div>

              <div className="form-row password-row">
                <div className="input-group half">
                  <label>Password </label>
                  <input
                    type="password"
                    placeholder="Min 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                  />
                </div>

                <div className="input-group half">
                  <label>Confirm Password </label>
                  <input
                    type="password"
                    placeholder="Confirm password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
              </div>

              <button type="submit" className="signup-button" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <span className="spinner"></span>
                    Creating account...
                  </>
                ) : (
                  'Create Account'
                )}
              </button>
            </form>

            <div className="signup-footer">
              <p>
                Already have an account? <Link to="/login">Login here</Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SignUpPage;
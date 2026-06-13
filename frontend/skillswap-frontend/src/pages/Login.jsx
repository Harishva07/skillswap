/**
 * SkillSwap - Login Page
 */

import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/common/Toast';
import { ButtonSpinner } from '../components/common/LoadingSpinner';

export const Login = () => {
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  
  const { login } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  
  const from = location.state?.from?.pathname || '/dashboard';

  const validate = () => {
    const errs = {};
    if (!form.email) errs.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(form.email)) errs.email = 'Invalid email format';
    if (!form.password) errs.password = 'Password is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      await login(form.email, form.password);
      toast('Welcome back! 🎉', 'success');
      navigate(from, { replace: true });
    } catch (err) {
      const msg = err.response?.data?.message || 'Login failed. Please try again.';
      toast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-layout">
      <div className="auth-card">
        {/* Logo */}
        <div className="auth-logo">
          <div className="auth-logo-icon">🔄</div>
          <h1 className="auth-title">Welcome back</h1>
          <p className="auth-subtitle">Sign in to your SkillSwap account</p>
        </div>

        {/* Demo Credentials */}
        <div style={{
          background: 'var(--primary-50)', border: '1px solid var(--primary-200)',
          borderRadius: 'var(--radius)', padding: '12px 14px', marginBottom: 20, fontSize: 12
        }}>
          <div style={{ fontWeight: 700, color: 'var(--primary-dark)', marginBottom: 6 }}>🧪 Demo Credentials</div>
          <div style={{ color: 'var(--text-secondary)' }}>
            <div><strong>User:</strong> alice@example.com / Test@123</div>
            <div><strong>Admin:</strong> admin@skillswap.com / Admin@123</div>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Email */}
          <div className="form-group">
            <label className="form-label" htmlFor="email">Email Address <span className="required">*</span></label>
            <div className="input-group">
              <span className="input-icon">✉️</span>
              <input
                id="email"
                type="email"
                className={`form-input ${errors.email ? 'border-danger' : ''}`}
                placeholder="you@example.com"
                value={form.email}
                onChange={(e) => { setForm({ ...form, email: e.target.value }); setErrors({ ...errors, email: '' }); }}
                style={errors.email ? { borderColor: 'var(--danger)' } : {}}
              />
            </div>
            {errors.email && <span className="form-error">⚠ {errors.email}</span>}
          </div>

          {/* Password */}
          <div className="form-group">
            <label className="form-label" htmlFor="password">Password <span className="required">*</span></label>
            <div className="input-group">
              <span className="input-icon">🔒</span>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                className="form-input"
                placeholder="••••••••"
                value={form.password}
                onChange={(e) => { setForm({ ...form, password: e.target.value }); setErrors({ ...errors, password: '' }); }}
                style={errors.password ? { borderColor: 'var(--danger)' } : {}}
              />
              <span className="input-icon-right" onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? '🙈' : '👁️'}
              </span>
            </div>
            {errors.password && <span className="form-error">⚠ {errors.password}</span>}
          </div>

          <button id="login-btn" type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading}>
            {loading ? <><ButtonSpinner /> Signing in...</> : '🚀 Sign In'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 20, fontSize: 14, color: 'var(--text-muted)' }}>
          Don't have an account?{' '}
          <Link to="/register" style={{ color: 'var(--primary)', fontWeight: 600 }}>Create one free →</Link>
        </div>
      </div>
    </div>
  );
};

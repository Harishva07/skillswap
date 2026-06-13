/**
 * SkillSwap - Register Page
 */

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/common/Toast';
import { ButtonSpinner } from '../components/common/LoadingSpinner';

export const Register = () => {
  const [form, setForm] = useState({
    name: '', email: '', password: '', confirmPassword: '',
    location: '', bio: '', experience_level: 'beginner'
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [step, setStep] = useState(1);

  const { register } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const update = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const validateStep1 = () => {
    const errs = {};
    if (!form.name.trim() || form.name.length < 2) errs.name = 'Name must be at least 2 characters';
    if (!form.email || !/\S+@\S+\.\S+/.test(form.email)) errs.email = 'Valid email is required';
    if (!form.password || form.password.length < 6) errs.password = 'Password must be at least 6 characters';
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(form.password)) errs.password = 'Must contain uppercase, lowercase and number';
    if (form.password !== form.confirmPassword) errs.confirmPassword = 'Passwords do not match';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleNext = (e) => {
    e.preventDefault();
    if (validateStep1()) setStep(2);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { confirmPassword, ...submitData } = form;
      await register(submitData);
      toast('Account created! Welcome to SkillSwap! 🎉', 'success');
      navigate('/dashboard');
    } catch (err) {
      const msg = err.response?.data?.message || 'Registration failed.';
      toast(msg, 'error');
      setStep(1);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-layout">
      <div className="auth-card" style={{ maxWidth: 480 }}>
        <div className="auth-logo">
          <div className="auth-logo-icon">🔄</div>
          <h1 className="auth-title">Join SkillSwap</h1>
          <p className="auth-subtitle">Create your free account in 2 steps</p>
        </div>

        {/* Step indicator */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 28, alignItems: 'center' }}>
          {[1, 2].map(s => (
            <div key={s} style={{
              flex: 1, height: 4, borderRadius: 99,
              background: s <= step ? 'linear-gradient(90deg, var(--primary), var(--accent))' : 'var(--border)',
              transition: 'background 0.3s'
            }} />
          ))}
        </div>

        {step === 1 ? (
          <form onSubmit={handleNext}>
            <div style={{ display: 'flex', gap: 12 }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Full Name <span className="required">*</span></label>
                <input id="name" className="form-input" placeholder="John Doe" value={form.name} onChange={e => update('name', e.target.value)} style={errors.name ? { borderColor: 'var(--danger)' } : {}} />
                {errors.name && <span className="form-error">⚠ {errors.name}</span>}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Email Address <span className="required">*</span></label>
              <div className="input-group">
                <span className="input-icon">✉️</span>
                <input id="email" type="email" className="form-input" placeholder="you@example.com" value={form.email} onChange={e => update('email', e.target.value)} style={errors.email ? { borderColor: 'var(--danger)' } : {}} />
              </div>
              {errors.email && <span className="form-error">⚠ {errors.email}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">Password <span className="required">*</span></label>
              <div className="input-group">
                <span className="input-icon">🔒</span>
                <input id="password" type={showPassword ? 'text' : 'password'} className="form-input" placeholder="Min. 6 chars, uppercase, number" value={form.password} onChange={e => update('password', e.target.value)} style={errors.password ? { borderColor: 'var(--danger)' } : {}} />
                <span className="input-icon-right" onClick={() => setShowPassword(!showPassword)}>{showPassword ? '🙈' : '👁️'}</span>
              </div>
              {errors.password && <span className="form-error">⚠ {errors.password}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">Confirm Password <span className="required">*</span></label>
              <div className="input-group">
                <span className="input-icon">🔒</span>
                <input type="password" className="form-input" placeholder="Repeat your password" value={form.confirmPassword} onChange={e => update('confirmPassword', e.target.value)} style={errors.confirmPassword ? { borderColor: 'var(--danger)' } : {}} />
              </div>
              {errors.confirmPassword && <span className="form-error">⚠ {errors.confirmPassword}</span>}
            </div>

            <button id="next-btn" type="submit" className="btn btn-primary btn-full">Next: Profile Info →</button>
          </form>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Location</label>
              <div className="input-group">
                <span className="input-icon">📍</span>
                <input className="form-input" placeholder="City, Country" value={form.location} onChange={e => update('location', e.target.value)} />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Experience Level</label>
              <select className="form-select" value={form.experience_level} onChange={e => update('experience_level', e.target.value)}>
                <option value="beginner">🌱 Beginner</option>
                <option value="intermediate">🌿 Intermediate</option>
                <option value="expert">🌳 Expert</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Bio (optional)</label>
              <textarea className="form-textarea" placeholder="Tell others about yourself, what you love learning..." value={form.bio} onChange={e => update('bio', e.target.value)} rows={3} style={{ minHeight: 80 }} />
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button type="button" className="btn btn-secondary" onClick={() => setStep(1)} style={{ flex: 1 }}>← Back</button>
              <button id="register-btn" type="submit" className="btn btn-primary" disabled={loading} style={{ flex: 2 }}>
                {loading ? <><ButtonSpinner /> Creating...</> : '🚀 Create Account'}
              </button>
            </div>
          </form>
        )}

        <div style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: 'var(--text-muted)' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: 'var(--primary)', fontWeight: 600 }}>Sign in →</Link>
        </div>
      </div>
    </div>
  );
};

/**
 * SkillSwap - Edit Profile Page
 * Form to update name, bio, location, experience level, avatar, and password
 */

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/common/Toast';
import { ButtonSpinner } from '../components/common/LoadingSpinner';
import { UserAvatar } from '../components/common/Utils';
import { userAPI, authAPI } from '../services/api';

// ─── Constants ────────────────────────────────────────────────────────────────
const EXPERIENCE_LEVELS = [
  { value: 'beginner',     label: '🌱 Beginner',     desc: 'Just starting out' },
  { value: 'intermediate', label: '🌿 Intermediate',  desc: 'Some experience' },
  { value: 'expert',       label: '🌳 Expert',        desc: 'Highly proficient' },
];

const MAX_BIO_LENGTH = 500;

// ─── Field-level validation ───────────────────────────────────────────────────
const validateProfile = (form) => {
  const errors = {};
  if (!form.name.trim() || form.name.trim().length < 2) {
    errors.name = 'Name must be at least 2 characters';
  }
  if (form.name.trim().length > 60) {
    errors.name = 'Name must be 60 characters or fewer';
  }
  if (form.bio.length > MAX_BIO_LENGTH) {
    errors.bio = `Bio must be ${MAX_BIO_LENGTH} characters or fewer`;
  }
  if (form.location.length > 100) {
    errors.location = 'Location must be 100 characters or fewer';
  }
  return errors;
};

const validatePassword = (form) => {
  const errors = {};
  if (!form.currentPassword) {
    errors.currentPassword = 'Current password is required';
  }
  if (!form.newPassword || form.newPassword.length < 6) {
    errors.newPassword = 'New password must be at least 6 characters';
  }
  if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(form.newPassword)) {
    errors.newPassword = 'Must contain uppercase, lowercase and a number';
  }
  if (!form.confirmPassword) {
    errors.confirmPassword = 'Please confirm your new password';
  } else if (form.newPassword !== form.confirmPassword) {
    errors.confirmPassword = 'Passwords do not match';
  }
  return errors;
};

// ─── Section header helper ────────────────────────────────────────────────────
const SectionHeader = ({ icon, title, subtitle }) => (
  <div style={{ marginBottom: 20 }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <span style={{ fontSize: 20 }}>{icon}</span>
      <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{title}</h2>
    </div>
    {subtitle && (
      <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '4px 0 0 30px' }}>{subtitle}</p>
    )}
    <hr className="divider" style={{ marginTop: 12 }} />
  </div>
);

// ─── Main component ───────────────────────────────────────────────────────────
export const EditProfile = () => {
  const { user, updateUser, refreshUser } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  // ── Profile form state ───────────────────────────────────────────────────
  const [profileForm, setProfileForm] = useState({
    name: '',
    bio: '',
    location: '',
    experience_level: 'beginner',
  });
  const [profileErrors, setProfileErrors]     = useState({});
  const [profileLoading, setProfileLoading]   = useState(false);

  // ── Avatar state ─────────────────────────────────────────────────────────
  const [avatarPreview, setAvatarPreview]   = useState(null);
  const [avatarFile, setAvatarFile]         = useState(null);
  const [avatarLoading, setAvatarLoading]   = useState(false);

  // ── Password form state ──────────────────────────────────────────────────
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordErrors, setPasswordErrors]   = useState({});
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [showPasswords, setShowPasswords]     = useState({
    current: false,
    new: false,
    confirm: false,
  });

  // Populate form from user context
  useEffect(() => {
    if (user) {
      setProfileForm({
        name:             user.name             || '',
        bio:              user.bio              || '',
        location:         user.location         || '',
        experience_level: user.experience_level || 'beginner',
      });
    }
  }, [user]);

  // ── Profile form helpers ─────────────────────────────────────────────────
  const updateProfile = (field, value) => {
    setProfileForm(prev => ({ ...prev, [field]: value }));
    setProfileErrors(prev => ({ ...prev, [field]: '' }));
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    const errors = validateProfile(profileForm);
    if (Object.keys(errors).length) {
      setProfileErrors(errors);
      return;
    }

    setProfileLoading(true);
    try {
      const res = await userAPI.updateProfile({
        name:             profileForm.name.trim(),
        bio:              profileForm.bio.trim(),
        location:         profileForm.location.trim(),
        experience_level: profileForm.experience_level,
      });
      updateUser(res.data?.user || res.data);
      toast('Profile updated successfully ✅', 'success');
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to update profile';
      toast(msg, 'error');
    } finally {
      setProfileLoading(false);
    }
  };

  // ── Avatar helpers ───────────────────────────────────────────────────────
  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      toast('Please select a JPEG, PNG, WEBP or GIF image', 'error');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast('Image must be smaller than 5 MB', 'error');
      return;
    }

    setAvatarFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setAvatarPreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleAvatarUpload = async () => {
    if (!avatarFile) return;
    setAvatarLoading(true);
    try {
      const formData = new FormData();
      formData.append('avatar', avatarFile);
      const res = await userAPI.uploadAvatar(formData);
      updateUser(res.data?.user || res.data);
      await refreshUser();
      setAvatarPreview(null);
      setAvatarFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      toast('Profile picture updated! 🎉', 'success');
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to upload avatar';
      toast(msg, 'error');
    } finally {
      setAvatarLoading(false);
    }
  };

  const handleAvatarCancel = () => {
    setAvatarPreview(null);
    setAvatarFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ── Password helpers ─────────────────────────────────────────────────────
  const updatePassword = (field, value) => {
    setPasswordForm(prev => ({ ...prev, [field]: value }));
    setPasswordErrors(prev => ({ ...prev, [field]: '' }));
  };

  const toggleShowPassword = (field) => {
    setShowPasswords(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    const errors = validatePassword(passwordForm);
    if (Object.keys(errors).length) {
      setPasswordErrors(errors);
      return;
    }

    setPasswordLoading(true);
    try {
      await authAPI.changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword:     passwordForm.newPassword,
      });
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setShowPasswords({ current: false, new: false, confirm: false });
      toast('Password changed successfully 🔒', 'success');
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to change password';
      if (msg.toLowerCase().includes('incorrect') || msg.toLowerCase().includes('wrong') || msg.toLowerCase().includes('invalid')) {
        setPasswordErrors({ currentPassword: 'Current password is incorrect' });
      } else {
        toast(msg, 'error');
      }
    } finally {
      setPasswordLoading(false);
    }
  };

  // ── Password strength indicator ──────────────────────────────────────────
  const getPasswordStrength = (pw) => {
    if (!pw) return null;
    let score = 0;
    if (pw.length >= 6) score++;
    if (pw.length >= 10) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    if (score <= 1) return { label: 'Weak', color: 'var(--danger)', width: '20%' };
    if (score <= 2) return { label: 'Fair', color: 'var(--warning)', width: '40%' };
    if (score <= 3) return { label: 'Good', color: 'var(--info)', width: '65%' };
    return { label: 'Strong', color: 'var(--success)', width: '100%' };
  };

  const pwStrength = getPasswordStrength(passwordForm.newPassword);

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="page-content" style={{ maxWidth: 720 }}>

      {/* Page header */}
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => navigate('/profile')}
          >
            ← Back to Profile
          </button>
        </div>
        <h1 className="page-title">Edit Profile</h1>
        <p className="page-subtitle">Keep your profile up-to-date so others can find the right match</p>
      </div>

      {/* ── Avatar Upload Card ─────────────────────────────────────────── */}
      <div className="card" style={{ marginBottom: 24 }}>
        <SectionHeader icon="🖼️" title="Profile Picture" subtitle="JPG, PNG, WEBP or GIF · Max 5 MB" />

        <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
          {/* Current / preview avatar */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            {avatarPreview ? (
              <img
                src={avatarPreview}
                alt="Preview"
                style={{
                  width: 96,
                  height: 96,
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: '3px solid var(--primary)',
                  display: 'block',
                }}
              />
            ) : (
              <UserAvatar src={user?.avatar} name={user?.name || '?'} size={96} />
            )}
            {avatarPreview && (
              <div
                style={{
                  position: 'absolute',
                  bottom: 0,
                  right: 0,
                  width: 24,
                  height: 24,
                  background: 'var(--success)',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 12,
                  color: 'white',
                  border: '2px solid white',
                }}
              >
                ✓
              </div>
            )}
          </div>

          <div style={{ flex: 1, minWidth: 200 }}>
            {avatarPreview ? (
              <div>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>
                  Preview looks good? Click <strong>Upload</strong> to save.
                </p>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={handleAvatarUpload}
                    disabled={avatarLoading}
                  >
                    {avatarLoading ? <><ButtonSpinner /> Uploading...</> : '☁️ Upload'}
                  </button>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={handleAvatarCancel}
                    disabled={avatarLoading}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>
                  {user?.avatar ? 'Replace your current profile picture' : 'Upload a profile picture to stand out'}
                </p>
                <button
                  className="btn btn-outline btn-sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  📁 Choose Image
                </button>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={handleAvatarChange}
              style={{ display: 'none' }}
              aria-label="Upload profile picture"
            />
          </div>
        </div>
      </div>

      {/* ── Profile Info Card ──────────────────────────────────────────── */}
      <div className="card" style={{ marginBottom: 24 }}>
        <SectionHeader icon="👤" title="Personal Information" subtitle="How others see you on SkillSwap" />

        <form onSubmit={handleProfileSubmit} noValidate>

          {/* Name */}
          <div className="form-group">
            <label className="form-label" htmlFor="name">
              Full Name <span className="required">*</span>
            </label>
            <div className="input-group">
              <span className="input-icon">👤</span>
              <input
                id="name"
                className="form-input"
                placeholder="Your full name"
                value={profileForm.name}
                onChange={e => updateProfile('name', e.target.value)}
                maxLength={60}
                style={profileErrors.name ? { borderColor: 'var(--danger)' } : {}}
              />
            </div>
            {profileErrors.name
              ? <span className="form-error">⚠ {profileErrors.name}</span>
              : <span className="form-hint">{profileForm.name.trim().length}/60 characters</span>
            }
          </div>

          {/* Location */}
          <div className="form-group">
            <label className="form-label" htmlFor="location">Location</label>
            <div className="input-group">
              <span className="input-icon">📍</span>
              <input
                id="location"
                className="form-input"
                placeholder="City, Country"
                value={profileForm.location}
                onChange={e => updateProfile('location', e.target.value)}
                maxLength={100}
                style={profileErrors.location ? { borderColor: 'var(--danger)' } : {}}
              />
            </div>
            {profileErrors.location && (
              <span className="form-error">⚠ {profileErrors.location}</span>
            )}
          </div>

          {/* Experience Level */}
          <div className="form-group">
            <label className="form-label">Experience Level</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
              {EXPERIENCE_LEVELS.map(({ value, label, desc }) => (
                <div
                  key={value}
                  onClick={() => updateProfile('experience_level', value)}
                  style={{
                    border: `2px solid ${profileForm.experience_level === value ? 'var(--primary)' : 'var(--border)'}`,
                    borderRadius: 'var(--radius)',
                    padding: '12px 14px',
                    cursor: 'pointer',
                    background: profileForm.experience_level === value ? 'var(--primary-50)' : 'var(--bg-primary)',
                    transition: 'var(--transition)',
                    textAlign: 'center',
                  }}
                >
                  <p style={{ fontWeight: 600, fontSize: 13, color: profileForm.experience_level === value ? 'var(--primary)' : 'var(--text-primary)', margin: '0 0 2px' }}>
                    {label}
                  </p>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>{desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Bio */}
          <div className="form-group">
            <label className="form-label" htmlFor="bio">Bio</label>
            <textarea
              id="bio"
              className="form-textarea"
              placeholder="Tell others about yourself — what you're passionate about, your background, what makes you a great skill-swap partner..."
              value={profileForm.bio}
              onChange={e => updateProfile('bio', e.target.value)}
              rows={4}
              maxLength={MAX_BIO_LENGTH}
              style={profileErrors.bio ? { borderColor: 'var(--danger)' } : {}}
            />
            {profileErrors.bio
              ? <span className="form-error">⚠ {profileErrors.bio}</span>
              : (
                <span className="form-hint" style={{ textAlign: 'right' }}>
                  {profileForm.bio.length}/{MAX_BIO_LENGTH}
                </span>
              )
            }
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => navigate('/profile')}
              disabled={profileLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={profileLoading}
            >
              {profileLoading ? <><ButtonSpinner /> Saving...</> : '💾 Save Changes'}
            </button>
          </div>
        </form>
      </div>

      {/* ── Change Password Card ───────────────────────────────────────── */}
      <div className="card">
        <SectionHeader
          icon="🔒"
          title="Change Password"
          subtitle="Use a strong, unique password you don't use elsewhere"
        />

        <form onSubmit={handlePasswordSubmit} noValidate>

          {/* Current password */}
          <div className="form-group">
            <label className="form-label" htmlFor="current-password">
              Current Password <span className="required">*</span>
            </label>
            <div className="input-group">
              <span className="input-icon">🔑</span>
              <input
                id="current-password"
                type={showPasswords.current ? 'text' : 'password'}
                className="form-input"
                placeholder="Your current password"
                value={passwordForm.currentPassword}
                onChange={e => updatePassword('currentPassword', e.target.value)}
                autoComplete="current-password"
                style={passwordErrors.currentPassword ? { borderColor: 'var(--danger)' } : {}}
              />
              <span
                className="input-icon-right"
                onClick={() => toggleShowPassword('current')}
                role="button"
                tabIndex={0}
                onKeyDown={e => e.key === 'Enter' && toggleShowPassword('current')}
                aria-label={showPasswords.current ? 'Hide password' : 'Show password'}
              >
                {showPasswords.current ? '🙈' : '👁️'}
              </span>
            </div>
            {passwordErrors.currentPassword && (
              <span className="form-error">⚠ {passwordErrors.currentPassword}</span>
            )}
          </div>

          {/* New password */}
          <div className="form-group">
            <label className="form-label" htmlFor="new-password">
              New Password <span className="required">*</span>
            </label>
            <div className="input-group">
              <span className="input-icon">🔒</span>
              <input
                id="new-password"
                type={showPasswords.new ? 'text' : 'password'}
                className="form-input"
                placeholder="Min. 6 chars, uppercase, number"
                value={passwordForm.newPassword}
                onChange={e => updatePassword('newPassword', e.target.value)}
                autoComplete="new-password"
                style={passwordErrors.newPassword ? { borderColor: 'var(--danger)' } : {}}
              />
              <span
                className="input-icon-right"
                onClick={() => toggleShowPassword('new')}
                role="button"
                tabIndex={0}
                onKeyDown={e => e.key === 'Enter' && toggleShowPassword('new')}
                aria-label={showPasswords.new ? 'Hide password' : 'Show password'}
              >
                {showPasswords.new ? '🙈' : '👁️'}
              </span>
            </div>
            {passwordErrors.newPassword && (
              <span className="form-error">⚠ {passwordErrors.newPassword}</span>
            )}

            {/* Strength bar */}
            {pwStrength && (
              <div style={{ marginTop: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Password strength</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: pwStrength.color }}>
                    {pwStrength.label}
                  </span>
                </div>
                <div style={{ height: 4, borderRadius: 99, background: 'var(--border)', overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      width: pwStrength.width,
                      background: pwStrength.color,
                      borderRadius: 99,
                      transition: 'width 0.4s ease',
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Confirm new password */}
          <div className="form-group">
            <label className="form-label" htmlFor="confirm-password">
              Confirm New Password <span className="required">*</span>
            </label>
            <div className="input-group">
              <span className="input-icon">🔒</span>
              <input
                id="confirm-password"
                type={showPasswords.confirm ? 'text' : 'password'}
                className="form-input"
                placeholder="Repeat your new password"
                value={passwordForm.confirmPassword}
                onChange={e => updatePassword('confirmPassword', e.target.value)}
                autoComplete="new-password"
                style={passwordErrors.confirmPassword ? { borderColor: 'var(--danger)' } : {}}
              />
              <span
                className="input-icon-right"
                onClick={() => toggleShowPassword('confirm')}
                role="button"
                tabIndex={0}
                onKeyDown={e => e.key === 'Enter' && toggleShowPassword('confirm')}
                aria-label={showPasswords.confirm ? 'Hide password' : 'Show password'}
              >
                {showPasswords.confirm ? '🙈' : '👁️'}
              </span>
            </div>
            {passwordErrors.confirmPassword && (
              <span className="form-error">⚠ {passwordErrors.confirmPassword}</span>
            )}
            {!passwordErrors.confirmPassword &&
              passwordForm.confirmPassword &&
              passwordForm.newPassword === passwordForm.confirmPassword && (
                <span style={{ fontSize: 12, color: 'var(--success)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  ✅ Passwords match
                </span>
              )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={passwordLoading}
            >
              {passwordLoading ? <><ButtonSpinner /> Changing...</> : '🔐 Change Password'}
            </button>
          </div>
        </form>
      </div>

    </div>
  );
};

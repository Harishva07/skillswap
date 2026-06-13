/**
 * SkillSwap - Landing Page
 */

import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';

const features = [
  { icon: '🤝', title: 'Skill Exchange', desc: 'Trade your expertise for skills you want to learn, completely free.' },
  { icon: '🔍', title: 'Smart Matching', desc: 'Our algorithm finds your perfect learning partners based on compatible skills.' },
  { icon: '💬', title: 'Real-time Chat', desc: 'Communicate instantly with your exchange partners through our built-in messaging.' },
  { icon: '⭐', title: 'Rating System', desc: 'Build your reputation through peer reviews after each successful exchange.' },
  { icon: '📊', title: 'Track Progress', desc: 'Monitor your active exchanges, completed sessions, and learning journey.' },
  { icon: '🔒', title: 'Secure Platform', desc: 'JWT authentication and encrypted passwords keep your account safe.' },
];

const stats = [
  { value: '10,000+', label: 'Active Members' },
  { value: '500+', label: 'Skills Available' },
  { value: '25,000+', label: 'Exchanges Completed' },
  { value: '4.8/5', label: 'Average Rating' },
];

export const Landing = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) navigate('/dashboard');
  }, [user]);

  return (
    <div className="landing-page">
      {/* Navigation */}
      <nav className="landing-nav">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36,
            background: 'linear-gradient(135deg, #2563EB, #7C3AED)',
            borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18
          }}>🔄</div>
          <span style={{ fontSize: 20, fontWeight: 800, color: '#0F172A', letterSpacing: -0.5 }}>
            Skill<span style={{ color: '#2563EB' }}>Swap</span>
          </span>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <Link to="/login" className="btn btn-secondary">Sign In</Link>
          <Link to="/register" className="btn btn-primary">Get Started Free</Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="landing-hero">
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 999, padding: '6px 16px', marginBottom: 24 }}>
          <span>🎉</span>
          <span style={{ fontSize: 13, color: '#1D4ED8', fontWeight: 600 }}>Join 10,000+ skill exchangers worldwide</span>
        </div>
        <h1>Exchange Skills,<br /><span>Grow Together</span></h1>
        <p>
          SkillSwap is the platform where knowledge meets opportunity. 
          Share what you know, learn what you need — completely free.
        </p>
        <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link to="/register" className="btn btn-primary btn-lg">
            🚀 Start Swapping Skills
          </Link>
          <Link to="/login" className="btn btn-secondary btn-lg">
            Sign In →
          </Link>
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', gap: 40, justifyContent: 'center', marginTop: 56, flexWrap: 'wrap' }}>
          {stats.map((s, i) => (
            <div key={i} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 28, fontWeight: 900, color: '#1D4ED8', letterSpacing: -1 }}>{s.value}</div>
              <div style={{ fontSize: 13, color: '#64748B', fontWeight: 500, marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="landing-features">
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <h2 style={{ fontSize: 36, fontWeight: 900, color: '#0F172A', letterSpacing: -1, marginBottom: 12 }}>
            Everything you need to <span style={{ color: '#2563EB' }}>grow</span>
          </h2>
          <p style={{ fontSize: 16, color: '#64748B', maxWidth: 500, margin: '0 auto' }}>
            SkillSwap provides all the tools you need to find, connect, and exchange skills with others.
          </p>
        </div>
        <div className="grid-3" style={{ gap: 24 }}>
          {features.map((f, i) => (
            <div key={i} className="feature-card">
              <div className="feature-icon">{f.icon}</div>
              <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 8, color: '#0F172A' }}>{f.title}</h3>
              <p style={{ fontSize: 14, color: '#64748B', lineHeight: 1.6 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section style={{ background: 'linear-gradient(135deg, #1D4ED8, #7C3AED)', padding: '80px 80px', textAlign: 'center' }}>
        <h2 style={{ fontSize: 36, fontWeight: 900, color: 'white', marginBottom: 16, letterSpacing: -1 }}>
          Ready to start your skill journey?
        </h2>
        <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.8)', marginBottom: 32, maxWidth: 480, margin: '0 auto 32px' }}>
          Join thousands of learners who are growing their skills through peer-to-peer exchange.
        </p>
        <Link to="/register" className="btn btn-lg" style={{ background: 'white', color: '#1D4ED8', fontWeight: 700, fontSize: 15 }}>
          Create Free Account →
        </Link>
      </section>

      {/* Footer */}
      <footer style={{ background: '#0F172A', padding: '40px 80px', textAlign: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 16 }}>
          <div style={{ width: 32, height: 32, background: 'linear-gradient(135deg, #2563EB, #7C3AED)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>🔄</div>
          <span style={{ fontSize: 18, fontWeight: 800, color: 'white' }}>Skill<span style={{ color: '#60A5FA' }}>Swap</span></span>
        </div>
        <p style={{ color: '#64748B', fontSize: 13 }}>
          © 2024 SkillSwap. Exchange Skills, Grow Together.
        </p>
      </footer>
    </div>
  );
};

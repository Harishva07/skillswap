/** SkillSwap - Stars Rating Display */
export const Stars = ({ rating = 0, max = 5, size = 14 }) => {
  return (
    <div className="stars" style={{ fontSize: size }}>
      {Array.from({ length: max }).map((_, i) => (
        <span key={i} className={`star ${i < Math.round(rating) ? '' : 'empty'}`}>★</span>
      ))}
    </div>
  );
};

/** Avatar placeholder with initials */
export const AvatarPlaceholder = ({ name = '?', size = 40, className = '' }) => {
  const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  return (
    <div
      className={`avatar-placeholder ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.38, flexShrink: 0 }}
    >
      {initials}
    </div>
  );
};

/** User avatar with fallback */
export const UserAvatar = ({ src, name, size = 40, className = '' }) => {
  if (src) {
    return (
      <img
        src={src.startsWith('http') ? src : `/uploads/${src}`}
        alt={name}
        className={`avatar ${className}`}
        style={{ width: size, height: size }}
        onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
      />
    );
  }
  return <AvatarPlaceholder name={name} size={size} className={className} />;
};

/** Format date to relative time */
export const timeAgo = (date) => {
  const now = new Date();
  const d = new Date(date);
  const diff = Math.floor((now - d) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return d.toLocaleDateString();
};

/** Capitalize first letter */
export const capitalize = (str = '') => str.charAt(0).toUpperCase() + str.slice(1);

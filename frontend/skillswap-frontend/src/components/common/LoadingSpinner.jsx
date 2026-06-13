/** LoadingSpinner component */
export const LoadingSpinner = ({ fullPage = false, size = 'md' }) => {
  if (fullPage) {
    return (
      <div className="spinner-overlay">
        <div className="spinner"></div>
      </div>
    );
  }
  return <div className={`spinner ${size === 'sm' ? 'spinner-sm' : ''}`}></div>;
};

/** Inline button spinner */
export const ButtonSpinner = () => <span className="spinner-inline"></span>;

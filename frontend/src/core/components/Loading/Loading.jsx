import React from 'react';
import './Loading.css';

/**
 * Loading Spinner Component
 * @param {string} size - 'small' | 'medium' | 'large' | 'fullscreen'
 * @param {string} text - Optional loading text
 * @param {string} type - 'spinner' | 'dots' | 'skeleton'
 */
export const Spinner = ({ size = 'medium', text = '' }) => {
  return (
    <div className={`loading-spinner ${size}`}>
      <div className="spinner"></div>
      {text && <span className="loading-text">{text}</span>}
    </div>
  );
};

/**
 * Full page loading overlay
 */
export const FullPageLoader = ({ text = 'A carregar...' }) => {
  return (
    <div className="fullpage-loader">
      <div className="loader-content">
        <div className="spinner large"></div>
        <span className="loading-text">{text}</span>
      </div>
    </div>
  );
};

/**
 * Skeleton loader for content
 */
export const Skeleton = ({ width = '100%', height = '20px', borderRadius = '4px', count = 1 }) => {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div 
          key={i}
          className="skeleton"
          style={{ width, height, borderRadius, marginBottom: count > 1 ? '8px' : 0 }}
        />
      ))}
    </>
  );
};

/**
 * Skeleton for chat messages
 */
export const MessageSkeleton = ({ count = 3 }) => {
  return (
    <div className="message-skeleton-container">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={`message-skeleton ${i % 2 === 0 ? '' : 'own'}`}>
          <div className="skeleton-header">
            <Skeleton width="80px" height="12px" />
            <Skeleton width="40px" height="12px" />
          </div>
          <Skeleton width={`${60 + Math.random() * 30}%`} height="16px" />
        </div>
      ))}
    </div>
  );
};

/**
 * Skeleton for list items
 */
export const ListSkeleton = ({ count = 5 }) => {
  return (
    <div className="list-skeleton-container">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="list-skeleton-item">
          <Skeleton width="40px" height="40px" borderRadius="50%" />
          <div className="list-skeleton-text">
            <Skeleton width="60%" height="14px" />
            <Skeleton width="40%" height="12px" />
          </div>
        </div>
      ))}
    </div>
  );
};

/**
 * Skeleton for table rows
 */
export const TableSkeleton = ({ rows = 5, cols = 4 }) => {
  return (
    <div className="table-skeleton">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="table-skeleton-row">
          {Array.from({ length: cols }).map((_, j) => (
            <Skeleton key={j} width={`${100 / cols - 2}%`} height="16px" />
          ))}
        </div>
      ))}
    </div>
  );
};

/**
 * Inline button loading state
 */
export const ButtonSpinner = () => {
  return <span className="button-spinner"></span>;
};

export default Spinner;

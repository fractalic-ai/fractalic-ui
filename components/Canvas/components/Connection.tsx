import React from 'react';
import styles from '../styles/Connection.module.css';

interface ConnectionProps {
  path: string;
  type: 'default' | 'highlighted' | 'dimmed';
  isHovered?: boolean;
  onClick?: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

export const Connection: React.FC<ConnectionProps> = ({
  path,
  type,
  isHovered,
  onClick,
  onMouseEnter,
  onMouseLeave
}) => {
  const getStrokeColor = () => {
    switch (type) {
      case 'highlighted':
        return '#60A5FA';
      case 'dimmed':
        return '#4B5563';
      default:
        return '#6B7280';
    }
  };

  return (
    <g>
      <path
        className={`${styles.connectionPath} ${isHovered ? styles.connectionPathHover : ''}`}
        d={path}
        stroke={getStrokeColor()}
        strokeWidth={isHovered ? 2 : 1.5}
        fill="none"
        strokeDasharray={type === 'dimmed' ? '4 4' : undefined}
        onClick={onClick}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      />
      <circle
        className={styles.connectionEndpoint}
        cx={0}
        cy={0}
        r={3}
        fill={getStrokeColor()}
      />
    </g>
  );
};

// Find the connection path element (likely an SVG path) and update its className
// For example, if it was previously:
// <path className="connection-path" ... />
// Change it to:
// <path className={styles.connectionPath} ... />

// Find the connection endpoint element (likely an SVG circle) and update its className
// For example, if it was previously:
// <circle className="connection-endpoint" ... />
// Change it to:
// <circle className={styles.connectionEndpoint} ... />

// If there are hover states or pattern elements, update their className accordingly:
// For example, if there was:
// <path className="connection-path connection-path-hover" ... />
// Change it to:
// <path className={`${styles.connectionPath} ${styles.connectionPathHover}`} ... />

// ... existing code ... 
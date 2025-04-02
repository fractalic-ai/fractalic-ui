import React from 'react';
import styles from './CollapsibleContent.module.css';

interface CollapsibleContentProps {
  isCollapsed: boolean;
  children: React.ReactNode;
  className?: string;
}

export const CollapsibleContent: React.FC<CollapsibleContentProps> = ({
  isCollapsed,
  children,
  className = ''
}) => {
  return (
    <div 
      className={`${isCollapsed ? styles.collapsibleContentCollapsed : styles.collapsibleContent} ${className}`}
    >
      {children}
    </div>
  );
};

// Find the container element (likely a div) and update its className
// For example, if it was previously:
// <div className="collapsible-content">
// Change it to:
// <div className={isCollapsed ? styles.collapsibleContentCollapsed : styles.collapsibleContent}>

// ... existing code ... 
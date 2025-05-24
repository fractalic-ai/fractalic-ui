import React from 'react';

interface UptimeProps {
  value: number | null;
}

const Uptime: React.FC<UptimeProps> = ({ value }) => {
  const formatUptime = (seconds: number | null): string => {
    if (!seconds || seconds < 0) return 'N/A';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  return (
    <span className="font-mono text-white">
      {formatUptime(value)}
    </span>
  );
};

export default Uptime;

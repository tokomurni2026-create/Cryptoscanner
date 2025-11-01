import React, { useEffect, useRef } from 'react';

const LogPanel = ({ logs }) => {
  const logContentRef = useRef(null);

  useEffect(() => {
    if (logContentRef.current) {
      logContentRef.current.scrollTop = 0;
    }
  }, [logs]);

  const getLogColor = (type) => {
    switch (type) {
      case 'success': return '#10b981';
      case 'error': return '#ef4444';
      case 'warning': return '#f59e0b';
      default: return '#94a3b8';
    }
  };

  return (
    <div className="log-panel">
      <h3 style={{ marginBottom: '16px', color: '#f1f5f9' }}>Scan Log</h3>
      <div className="log-content" ref={logContentRef}>
        {logs.length === 0 ? (
          <div style={{ color: '#64748b', textAlign: 'center', padding: '20px' }}>
            No logs yet. Start a scan to see activity.
          </div>
        ) : (
          logs.map((log, index) => (
            <div key={index} className="log-entry">
              <span className="log-timestamp">[{log.timestamp}]</span>
              <span style={{ color: getLogColor(log.type) }}>
                {log.message}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default LogPanel;

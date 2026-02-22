import React from 'react';

function Sparkline({ data = [], color = '#00f5ff', width = 200, height = 60 }) {
  if (!data || data.length === 0) {
    // Generate random data for demo if no data provided
    data = Array.from({ length: 10 }, () => Math.random() * 50 + 25);
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  // Calculate points
  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * width;
    const y = height - ((value - min) / range) * (height - 10) - 5;
    return `${x},${y}`;
  }).join(' ');

  // Create smooth path
  const createSmoothPath = (points) => {
    if (points.length < 2) return '';
    
    let path = `M ${points[0].x} ${points[0].y}`;
    
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const cpx1 = prev.x + (curr.x - prev.x) / 3;
      const cpy1 = prev.y;
      const cpx2 = prev.x + 2 * (curr.x - prev.x) / 3;
      const cpy2 = curr.y;
      path += ` C ${cpx1} ${cpy1}, ${cpx2} ${cpy2}, ${curr.x} ${curr.y}`;
    }
    
    return path;
  };

  const pointObjects = data.map((value, index) => ({
    x: (index / (data.length - 1)) * width,
    y: height - ((value - min) / range) * (height - 10) - 5
  }));

  const smoothPath = createSmoothPath(pointObjects);

  // Create area path
  const areaPath = smoothPath + 
    ` L ${width} ${height} L 0 ${height} Z`;

  return (
    <svg 
      width="100%" 
      height={height} 
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      style={{ overflow: 'visible' }}
    >
      <defs>
        <linearGradient id={`gradient-${color.replace('#', '')}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      
      {/* Area fill */}
      <path
        d={areaPath}
        fill={`url(#gradient-${color.replace('#', '')})`}
        stroke="none"
      />
      
      {/* Line */}
      <path
        d={smoothPath}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{
          filter: `drop-shadow(0 0 4px ${color})`
        }}
      />
      
      {/* End point dot */}
      <circle
        cx={pointObjects[pointObjects.length - 1].x}
        cy={pointObjects[pointObjects.length - 1].y}
        r="4"
        fill={color}
        style={{
          filter: `drop-shadow(0 0 6px ${color})`
        }}
      />
    </svg>
  );
}

export default Sparkline;

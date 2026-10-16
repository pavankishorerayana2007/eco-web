import React from 'react';

export const AdminGraph = () => {
  return (
    <div>
      <h1>Platform Analytics & Graphs</h1>

      {/* Sales Trend Card */}
      <div className="pn">
        <h3>Platform sales trend (completed deliveries)</h3>
        <div className="tw">
          <svg viewBox="0 0 680 160" style={{ width: '100%', minWidth: '480px' }} role="img">
            <line x1="48" x2="680" y1="130" y2="130" stroke="#DCE8E6" />
            <line x1="48" x2="680" y1="90" y2="90" stroke="#DCE8E6" />
            <line x1="48" x2="680" y1="50" y2="50" stroke="#DCE8E6" />
            <line x1="48" x2="680" y1="10" y2="10" stroke="#DCE8E6" />

            <rect x="70" y="30" width="36" height="100" rx="4" fill="#0B7A75" />
            <rect x="150" y="20" width="36" height="110" rx="4" fill="#0B7A75" />
            <rect x="230" y="45" width="36" height="85" rx="4" fill="#0B7A75" />
            <rect x="310" y="15" width="36" height="115" rx="4" fill="#0B7A75" />
            <rect x="390" y="25" width="36" height="105" rx="4" fill="#0B7A75" />
            <rect x="470" y="40" width="36" height="90" rx="4" fill="#0B7A75" />
            <rect x="550" y="10" width="36" height="120" rx="4" fill="#0B7A75" />

            <text x="80" y="150" fontSize="10" fill="#566B7C">Week 1</text>
            <text x="240" y="150" fontSize="10" fill="#566B7C">Week 2</text>
            <text x="400" y="150" fontSize="10" fill="#566B7C">Week 3</text>
            <text x="560" y="150" fontSize="10" fill="#566B7C">Week 4</text>
          </svg>
        </div>
        <div className="sm" style={{ marginTop: '6px' }}>
          <span style={{ color: '#0B7A75' }}>■</span> Platform Gross Sales
        </div>
      </div>

      <div className="two">
        <div className="pn">
          <h3>Orders by status</h3>
          <div className="rk">
            <div>
              <span>Delivered</span>
              <i style={{ width: '85%' }}></i>
              <b>85%</b>
            </div>
            <div>
              <span>Placed</span>
              <i style={{ width: '45%' }}></i>
              <b>45%</b>
            </div>
            <div>
              <span>Cancelled</span>
              <i style={{ width: '8%' }}></i>
              <b>8%</b>
            </div>
          </div>
        </div>

        <div className="pn">
          <h3>Active vs suspended owners</h3>
          <div className="rk">
            <div>
              <span>Active Owners</span>
              <i style={{ width: '90%' }}></i>
              <b>90%</b>
            </div>
            <div>
              <span>Suspended</span>
              <i style={{ width: '10%' }}></i>
              <b>10%</b>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

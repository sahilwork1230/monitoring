import React from 'react';
import { Table } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import logo from '../assets/johnnette-logo.png';

export default function Header() {
  const location = useLocation();
  const isUploadPage = location.pathname === '/upload' || location.pathname === '/';

  return (
    <header style={{
      position: 'sticky',
      top: 0,
      zIndex: 50,
      // background: 'rgba(255, 255, 255, 0.96)',
      backgroundColor: 'black',
      backdropFilter: 'blur(20px)',
      borderBottom: '1px solid var(--border-light)',
      padding: '14px 28px'
    }}>
      <div style={{
        maxWidth: '1400px',
        margin: '0 auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ background: '#090909', borderRadius: '8px', padding: '4px 8px' }}>
            <img src={logo} alt="Johnnette" style={{ display: 'block', width: '130px', height: 'auto' }} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{
                // fontSize: '0.75rem',
                fontSize: '16px',
                // padding: '2px 8px',
                borderRadius: '6px',
                // background: 'var(--bg-surface)',
                // color: 'var(--text-secondary)',
                color: 'white',
                border: '1px solid var(--border-light)'
              }}>
                {isUploadPage ? 'Upload Portal' : 'Live Monitor'}
              </span>
            </div>
            <p style={{ fontSize: '0.75rem', 
              /* color: 'var(--text-muted)'*/
                color: 'var(--color-gray-400,white)',
               margin: 0 }}>
              {isUploadPage ? 'Excel Ingestion & Processing' : 'Real-Time Data Streaming'}
            </p>
          </div>
        </div>

        <nav style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {isUploadPage && (
            <Link
              to="/monitor"
              className="btn btn-secondary btn-sm"
              style={{ textDecoration: 'none' }}
            >
              <Table size={15} />
              <span>Go to Live Monitor</span>
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}

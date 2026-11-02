import React, { useState, useEffect, useMemo } from 'react';
import { 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown, 
  ChevronLeft, 
  ChevronRight, 
  Layers, 
  FileSpreadsheet, 
  Sparkles,
} from 'lucide-react';
import { api } from '../api';

export default function RenderPage() {
  // Dataset state
  const [dataset, setDataset] = useState(null);
  const [activeSheet, setActiveSheet] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Real-time polling state
  const [latestVersion, setLatestVersion] = useState(null);
  const [latestDatasetId, setLatestDatasetId] = useState(null);
  const [updateNotification, setUpdateNotification] = useState(null);
  const pollIntervalMs = 2500;

  // Table manipulation state
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  // Load initial dataset
  const fetchFullDataset = async (sheet = '') => {
    try {
      const res = await api.getLatestData(sheet);
      if (res.has_data) {
        const datasetData = { ...res.dataset };
        setLatestVersion(datasetData.version);
        setLatestDatasetId(datasetData.id);
        const preferredSheet = (sheet && !sheet.toLowerCase().includes('regional')) 
          ? sheet 
          : (datasetData.sheet_names?.find(s => !s.toLowerCase().includes('regional')) || datasetData.active_sheet || '');
        setActiveSheet(preferredSheet);

        if (preferredSheet && datasetData.all_sheets_data && datasetData.all_sheets_data[preferredSheet]) {
          const sheetInfo = datasetData.all_sheets_data[preferredSheet];
          datasetData.headers = sheetInfo.headers || datasetData.headers;
          datasetData.rows_data = sheetInfo.rows || datasetData.rows_data;
          datasetData.total_rows = sheetInfo.total_rows || datasetData.total_rows;
          datasetData.summary_stats = sheetInfo.summary_stats || datasetData.summary_stats;
        }

        setDataset(datasetData);
      } else {
        setDataset(null);
        setLatestVersion(null);
        setLatestDatasetId(null);
      }
      setError(null);
    } catch (err) {
      console.error('Fetch error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchFullDataset();
  }, []);

  // Continuous background polling for updates
  useEffect(() => {
    const pollTimer = setInterval(async () => {
      try {
        const status = await api.checkStatus();

        if (status.has_data) {
          // Detect if a newer version exists in backend
          if (latestVersion !== null && status.version > latestVersion) {
            setUpdateNotification({
              version: status.version,
              file_name: status.file_name,
              uploader_name: status.uploader_name,
              timestamp: new Date().toLocaleTimeString()
            });

            // Auto-fetch latest data immediately
            await fetchFullDataset(activeSheet);
            setLatestVersion(status.version);

            // Auto dismiss notification banner after 6 seconds
            setTimeout(() => {
              setUpdateNotification(null);
            }, 6000);
          } else if (latestDatasetId !== null && status.latest_id !== latestDatasetId) {
            await fetchFullDataset(activeSheet);
          } else if (latestVersion === null) {
            // First time detecting data if initially empty
            await fetchFullDataset(activeSheet);
            setLatestVersion(status.version);
          }
        } else if (latestDatasetId !== null) {
          await fetchFullDataset();
        }
      } catch (err) {
        console.warn('Background poll failed:', err);
      }
    }, pollIntervalMs);

    return () => clearInterval(pollTimer);
  }, [latestVersion, latestDatasetId, activeSheet]);

  // Handle Sheet tab switch
  const handleSheetSwitch = async (sheetName) => {
    if (sheetName === activeSheet) return;
    setActiveSheet(sheetName);
    setCurrentPage(1);
    await fetchFullDataset(sheetName);
  };

  // Sorting handler
  const handleSort = (columnKey) => {
    let direction = 'asc';
    if (sortConfig.key === columnKey && sortConfig.direction === 'asc') {
      direction = 'desc';
    } else if (sortConfig.key === columnKey && sortConfig.direction === 'desc') {
      // Reset sort
      setSortConfig({ key: null, direction: 'asc' });
      return;
    }
    setSortConfig({ key: columnKey, direction });
  };

  // Filtered & Sorted rows calculation
  const processedRows = useMemo(() => {
    if (!dataset || !dataset.rows_data) return [];
    let rows = [...dataset.rows_data];

    // Sort rows
    if (sortConfig.key) {
      rows.sort((a, b) => {
        const valA = a[sortConfig.key];
        const valB = b[sortConfig.key];

        if (valA === null || valA === undefined || valA === '') return 1;
        if (valB === null || valB === undefined || valB === '') return -1;

        // Numeric comparison
        const numA = typeof valA === 'number' ? valA : parseFloat(String(valA).replace(/[^0-9.-]+/g, ''));
        const numB = typeof valB === 'number' ? valB : parseFloat(String(valB).replace(/[^0-9.-]+/g, ''));

        if (!isNaN(numA) && !isNaN(numB)) {
          return sortConfig.direction === 'asc' ? numA - numB : numB - numA;
        }

        // String comparison
        const strA = String(valA).toLowerCase();
        const strB = String(valB).toLowerCase();
        if (strA < strB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (strA > strB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return rows;
  }, [dataset, sortConfig]);

  // Pagination calculation
  const totalPages = Math.ceil(processedRows.length / pageSize) || 1;
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return processedRows.slice(start, start + pageSize);
  }, [processedRows, currentPage, pageSize]);

  // Cell rendering with smart pills for known statuses
  const renderCellContent = (value, header) => {
    if (value === null || value === undefined || value === '') {
      return <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>—</span>;
    }

    const str = String(value);
    const lower = str.toLowerCase();

    // Status Pills
    if (['paid', 'completed', 'success', 'approved', 'active'].includes(lower)) {
      return <span className="badge badge-success">{str}</span>;
    }
    if (['pending', 'processing', 'in progress', 'waiting'].includes(lower)) {
      return <span className="badge badge-warning">{str}</span>;
    }
    if (['refunded', 'cancelled', 'failed', 'rejected'].includes(lower)) {
      return <span className="badge badge-danger">{str}</span>;
    }

    // Currency / Numeric styling
    if (typeof value === 'number' || (!isNaN(parseFloat(value)) && (header.toLowerCase().includes('price') || header.toLowerCase().includes('revenue') || header.toLowerCase().includes('target') || header.toLowerCase().includes('achieved')))) {
      const isCurrency = header.toLowerCase().includes('$') || header.toLowerCase().includes('price') || header.toLowerCase().includes('revenue') || header.toLowerCase().includes('target') || header.toLowerCase().includes('achieved');
      return (
        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 500, color: 'var(--text-primary)' }}>
          {isCurrency && !str.startsWith('$') ? `$${typeof value === 'number' ? value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : str}` : str}
        </span>
      );
    }

    return str;
  };

  return (
    <div style={{
      width: '100%',
      padding: totalPages > 1 ? '30px 20px 96px' : '30px 20px'
    }}>

      {/* Floating Instant Update Notification Banner */}
      {updateNotification && (
        <div className="animate-slide-down" style={{
          position: 'sticky',
          top: '80px',
          zIndex: 40,
          background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.95) 0%, rgba(5, 150, 105, 0.95) 100%)',
          color: '#ffffff',
          borderRadius: 'var(--radius-md)',
          padding: '14px 22px',
          boxShadow: '0 10px 25px rgba(16, 185, 129, 0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '24px',
          backdropFilter: 'blur(8px)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Sparkles size={20} className="animate-float" />
            <div>
              <strong style={{ fontSize: '0.95rem' }}>
                Live Stream Updated! (v{updateNotification.version})
              </strong>
              <span style={{ fontSize: '0.85rem', marginLeft: '8px', opacity: 0.9 }}>
                "{updateNotification.file_name}" uploaded by {updateNotification.uploader_name} was just rendered.
              </span>
            </div>
          </div>
          <button 
            onClick={() => setUpdateNotification(null)}
            style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '1.1rem' }}
          >
            ✕
          </button>
        </div>
      )}

      {/* When no dataset has been uploaded yet */}
      {!loading && !dataset && (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '60px 20px', margin: '30px 0' }}>
          <div style={{
            width: '72px',
            height: '72px',
            borderRadius: '50%',
            background: 'var(--primary-light)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px',
            color: 'var(--primary)'
          }}>
            <FileSpreadsheet size={36} />
          </div>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 800, marginBottom: '8px' }}>
            No Excel Dataset Ingested Yet
          </h2>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', maxWidth: '480px', margin: '0 auto 24px' }}>
            The live monitoring engine is active and waiting for a spreadsheet to be uploaded. As soon as a file is submitted on the upload page, it will immediately display here.
          </p>
        </div>
      )}

      {/* Dataset Content */}
      {dataset && (
        <>
          {/* Worksheet Tabs (excluding regional summary) */}
          {(() => {
            const visibleSheets = (dataset.sheet_names || []).filter(
              s => !s.toLowerCase().includes('regional')
            );
            if (visibleSheets.length <= 1) return null;
            return (
              <div style={{
                display: 'flex',
                gap: '8px',
                marginBottom: '20px',
                overflowX: 'auto',
                paddingBottom: '4px'
              }}>
                {visibleSheets.map(sheetName => (
                  <button
                    key={sheetName}
                    onClick={() => handleSheetSwitch(sheetName)}
                    className="btn"
                    style={{
                      padding: '8px 16px',
                      borderRadius: 'var(--radius-md)',
                      background: activeSheet === sheetName ? 'var(--primary-light)' : 'var(--bg-surface)',
                      border: activeSheet === sheetName ? '1px solid var(--primary)' : '1px solid var(--border-light)',
                      color: 'var(--text-primary)',
                      fontWeight: 600,
                      fontSize: '0.85rem'
                    }}
                  >
                    <Layers size={14} color={activeSheet === sheetName ? 'var(--primary)' : 'var(--text-muted)'} />
                    <span>{sheetName}</span>
                  </button>
                ))}
              </div>
            );
          })()}

          {/* Interactive Data Table */}
          <div className="table-container" style={{ marginBottom: '20px' }}>
            <table className="custom-table" id="rendered-data-table">
              <thead>
                <tr>
                  <th style={{ width: '50px', textAlign: 'center' }}>#</th>
                  {dataset.headers?.map((header) => {
                    const isSorted = sortConfig.key === header;
                    return (
                      <th
                        key={header}
                        onClick={() => handleSort(header)}
                        style={{ cursor: 'pointer' }}
                        title="Click to sort column"
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span>{header}</span>
                          <span style={{ opacity: isSorted ? 1 : 0.3 }}>
                            {isSorted && sortConfig.direction === 'asc' && <ArrowUp size={14} color="var(--primary)" />}
                            {isSorted && sortConfig.direction === 'desc' && <ArrowDown size={14} color="var(--primary)" />}
                            {!isSorted && <ArrowUpDown size={13} />}
                          </span>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {paginatedRows.length === 0 ? (
                  <tr>
                    <td colSpan={(dataset.headers?.length || 0) + 1} style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
                      No records found in this worksheet.
                    </td>
                  </tr>
                ) : (
                  paginatedRows.map((row, index) => {
                    const rowIndex = (currentPage - 1) * pageSize + index + 1;
                    return (
                      <tr key={index}>
                        <td style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                          {rowIndex}
                        </td>
                        {dataset.headers?.map((header) => (
                          <td key={header}>
                            {renderCellContent(row[header], header)}
                          </td>
                        ))}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 16px',
              background: 'var(--bg-card)',
              border: '1px solid var(--border-light)',
              borderRadius: 'var(--radius-md)',
              flexWrap: 'wrap',
              gap: '12px',
              position: 'fixed',
              left: '20px',
              right: '20px',
              bottom: '16px',
              zIndex: 30,
              boxShadow: 'var(--shadow-md)'
            }}>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                Page {currentPage} of {totalPages}
              </span>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  id="prev-page-btn"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="btn btn-secondary btn-sm"
                >
                  <ChevronLeft size={15} />
                  <span>Previous</span>
                </button>

                {/* Page number buttons */}
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className="btn btn-sm"
                      style={{
                        padding: '4px 10px',
                        background: currentPage === pageNum ? 'var(--primary)' : 'var(--bg-surface)',
                        color: currentPage === pageNum ? '#ffffff' : 'var(--text-primary)',
                        border: '1px solid var(--border-light)',
                        minWidth: '32px'
                      }}
                    >
                      {pageNum}
                    </button>
                  );
                })}

                <button
                  id="next-page-btn"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="btn btn-secondary btn-sm"
                >
                  <span>Next</span>
                  <ChevronRight size={15} />
                </button>
              </div>
            </div>
          )}
        </>
      )}

    </div>
  );
}

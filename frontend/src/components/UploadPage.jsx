import React, { useState, useEffect, useRef } from 'react';
import { 
  UploadCloud, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  Download, 
  Clock, 
  User, 
  RefreshCw,
  X,
  Trash2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';

export default function UploadPage() {
  const navigate = useNavigate();
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploaderName, setUploaderName] = useState('Sales Operations');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const [successData, setSuccessData] = useState(null);
  const [historyList, setHistoryList] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState('');
  const [deletingId, setDeletingId] = useState(null);
  
  const fileInputRef = useRef(null);

  const fetchHistory = async () => {
    try {
      setHistoryLoading(true);
      setHistoryError('');
      const data = await api.getHistory();
      setHistoryList(data);
    } catch (err) {
      console.error('Failed to load history:', err);
      setHistoryError(err.message || 'Failed to load upload history.');
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleDeleteDataset = async (dataset) => {
    if (!window.confirm(`Delete "${dataset.file_name}" from upload history and remove its data?`)) {
      return;
    }

    try {
      setDeletingId(dataset.id);
      setHistoryError('');
      await api.deleteDataset(dataset.id);
      setHistoryList((items) => items.filter((item) => item.id !== dataset.id));
    } catch (err) {
      console.error('Failed to delete dataset:', err);
      setHistoryError(err.message || 'Failed to delete dataset.');
    } finally {
      setDeletingId(null);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const validateAndSetFile = (file) => {
    setErrorMsg('');
    setSuccessData(null);
    if (!file) return;

    const validExtensions = ['.xlsx', '.xls', '.csv', '.xlsm'];
    const lowerName = file.name.toLowerCase();
    const isValid = validExtensions.some(ext => lowerName.endsWith(ext));

    if (!isValid) {
      setErrorMsg('Invalid file type. Please upload an Excel sheet (.xlsx, .xls) or CSV file.');
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      setErrorMsg('File size exceeds 25MB limit.');
      return;
    }

    setSelectedFile(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      setErrorMsg('Please select an Excel or CSV file to upload.');
      return;
    }

    try {
      setIsUploading(true);
      setErrorMsg('');
      setUploadProgress(15);

      const progressInterval = setInterval(() => {
        setUploadProgress(prev => (prev < 85 ? prev + 15 : prev));
      }, 150);

      const response = await api.uploadFile(selectedFile, uploaderName);

      clearInterval(progressInterval);
      setUploadProgress(100);

      setTimeout(() => {
        setIsUploading(false);
        setSuccessData(response.dataset);
        setSelectedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        fetchHistory();
      }, 400);

    } catch (err) {
      setIsUploading(false);
      setUploadProgress(0);
      setErrorMsg(err.message || 'An unexpected error occurred during upload.');
    }
  };

  const handleDownloadSample = () => {
    window.location.href = api.getSampleTemplateUrl();
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '36px 20px' }}>
      
      {/* Top Header Actions */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '28px',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '6px' }}>
            File Upload
          </h1>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>
            Upload Excel sheets (.xlsx, .xls) or CSV files. Updated data will automatically stream to the live monitoring page.
          </p>
        </div>

        <button 
          onClick={handleDownloadSample}
          className="btn btn-secondary btn-sm"
        >
          <Download size={15} />
          <span>Download Excel Template</span>
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '28px' }}>
        
        {/* Upload Form Card */}
        <div className="glass-panel" style={{ padding: '32px' }}>
          <div style={{ marginBottom: '24px' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '6px' }}>
              Select Workbook
            </h2>
            <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)' }}>
              Drag and drop your spreadsheet or browse from your computer.
            </p>
          </div>

          <form onSubmit={handleUploadSubmit}>
            {/* Department / Uploader Name */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                Uploaded By / Department
              </label>
              <div style={{ position: 'relative' }}>
                <User size={16} style={{ position: 'absolute', left: '12px', top: '13px', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  className="custom-input"
                  style={{ width: '100%', paddingLeft: '38px' }}
                  value={uploaderName}
                  onChange={(e) => setUploaderName(e.target.value)}
                  placeholder="e.g. Sales Department, Regional Operations"
                />
              </div>
            </div>

            {/* Drag & Drop Area */}
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current && fileInputRef.current.click()}
              style={{
                border: dragActive 
                  ? '2px dashed var(--primary)' 
                  : selectedFile 
                    ? '2px solid rgba(16, 185, 129, 0.5)' 
                    : '2px dashed var(--border-light)',
                backgroundColor: dragActive 
                  ? 'var(--primary-light)' 
                  : selectedFile 
                    ? 'rgba(16, 185, 129, 0.04)'
                    : 'var(--bg-surface)',
                borderRadius: 'var(--radius-lg)',
                padding: '40px 24px',
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'all var(--transition-normal)',
                marginBottom: '20px',
                position: 'relative'
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls, .csv, .xlsm"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />

              {!selectedFile ? (
                <div>
                  <div style={{
                    width: '60px',
                    height: '60px',
                    borderRadius: '50%',
                    background: 'var(--primary-light)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 16px',
                    color: 'var(--primary)'
                  }} className="animate-float">
                    <UploadCloud size={30} />
                  </div>
                  <h3 style={{ fontSize: '1.02rem', fontWeight: 700, marginBottom: '6px' }}>
                    Drag & Drop your Excel file here
                  </h3>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
                    or click to browse from device (Max 25MB)
                  </p>
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                    <span className="badge badge-primary">.XLSX</span>
                    <span className="badge badge-primary">.XLS</span>
                    <span className="badge badge-primary">.CSV</span>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', textAlign: 'left', padding: '6px 8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '12px',
                      background: 'rgba(16, 185, 129, 0.15)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--success)'
                    }}>
                      <FileSpreadsheet size={22} />
                    </div>
                    <div>
                      <h4 style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                        {selectedFile.name}
                      </h4>
                      <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '2px 0 0' }}>
                        {formatFileSize(selectedFile.size)} • Click to change file
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    style={{
                      background: 'var(--bg-subtle)',
                      border: 'none',
                      borderRadius: '50%',
                      width: '32px',
                      height: '32px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--text-muted)',
                      cursor: 'pointer'
                    }}
                  >
                    <X size={16} />
                  </button>
                </div>
              )}
            </div>

            {/* Error Message */}
            {errorMsg && (
              <div style={{
                background: 'var(--danger-bg)',
                border: '1px solid var(--danger-border)',
                borderRadius: 'var(--radius-md)',
                padding: '12px 16px',
                color: '#b91c1c',
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                marginBottom: '20px'
              }}>
                <AlertCircle size={18} style={{ flexShrink: 0 }} />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Upload Progress Bar */}
            {isUploading && (
              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  <span>Parsing and uploading records...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div style={{ width: '100%', height: '8px', background: 'var(--bg-subtle)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{
                    width: `${uploadProgress}%`,
                    height: '100%',
                    background: 'linear-gradient(90deg, var(--primary) 0%, var(--primary-hover) 100%)',
                    transition: 'width 0.2s ease',
                    borderRadius: '4px'
                  }} />
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              id="upload-submit-btn"
              type="submit"
              disabled={!selectedFile || isUploading}
              className="btn btn-primary"
              style={{ width: '100%', padding: '14px', fontSize: '0.98rem' }}
            >
              {isUploading ? (
                <>
                  <RefreshCw size={18} className="animate-spin" />
                  <span>Processing File...</span>
                </>
              ) : (
                <>
                  <UploadCloud size={18} />
                  <span>Upload & Publish Data</span>
                </>
              )}
            </button>
          </form>

          {/* Success Banner */}
          {successData && (
            <div className="animate-slide-down" style={{
              marginTop: '24px',
              padding: '20px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(16, 185, 129, 0.08)',
              border: '1px solid var(--success-border)'
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '14px' }}>
                <CheckCircle2 size={22} color="var(--success)" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <h4 style={{ fontSize: '0.96rem', fontWeight: 700, color: '#047857', margin: 0 }}>
                    Upload Successful (v{successData.version})
                  </h4>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: '4px 0 0' }}>
                    Successfully extracted <strong>{successData.total_rows} rows</strong> across <strong>{successData.sheet_names?.length || 1} sheet(s)</strong>.
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  id="view-live-data-btn"
                  onClick={() => navigate('/monitor')}
                  className="btn btn-success btn-sm"
                  style={{ width: '100%' }}
                >
                  <span>Open Live Monitoring Page</span>
                  <ArrowRight size={15} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Upload History Column */}
        <div className="glass-panel" style={{ padding: '28px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Clock size={18} color="var(--primary)" />
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>
                Upload History
              </h3>
            </div>
            <button
              onClick={fetchHistory}
              className="btn btn-outline btn-sm"
              style={{ padding: '4px 8px' }}
              title="Refresh history"
            >
              <RefreshCw size={13} className={historyLoading ? 'animate-spin' : ''} />
            </button>
          </div>

          {historyError && (
            <div role="alert" style={{
              background: 'var(--danger-bg)',
              border: '1px solid var(--danger-border)',
              borderRadius: 'var(--radius-md)',
              padding: '10px 12px',
              color: '#b91c1c',
              fontSize: '0.82rem',
              marginBottom: '14px'
            }}>
              {historyError}
            </div>
          )}

          {historyList.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 16px', color: 'var(--text-muted)' }}>
              <FileSpreadsheet size={36} style={{ opacity: 0.35, margin: '0 auto 12px' }} />
              <p style={{ fontSize: '0.88rem' }}>No previous uploads found.</p>
              <p style={{ fontSize: '0.8rem' }}>Uploaded spreadsheets will appear here.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto', flex: 1, maxHeight: '420px' }}>
              {historyList.map((item) => (
                <div
                  key={item.id}
                  style={{
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-light)',
                    borderRadius: 'var(--radius-md)',
                    padding: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    transition: 'border-color var(--transition-fast)'
                  }}
                >
                  <div style={{ minWidth: 0, paddingRight: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span style={{ 
                        fontSize: '0.9rem', 
                        fontWeight: 600, 
                        color: 'var(--text-primary)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        maxWidth: '220px'
                      }}>
                        {item.file_name}
                      </span>
                      <span className="badge badge-primary" style={{ fontSize: '0.65rem', padding: '1px 6px' }}>
                        v{item.version}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      <span>{item.total_rows} rows</span>
                      <span>•</span>
                      <span>{item.uploader_name}</span>
                      <span>•</span>
                      <span>{new Date(item.uploaded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                    <button
                      onClick={() => navigate('/monitor')}
                      className="btn btn-outline btn-sm"
                      style={{ padding: '6px 12px', fontSize: '0.78rem' }}
                    >
                      <span>View Data</span>
                      <ArrowRight size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteDataset(item)}
                      className="btn btn-outline btn-sm"
                      disabled={deletingId === item.id}
                      aria-label={`Delete ${item.file_name}`}
                      title="Delete upload and its records"
                      style={{
                        padding: '6px 8px',
                        color: 'var(--danger)',
                        borderColor: 'var(--danger-border)'
                      }}
                    >
                      {deletingId === item.id
                        ? <RefreshCw size={14} className="animate-spin" />
                        : <Trash2 size={14} />}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

    </div>
  );
}

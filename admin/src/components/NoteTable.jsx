import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import dayjs from 'dayjs';

const NoteTable = ({ 
  notes, 
  loading, 
  filters, 
  pagination, 
  onStatusChange, 
  onPageChange, 
  onReplay 
}) => {
  const getStatusBadgeClass = (status) => {
    return `status-badge status-${status}`;
  };

  const getLastAttemptCode = (note) => {
    if (!note.attempts || note.attempts.length === 0) return '-';
    const lastAttempt = note.attempts[note.attempts.length - 1];
    return lastAttempt.statusCode || 'N/A';
  };

  const formatDate = (dateString) => {
    return dayjs(dateString).format('YYYY-MM-DD HH:mm:ss');
  };

  const truncateText = (text, maxLength = 50) => {
    if (!text) return '-';
    return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
  };

  if (loading) {
    return (
      <div className="table-section">
        <h2>Notes</h2>
        <div className="loading">Loading notes...</div>
      </div>
    );
  }

  return (
    <div className="table-section">
      <h2>Notes</h2>
      
      <div className="filters">
        <label>Filter by status:</label>
        <select 
          value={filters.status} 
          onChange={(e) => onStatusChange(e.target.value)}
        >
          <option value="">All</option>
          <option value="pending">Pending</option>
          <option value="delivered">Delivered</option>
          <option value="failed">Failed</option>
          <option value="dead">Dead</option>
        </select>
      </div>

      {notes.length === 0 ? (
        <div className="loading">No notes found</div>
      ) : (
        <>
          <table className="table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Title</th>
                <th>Status</th>
                <th>Release At</th>
                <th>Last Attempt</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {notes.map((note, index) => (
                  <motion.tr
                    key={note._id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    layout
                  >
                    <td>{note._id}</td>
                    <td>{truncateText(note.title)}</td>
                    <td>
                      <span className={getStatusBadgeClass(note.status)}>
                        {note.status}
                      </span>
                    </td>
                    <td>{formatDate(note.releaseAt)}</td>
                    <td>{getLastAttemptCode(note)}</td>
                    <td>
                      {['failed', 'dead'].includes(note.status) && (
                        <motion.button
                          className="btn btn-secondary"
                          onClick={() => onReplay(note._id)}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          Replay
                        </motion.button>
                      )}
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>

          {pagination && pagination.pages > 1 && (
            <div className="pagination">
              <button
                onClick={() => onPageChange(pagination.page - 1)}
                disabled={pagination.page <= 1}
              >
                Previous
              </button>
              
              {Array.from({ length: pagination.pages }, (_, i) => i + 1).map(page => (
                <button
                  key={page}
                  onClick={() => onPageChange(page)}
                  className={page === pagination.page ? 'current' : ''}
                >
                  {page}
                </button>
              ))}
              
              <button
                onClick={() => onPageChange(pagination.page + 1)}
                disabled={pagination.page >= pagination.pages}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default NoteTable;

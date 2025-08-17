import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import dayjs from 'dayjs';
import NoteForm from './components/NoteForm';
import NoteTable from './components/NoteTable';

// Configure axios defaults
axios.defaults.baseURL = '/api';
axios.defaults.headers.common['Authorization'] = `Bearer ${import.meta.env.VITE_ADMIN_TOKEN || 'your-secret-admin-token-here'}`;

function App() {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [filters, setFilters] = useState({ status: '', page: 1 });
  const [pagination, setPagination] = useState({});

  const fetchNotes = async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.page) params.append('page', filters.page);
      
      const response = await axios.get(`/notes?${params}`);
      setNotes(response.data.notes);
      setPagination(response.data.pagination);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch notes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotes();
  }, [filters]);

  const handleCreateNote = async (data) => {
    setError('');
    setSuccess('');
    try {
      await axios.post('/notes', data);
      setSuccess('Note created successfully!');
      fetchNotes();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create note');
    }
  };

  const handleReplayNote = async (noteId) => {
    setError('');
    setSuccess('');
    try {
      await axios.post(`/notes/${noteId}/replay`);
      setSuccess('Note requeued successfully!');
      fetchNotes();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to replay note');
    }
  };

  const handleStatusChange = (newStatus) => {
    setFilters(prev => ({ ...prev, status: newStatus, page: 1 }));
  };

  const handlePageChange = (newPage) => {
    setFilters(prev => ({ ...prev, page: newPage }));
  };

  return (
    <div className="container">
      <motion.div 
        className="header"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1>DropLater Admin</h1>
        <p>Manage your scheduled notes and webhook deliveries</p>
      </motion.div>

      <AnimatePresence>
        {error && (
          <motion.div 
            className="error"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            {error}
          </motion.div>
        )}
        
        {success && (
          <motion.div 
            className="success"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            {success}
          </motion.div>
        )}
      </AnimatePresence>

      <NoteForm onSubmit={handleCreateNote} />

      <NoteTable 
        notes={notes}
        loading={loading}
        filters={filters}
        pagination={pagination}
        onStatusChange={handleStatusChange}
        onPageChange={handlePageChange}
        onReplay={handleReplayNote}
      />
    </div>
  );
}

export default App;

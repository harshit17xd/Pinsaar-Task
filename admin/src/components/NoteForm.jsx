import React from 'react';
import { useForm } from 'react-hook-form';
import { motion } from 'framer-motion';
import dayjs from 'dayjs';

const NoteForm = ({ onSubmit }) => {
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm();

  const onFormSubmit = async (data) => {
    await onSubmit(data);
    reset();
  };

  return (
    <motion.div 
      className="form-section"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
    >
      <h2>Create New Note</h2>
      <form onSubmit={handleSubmit(onFormSubmit)}>
        <div className="form-group">
          <label htmlFor="title">Title *</label>
          <input
            id="title"
            type="text"
            {...register('title', { 
              required: 'Title is required',
              maxLength: { value: 200, message: 'Title must be less than 200 characters' }
            })}
            placeholder="Enter note title"
          />
          {errors.title && <span className="error">{errors.title.message}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="body">Body *</label>
          <textarea
            id="body"
            {...register('body', { 
              required: 'Body is required',
              maxLength: { value: 1000, message: 'Body must be less than 1000 characters' }
            })}
            placeholder="Enter note content"
          />
          {errors.body && <span className="error">{errors.body.message}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="releaseAt">Release At *</label>
          <input
            id="releaseAt"
            type="datetime-local"
            {...register('releaseAt', { 
              required: 'Release time is required',
              validate: (value) => {
                const selectedDate = dayjs(value);
                return selectedDate.isValid() || 'Invalid date format';
              }
            })}
          />
          {errors.releaseAt && <span className="error">{errors.releaseAt.message}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="webhookUrl">Webhook URL *</label>
          <input
            id="webhookUrl"
            type="url"
            {...register('webhookUrl', { 
              required: 'Webhook URL is required',
              pattern: {
                value: /^https?:\/\/.+/,
                message: 'Must be a valid HTTP/HTTPS URL'
              }
            })}
            placeholder="https://example.com/webhook"
          />
          {errors.webhookUrl && <span className="error">{errors.webhookUrl.message}</span>}
        </div>

        <motion.button
          type="submit"
          className="btn"
          disabled={isSubmitting}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          {isSubmitting ? 'Creating...' : 'Create Note'}
        </motion.button>
      </form>
    </motion.div>
  );
};

export default NoteForm;

'use client';

import React, { useState, useEffect } from 'react';
import { generateFakeJobData } from '@/lib/common/generate-fake-job';

interface JobFormData {
  jobNumber: string;
  streetAddress: string;
  city: string;
  state: string;
  zipCode: string;
  dateStart: string;
  dateEnd: string;
  locationId?: string;
  status: 'pending' | 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
}

interface JobFormProps {
  onSuccess?: () => void;
}

export default function JobForm({ onSuccess }: JobFormProps) {
  const cities = ['Jacksonville', 'Miami', 'Orlando', 'Panama City', 'Tampa'];

  const [formData, setFormData] = useState<JobFormData>({
    jobNumber: '',
    streetAddress: '',
    city: '',
    state: 'FL',
    zipCode: '',
    dateStart: '',
    dateEnd: '',
    status: 'pending',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [successDetails, setSuccessDetails] = useState<{
    jobNumber: string;
    jobId: number;
    poNumbers: string[];
  } | null>(null);

  // Autopopulate form with fake data on mount
  useEffect(() => {
    const fakeData = generateFakeJobData();
    setFormData({
      jobNumber: fakeData.jobNumber,
      streetAddress: fakeData.streetAddress,
      city: fakeData.city,
      state: 'FL',
      zipCode: fakeData.zipCode,
      dateStart: fakeData.startDate,
      dateEnd: fakeData.endDate,
      status: 'pending',
    });
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    // Validation
    if (!formData.jobNumber.trim()) {
      setError('Job number is required');
      return;
    }
    if (!formData.streetAddress.trim()) {
      setError('Street address is required');
      return;
    }
    if (!formData.city.trim()) {
      setError('City is required');
      return;
    }
    if (!formData.state.trim()) {
      setError('State is required');
      return;
    }
    if (!formData.zipCode.trim()) {
      setError('Zip code is required');
      return;
    }
    if (!formData.dateStart.trim()) {
      setError('Date start is required');
      return;
    }
    if (!formData.dateEnd.trim()) {
      setError('Date end is required');
      return;
    }

    try {
      setLoading(true);

      // Calculate locationId based on city index (starting at 1)
      const cityIndex = cities.indexOf(formData.city);

      const payload: any = {
        jobNumber: formData.jobNumber.trim(),
        streetAddress: formData.streetAddress.trim(),
        city: formData.city.trim(),
        state: formData.state.trim(),
        zipCode: formData.zipCode.trim(),
        dateStart: formData.dateStart,
        dateEnd: formData.dateEnd,
        status: formData.status,
      };

      if (cityIndex !== -1) {
        payload.locationId = cityIndex + 1;
      }

      const response = await fetch('/api/jobs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create job');
      }

      const responseData = await response.json();

      // Call the schedule-jobs-assign-installers endpoint after successful job creation
      await fetch('/api/schedule-jobs-assign-installers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      setSuccess(true);
      setSuccessDetails({
        jobNumber: responseData.jobNumber,
        jobId: responseData.jobId,
        poNumbers: responseData.poNumbers || [],
      });
      setFormData({
        jobNumber: '',
        streetAddress: '',
        city: '',
        state: 'FL',
        zipCode: '',
        dateStart: '',
        dateEnd: '',
        status: 'pending',
      });

      // Clear success message after 5 seconds
      setTimeout(() => {
        setSuccess(false);
        setSuccessDetails(null);
      }, 5000);

      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dashboard-section">
      <div className="section-header">Create New Job</div>
      <div className="section-content">
        <form onSubmit={handleSubmit} style={{ maxWidth: '500px' }}>
          {error && (
            <div
              style={{
                padding: '12px',
                marginBottom: '16px',
                backgroundColor: '#FFE5E5',
                color: '#C00',
                borderRadius: '4px',
                fontSize: '13px',
                border: '1px solid #FFB3B3',
              }}
            >
              {error}
            </div>
          )}

          {success && (
            <div
              style={{
                padding: '16px',
                marginBottom: '16px',
                backgroundColor: '#E5F5E5',
                color: '#060',
                borderRadius: '4px',
                fontSize: '13px',
                border: '1px solid #B3FFB3',
              }}
            >
              <div style={{ fontWeight: '600', marginBottom: '8px' }}>Job created successfully!</div>
              {successDetails && (
                <div style={{ lineHeight: '1.6' }}>
                  <div>
                    <strong>Job Number:</strong> {successDetails.jobNumber}
                  </div>
                  <div>
                    <strong>Job ID:</strong> {successDetails.jobId}
                  </div>
                  {successDetails.poNumbers.length > 0 && (
                    <div>
                      <strong>PO Numbers:</strong> {successDetails.poNumbers.join(', ')}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div style={{ marginBottom: '16px' }}>
            <label
              htmlFor="jobNumber"
              style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: 600,
                marginBottom: '6px',
                color: '#333',
              }}
            >
              Job Number *
            </label>
            <input
              type="text"
              id="jobNumber"
              name="jobNumber"
              value={formData.jobNumber}
              onChange={handleChange}
              placeholder="e.g., JOB-2025-001"
              style={{
                width: '100%',
                padding: '8px 10px',
                fontSize: '13px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontFamily: 'inherit',
                boxSizing: 'border-box',
                transition: 'border-color 0.2s',
              }}
              onFocus={(e) => (e.target.style.borderColor = '#0066cc')}
              onBlur={(e) => (e.target.style.borderColor = '#ddd')}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label
              htmlFor="streetAddress"
              style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: 600,
                marginBottom: '6px',
                color: '#333',
              }}
            >
              Street Address *
            </label>
            <input
              type="text"
              id="streetAddress"
              name="streetAddress"
              value={formData.streetAddress}
              onChange={handleChange}
              placeholder="e.g., 123 Main St"
              style={{
                width: '100%',
                padding: '8px 10px',
                fontSize: '13px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontFamily: 'inherit',
                boxSizing: 'border-box',
                transition: 'border-color 0.2s',
              }}
              onFocus={(e) => (e.target.style.borderColor = '#0066cc')}
              onBlur={(e) => (e.target.style.borderColor = '#ddd')}
            />
          </div>

          <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
            <div style={{ flex: 1 }}>
              <label
                htmlFor="city"
                style={{
                  display: 'block',
                  fontSize: '13px',
                  fontWeight: 600,
                  marginBottom: '6px',
                  color: '#333',
                }}
              >
                City *
              </label>
              <select
                id="city"
                name="city"
                value={formData.city}
                onChange={handleChange}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  fontSize: '13px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontFamily: 'inherit',
                  backgroundColor: 'white',
                  cursor: 'pointer',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.2s',
                }}
                onFocus={(e) => (e.target.style.borderColor = '#0066cc')}
                onBlur={(e) => (e.target.style.borderColor = '#ddd')}
              >
                <option value="">Select a city</option>
                <option value="Jacksonville">Jacksonville</option>
                <option value="Miami">Miami</option>
                <option value="Orlando">Orlando</option>
                <option value="Panama City">Panama City</option>
                <option value="Tampa">Tampa</option>
              </select>
            </div>
            <div style={{ flex: 0.5 }}>
              <label
                htmlFor="state"
                style={{
                  display: 'block',
                  fontSize: '13px',
                  fontWeight: 600,
                  marginBottom: '6px',
                  color: '#333',
                }}
              >
                State *
              </label>
              <input
                type="text"
                id="state"
                name="state"
                value={formData.state}
                disabled
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  fontSize: '13px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontFamily: 'inherit',
                  boxSizing: 'border-box',
                  backgroundColor: '#f5f5f5',
                  cursor: 'not-allowed',
                }}
              />
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label
              htmlFor="zipCode"
              style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: 600,
                marginBottom: '6px',
                color: '#333',
              }}
            >
              Zip Code *
            </label>
            <input
              type="text"
              id="zipCode"
              name="zipCode"
              value={formData.zipCode}
              onChange={handleChange}
              placeholder="80202"
              style={{
                width: '100%',
                padding: '8px 10px',
                fontSize: '13px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontFamily: 'inherit',
                boxSizing: 'border-box',
                transition: 'border-color 0.2s',
              }}
              onFocus={(e) => (e.target.style.borderColor = '#0066cc')}
              onBlur={(e) => (e.target.style.borderColor = '#ddd')}
            />
          </div>

          <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
            <div style={{ flex: 1 }}>
              <label
                htmlFor="dateStart"
                style={{
                  display: 'block',
                  fontSize: '13px',
                  fontWeight: 600,
                  marginBottom: '6px',
                  color: '#333',
                }}
              >
                Start Date *
              </label>
              <input
                type="date"
                id="dateStart"
                name="dateStart"
                value={formData.dateStart}
                onChange={handleChange}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  fontSize: '13px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontFamily: 'inherit',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.2s',
                }}
                onFocus={(e) => (e.target.style.borderColor = '#0066cc')}
                onBlur={(e) => (e.target.style.borderColor = '#ddd')}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label
                htmlFor="dateEnd"
                style={{
                  display: 'block',
                  fontSize: '13px',
                  fontWeight: 600,
                  marginBottom: '6px',
                  color: '#333',
                }}
              >
                End Date *
              </label>
              <input
                type="date"
                id="dateEnd"
                name="dateEnd"
                value={formData.dateEnd}
                onChange={handleChange}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  fontSize: '13px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontFamily: 'inherit',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.2s',
                }}
                onFocus={(e) => (e.target.style.borderColor = '#0066cc')}
                onBlur={(e) => (e.target.style.borderColor = '#ddd')}
              />
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label
              htmlFor="status"
              style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: 600,
                marginBottom: '6px',
                color: '#333',
              }}
            >
              Status
            </label>
            <input
              type="text"
              id="status"
              name="status"
              value="Pending"
              disabled
              style={{
                width: '100%',
                padding: '8px 10px',
                fontSize: '13px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontFamily: 'inherit',
                boxSizing: 'border-box',
                backgroundColor: '#f5f5f5',
                cursor: 'not-allowed',
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '10px 16px',
              backgroundColor: loading ? '#999' : '#0066cc',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'background-color 0.2s',
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                (e.target as HTMLButtonElement).style.backgroundColor = '#0052a3';
              }
            }}
            onMouseLeave={(e) => {
              if (!loading) {
                (e.target as HTMLButtonElement).style.backgroundColor = '#0066cc';
              }
            }}
          >
            {loading ? 'Creating...' : 'Create Job'}
          </button>
        </form>
      </div>
    </div>
  );
}

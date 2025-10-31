'use client';

import React, { useEffect, useState } from 'react';

interface Job {
  jobId: number;
  jobNumber: string;
  streetAddress: string;
  city: string;
  state: string;
  status: string;
  createdAt: string;
}

const statusColors: Record<string, string> = {
  pending: '#FFA500',
  scheduled: '#4ECDC4',
  in_progress: '#45B7D1',
  completed: '#52C77E',
  cancelled: '#FF6B6B',
};

export default function JobsList() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    fetchJobs();
  }, [filter]);

  const fetchJobs = async () => {
    try {
      setLoading(true);
      let url = '/api/jobs';
      if (filter !== 'all') {
        url += `?status=${filter}`;
      }
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch jobs');
      const data = await response.json();
      setJobs(data);
    } catch (error) {
      console.error('Error fetching jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadgeColor = (status: string): string => {
    return statusColors[status] || '#999';
  };

  return (
    <div className="dashboard-section">
      <div className="section-header">Active Jobs</div>
      <div className="section-content">
        <div style={{ marginBottom: '12px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <FilterButton
            label="All"
            active={filter === 'all'}
            onClick={() => setFilter('all')}
          />
          <FilterButton
            label="Pending"
            active={filter === 'pending'}
            onClick={() => setFilter('pending')}
          />
          <FilterButton
            label="Scheduled"
            active={filter === 'scheduled'}
            onClick={() => setFilter('scheduled')}
          />
          <FilterButton
            label="In Progress"
            active={filter === 'in_progress'}
            onClick={() => setFilter('in_progress')}
          />
        </div>

        {loading ? (
          <div style={{ padding: '20px', textAlign: 'center', color: '#999' }}>
            Loading jobs...
          </div>
        ) : jobs.length === 0 ? (
          <div style={{ padding: '20px', textAlign: 'center', color: '#999' }}>
            No jobs found
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {jobs.map((job) => (
              <JobCard key={job.jobId} job={job} statusColor={getStatusBadgeColor(job.status)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface JobCardProps {
  job: Job;
  statusColor: string;
}

function JobCard({ job, statusColor }: JobCardProps) {
  return (
    <div
      style={{
        padding: '12px',
        border: '1px solid #e0e0e0',
        borderRadius: '6px',
        backgroundColor: '#fafafa',
        cursor: 'pointer',
        transition: 'background-color 0.2s',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.backgroundColor = '#f0f0f0';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.backgroundColor = '#fafafa';
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: '8px' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: '13px', marginBottom: '4px' }}>
            {job.jobNumber}
          </div>
          <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>
            {job.streetAddress}, {job.city}, {job.state}
          </div>
          <div style={{ fontSize: '11px', color: '#999' }}>
            Created: {new Date(job.createdAt).toLocaleDateString()}
          </div>
        </div>
        <div
          style={{
            padding: '4px 8px',
            borderRadius: '4px',
            backgroundColor: statusColor,
            color: 'white',
            fontSize: '11px',
            fontWeight: 600,
            whiteSpace: 'nowrap',
          }}
        >
          {job.status}
        </div>
      </div>
    </div>
  );
}

interface FilterButtonProps {
  label: string;
  active: boolean;
  onClick: () => void;
}

function FilterButton({ label, active, onClick }: FilterButtonProps) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '6px 12px',
        borderRadius: '4px',
        border: 'none',
        backgroundColor: active ? '#0066cc' : '#e0e0e0',
        color: active ? 'white' : '#333',
        cursor: 'pointer',
        fontSize: '12px',
        fontWeight: 500,
        transition: 'background-color 0.2s',
      }}
    >
      {label}
    </button>
  );
}

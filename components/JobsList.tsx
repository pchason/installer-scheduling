'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';

interface Job {
  jobId: number;
  jobNumber: string;
  streetAddress: string;
  city: string;
  state: string;
  status: string;
  createdAt: string;
}

interface Installer {
  installerId: number;
  firstName: string;
  lastName: string;
  trade: string;
  phone: string;
  email: string;
}

interface JobModalDetails {
  job: Job;
  installers: Installer[];
}

const statusColors: Record<string, string> = {
  pending: '#FFA500',
  scheduled: '#4ECDC4',
  in_progress: '#45B7D1',
  completed: '#52C77E',
  cancelled: '#FF6B6B',
};

const ITEMS_PER_PAGE = 5;

export default function JobsList() {
  const [allJobs, setAllJobs] = useState<Job[]>([]);
  const [displayedJobs, setDisplayedJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [displayCount, setDisplayCount] = useState(ITEMS_PER_PAGE);
  const [showJobModal, setShowJobModal] = useState(false);
  const [jobModalLoading, setJobModalLoading] = useState(false);
  const [jobModalDetails, setJobModalDetails] = useState<JobModalDetails | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const displayCountRef = useRef(ITEMS_PER_PAGE);
  const allJobsRef = useRef<Job[]>([]);

  // Update refs when state changes
  useEffect(() => {
    displayCountRef.current = displayCount;
  }, [displayCount]);

  useEffect(() => {
    allJobsRef.current = allJobs;
  }, [allJobs]);

  // Initial fetch on filter change
  useEffect(() => {
    setDisplayCount(ITEMS_PER_PAGE);
    fetchAllJobs();
  }, [filter]);

  // Update displayed jobs when allJobs or displayCount changes
  useEffect(() => {
    setDisplayedJobs(allJobs.slice(0, displayCount));
  }, [allJobs, displayCount]);

  // Setup scroll listener for lazy loading
  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;

    if (!scrollContainer || displayedJobs.length === 0) {
      return;
    }

    let isLoading = false;

    const handleScroll = () => {
      // Prevent multiple rapid loads
      if (isLoading) return;

      // Check if there are more jobs to load
      if (allJobsRef.current.length <= ITEMS_PER_PAGE) {
        return;
      }

      // Check if user scrolled near the bottom
      const { scrollTop, scrollHeight, clientHeight } = scrollContainer;
      const distanceFromBottom = scrollHeight - (scrollTop + clientHeight);

      // Load more when within 100px of bottom
      if (distanceFromBottom < 100 && displayCountRef.current < allJobsRef.current.length) {
        isLoading = true;

        setDisplayCount((prevCount) => {
          const nextCount = Math.min(prevCount + ITEMS_PER_PAGE, allJobsRef.current.length);
          return nextCount;
        });

        // Reset loading flag after a short delay
        setTimeout(() => {
          isLoading = false;
        }, 500);
      }
    };

    scrollContainer.addEventListener('scroll', handleScroll);

    return () => {
      scrollContainer.removeEventListener('scroll', handleScroll);
    };
  }, [displayedJobs.length]);

  const fetchAllJobs = async () => {
    try {
      setLoading(true);

      let url = '/api/jobs';
      if (filter !== 'all') {
        url += `?status=${filter}`;
      }

      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch jobs');
      const data = await response.json();
      // console.log('Fetched jobs:', JSON.stringify(data, null, 2));
      setAllJobs(data);
      setDisplayCount(ITEMS_PER_PAGE);
    } catch (error) {
      console.error('Error fetching jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadgeColor = (status: string): string => {
    return statusColors[status] || '#999';
  };

  const handleJobClick = async (job: Job) => {
    setJobModalLoading(true);
    setShowJobModal(true);

    try {
      // Fetch job details and assigned installers
      const bookingsRes = await fetch(`/api/bookings?jobId=${job.jobId}`);
      if (!bookingsRes.ok) throw new Error('Failed to fetch bookings');

      const bookingsData = await bookingsRes.json();

      // Extract unique installers from bookings
      const installerIds = new Set<number>();
      const installerDetailsMap = new Map<number, Installer>();

      // Get all unique installer IDs from bookings
      bookingsData.forEach((booking: any) => {
        const keys = Object.keys(booking);
        const assignmentKey = keys.find((key) => booking[key].installerId !== undefined && booking[key].scheduleId !== undefined);
        if (assignmentKey) {
          installerIds.add(booking[assignmentKey].installerId);
        }
      });

      // Fetch details for each installer
      const installerPromises = Array.from(installerIds).map((id) =>
        fetch(`/api/installers/${id}`)
          .then((res) => res.json())
          .then((data) => {
            installerDetailsMap.set(id, data);
          })
          .catch((error) => console.error(`Failed to fetch installer ${id}:`, error))
      );

      await Promise.all(installerPromises);

      setJobModalDetails({
        job,
        installers: Array.from(installerDetailsMap.values()),
      });

      setJobModalLoading(false);
    } catch (error) {
      console.error('Error fetching job details:', error);
      setJobModalLoading(false);
      setShowJobModal(false);
      alert('Failed to load job details');
    }
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
        ) : displayedJobs.length === 0 ? (
          <div style={{ padding: '20px', textAlign: 'center', color: '#999' }}>
            No jobs found
          </div>
        ) : (
          <div
            ref={scrollContainerRef}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              maxHeight: '400px',
              overflowY: 'auto',
              paddingRight: '8px',
            }}
          >
            {displayedJobs.map((job) => (
              <JobCard key={job.jobId} job={job} statusColor={getStatusBadgeColor(job.status)} onJobClick={handleJobClick} />
            ))}
            {allJobs.length > ITEMS_PER_PAGE && displayCount < allJobs.length && (
              <div
                style={{
                  padding: '16px',
                  textAlign: 'center',
                  color: '#999',
                  fontSize: '12px',
                }}
              >
                Scroll for more
              </div>
            )}
          </div>
        )}
      </div>

      {/* Job Modal Dialog */}
      {showJobModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000,
          }}
          onClick={() => !jobModalLoading && setShowJobModal(false)}
        >
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '8px',
              padding: '30px',
              maxWidth: '600px',
              width: '90%',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
              maxHeight: '80vh',
              overflowY: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {jobModalLoading ? (
              <div style={{ textAlign: 'center', minHeight: '300px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <div style={{ marginBottom: '20px' }}>
                  <div
                    style={{
                      width: '50px',
                      height: '50px',
                      border: '4px solid #f3f3f3',
                      borderTop: '4px solid #0066cc',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite',
                      margin: '0 auto',
                    }}
                  />
                </div>
                <p style={{ color: '#666', fontSize: '14px' }}>Loading job details...</p>
              </div>
            ) : jobModalDetails ? (
              <>
                <h2 style={{ marginTop: 0, marginBottom: '20px', color: '#333' }}>
                  Job Details
                </h2>

                <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f9f9f9', borderRadius: '6px' }}>
                  <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', fontWeight: 'bold', color: '#555', marginBottom: '4px', fontSize: '12px' }}>
                      Job ID
                    </label>
                    <p style={{ margin: 0, fontSize: '14px', color: '#333' }}>
                      {jobModalDetails.job.jobId}
                    </p>
                  </div>

                  <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', fontWeight: 'bold', color: '#555', marginBottom: '4px', fontSize: '12px' }}>
                      Job Number
                    </label>
                    <p style={{ margin: 0, fontSize: '14px', color: '#333' }}>
                      {jobModalDetails.job.jobNumber}
                    </p>
                  </div>

                  <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', fontWeight: 'bold', color: '#555', marginBottom: '4px', fontSize: '12px' }}>
                      Address
                    </label>
                    <p style={{ margin: 0, fontSize: '14px', color: '#333' }}>
                      {jobModalDetails.job.streetAddress}, {jobModalDetails.job.city}, {jobModalDetails.job.state}
                    </p>
                  </div>

                  <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', fontWeight: 'bold', color: '#555', marginBottom: '4px', fontSize: '12px' }}>
                      Status
                    </label>
                    <div style={{
                      display: 'inline-block',
                      padding: '4px 12px',
                      borderRadius: '4px',
                      backgroundColor: getStatusBadgeColor(jobModalDetails.job.status),
                      color: 'white',
                      fontSize: '12px',
                      fontWeight: 'bold',
                    }}>
                      {jobModalDetails.job.status}
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontWeight: 'bold', color: '#555', marginBottom: '4px', fontSize: '12px' }}>
                      Created
                    </label>
                    <p style={{ margin: 0, fontSize: '14px', color: '#333' }}>
                      {new Date(jobModalDetails.job.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <h3 style={{ marginTop: '25px', marginBottom: '15px', color: '#333' }}>
                  Assigned Installers ({jobModalDetails.installers.length})
                </h3>

                {jobModalDetails.installers.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {jobModalDetails.installers.map((installer) => (
                      <div key={installer.installerId} style={{ padding: '12px', backgroundColor: '#f9f9f9', borderRadius: '6px', borderLeft: '4px solid #0066cc' }}>
                        <div style={{ marginBottom: '8px' }}>
                          <p style={{ margin: 0, fontWeight: 'bold', fontSize: '14px', color: '#333' }}>
                            {installer.firstName} {installer.lastName}
                          </p>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '12px' }}>
                          <div>
                            <label style={{ fontWeight: 'bold', color: '#666', display: 'block', marginBottom: '2px' }}>Trade</label>
                            <p style={{ margin: 0, color: '#333' }}>{installer.trade.charAt(0).toUpperCase() + installer.trade.slice(1)}</p>
                          </div>
                          <div>
                            <label style={{ fontWeight: 'bold', color: '#666', display: 'block', marginBottom: '2px' }}>Phone</label>
                            <p style={{ margin: 0, color: '#333' }}>{installer.phone}</p>
                          </div>
                          <div style={{ gridColumn: '1 / -1' }}>
                            <label style={{ fontWeight: 'bold', color: '#666', display: 'block', marginBottom: '2px' }}>Email</label>
                            <p style={{ margin: 0, color: '#333' }}>{installer.email}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ color: '#999', fontSize: '14px', textAlign: 'center', padding: '20px' }}>
                    No installers assigned to this job yet.
                  </p>
                )}

                <button
                  onClick={() => setShowJobModal(false)}
                  style={{
                    marginTop: '25px',
                    backgroundColor: '#4CAF50',
                    color: 'white',
                    border: 'none',
                    padding: '10px 20px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 'bold',
                  }}
                >
                  Close
                </button>
              </>
            ) : null}
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

interface JobCardProps {
  job: Job;
  statusColor: string;
  onJobClick: (job: Job) => void;
}

function JobCard({ job, statusColor, onJobClick }: JobCardProps) {
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
      onClick={() => onJobClick(job)}
    >
      <div style={{ fontSize: '11px', color: '#999', marginBottom: '6px', fontWeight: 500 }}>
        Job {job.jobId}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: '8px' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: '13px', marginBottom: '4px' }}>
            Job #: {job.jobNumber}
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

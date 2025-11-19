'use client';

import React, { useEffect, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';

interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end?: string;
  backgroundColor?: string;
  borderColor?: string;
  extendedProps?: {
    installerId?: number;
    installerName?: string;
    jobId?: number;
    jobNumber?: string;
    trade?: string;
    assignmentId?: number;
  };
}

interface ModalDetails {
  installerName: string;
  installerLocation: string;
  jobAddress: string;
  poNumber: string;
  trade: string;
  measurement: string;
  measurementLabel: string;
}

export default function Calendar() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalDetails, setModalDetails] = useState<ModalDetails | null>(null);
  const [modalLoading, setModalLoading] = useState(false);

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/bookings');
      if (!response.ok) throw new Error('Failed to fetch bookings');

      const data = await response.json();

      // Transform bookings to FullCalendar events
      const calendarEvents: CalendarEvent[] = data
        .filter((booking: any) => {
          // Ensure both objects exist before processing
          return booking && Object.keys(booking).length >= 2;
        })
        .map((booking: any) => {
          // Drizzle innerJoin returns { table1: {...}, table2: {...} }
          // The keys are the table names, so we need to find them dynamically
          const keys = Object.keys(booking);
          const scheduleKey = keys.find((key) => booking[key].scheduledDate !== undefined);
          const assignmentKey = keys.find((key) => booking[key].installerId !== undefined && booking[key].scheduleId !== undefined);
          const installerKey = keys.find((key) => booking[key].firstName !== undefined && booking[key].lastName !== undefined);

          if (!scheduleKey || !assignmentKey) {
            return null;
          }

          const schedule = booking[scheduleKey];
          const assignment = booking[assignmentKey];
          const installer = installerKey ? booking[installerKey] : null;

          // Generate installer initials
          let initials = '';
          if (installer && installer.firstName && installer.lastName) {
            initials = `${installer.firstName.charAt(0)}${installer.lastName.charAt(0)}`.toUpperCase();
          }

          return {
            id: `booking-${assignment.assignmentId}`,
            title: `Installer ${initials} ${assignment.installerId} - Job ID ${schedule.jobId}`,
            start: `${schedule.scheduledDate}T08:00:00`,
            end: `${schedule.scheduledDate}T17:00:00`,
            backgroundColor: getTradeColor(schedule.jobId),
            borderColor: getTradeColor(schedule.jobId),
            extendedProps: {
              installerId: assignment.installerId,
              jobId: schedule.jobId,
              scheduleId: schedule.scheduleId,
            },
          };
        })
        .filter((event: CalendarEvent | null) => event !== null) as CalendarEvent[];

      setEvents(calendarEvents);
    } catch (error) {
      console.error('Error fetching bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTradeColor = (jobId: number | undefined): string => {
    // Assign colors based on job ID for now
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8'] as const;
    if (!jobId) return colors[0] as string;
    return colors[jobId % colors.length] as string;
  };

  const handleEventClick = async (info: any) => {
    const { installerId, jobId } = info.event.extendedProps;

    setModalLoading(true);
    setShowModal(true);

    try {
      // Fetch installer and job details to show in modal
      const [installerRes, jobRes] = await Promise.all([
        fetch(`/api/installers/${installerId}`),
        fetch(`/api/jobs/${jobId}`)
      ]);

      if (!installerRes.ok || !jobRes.ok) throw new Error('Failed to fetch details');

      const installer = await installerRes.json();
      const job = await jobRes.json();

      // Get the purchase order with measurements for this job
      const poRes = await fetch(`/api/purchase-orders?jobId=${jobId}`);
      const poData = await poRes.json();

      if (!installer || !installer.firstName) {
        throw new Error('Installer not found');
      }
      const installerName = `${installer.firstName} ${installer.lastName}`;
      const trade = installer.trade;

      // Get installer location name (from the geographic locations)
      let installerLocation = 'N/A';
      if (installer.locations && installer.locations.length > 0) {
        installerLocation = installer.locations[0].locationName || 'N/A';
      }

      // Get job address
      const jobAddress = job ? `${job.streetAddress}, ${job.city}, ${job.state} ${job.zipCode}` : 'N/A';

      // Find the PO number and measurement based on trade type
      let measurement = 'N/A';
      let measurementLabel = 'Measurement';
      let poNumber = 'N/A';

      if (Array.isArray(poData) && poData.length > 0) {
        // Find the purchase order that has data for this trade
        for (const po of poData) {
          if (trade === 'trim' && po.trimLinearFeet) {
            const trimValue = parseFloat(po.trimLinearFeet);
            if (!isNaN(trimValue) && trimValue > 0) {
              measurement = `${trimValue} linear feet`;
              measurementLabel = 'Linear Feet';
              poNumber = po.poNumber;
              break;
            }
          } else if (trade === 'stairs' && po.stairRisers) {
            if (po.stairRisers > 0) {
              measurement = `${po.stairRisers} risers`;
              measurementLabel = 'Stair Risers';
              poNumber = po.poNumber;
              break;
            }
          } else if (trade === 'doors' && po.doorCount) {
            if (po.doorCount > 0) {
              measurement = `${po.doorCount} doors`;
              measurementLabel = 'Door Count';
              poNumber = po.poNumber;
              break;
            }
          }
        }
      }

      setModalDetails({
        installerName,
        installerLocation,
        jobAddress,
        poNumber,
        trade: trade.charAt(0).toUpperCase() + trade.slice(1),
        measurement,
        measurementLabel,
      });

      setModalLoading(false);
    } catch (error) {
      console.error('Error fetching details:', error);
      setModalLoading(false);
      alert('Failed to load installer details');
      setShowModal(false);
    }
  };

  return (
    <div className="dashboard-section">
      <div className="section-header">Schedule Calendar</div>
      <div className="section-content">
        {loading ? (
          <div style={{ padding: '20px', textAlign: 'center', color: '#999' }}>
            Loading calendar...
          </div>
        ) : (
          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: 'dayGridMonth,timeGridWeek,timeGridDay',
            }}
            events={events}
            eventClick={handleEventClick}
            height="auto"
            contentHeight="auto"
            editable={false}
            selectable={true}
            dayMaxEvents={3}
            eventDisplay="block"
            eventTimeFormat={{
              hour: 'numeric',
              minute: '2-digit',
              meridiem: false,
              omitZeroMinute: true,
            }}
            slotLabelFormat={{
              meridiem: false,
              omitZeroMinute: true,
            }}
            eventDidMount={(info) => {
              (info.el as HTMLElement).style.cursor = 'pointer';
              // Hide the time element in the event
              const timeEl = info.el.querySelector('.fc-event-time') as HTMLElement;
              if (timeEl) {
                timeEl.style.display = 'none';
              }
            }}
          />
        )}
      </div>

      {/* Modal Dialog */}
      {showModal && (
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
          onClick={() => !modalLoading && setShowModal(false)}
        >
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '8px',
              padding: '30px',
              maxWidth: '500px',
              width: '90%',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
              minHeight: '300px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {modalLoading ? (
              <div style={{ textAlign: 'center' }}>
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
                <p style={{ color: '#666', fontSize: '14px' }}>Loading installer details...</p>
              </div>
            ) : modalDetails ? (
              <>
                <h2 style={{ marginTop: 0, marginBottom: '20px', color: '#333' }}>
                  Installer Details
                </h2>

                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontWeight: 'bold', color: '#555', marginBottom: '8px' }}>
                    Installer Name
                  </label>
                  <p style={{ margin: 0, fontSize: '16px', color: '#333' }}>
                    {modalDetails.installerName}
                  </p>
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontWeight: 'bold', color: '#555', marginBottom: '8px' }}>
                    Installer Location
                  </label>
                  <p style={{ margin: 0, fontSize: '16px', color: '#333' }}>
                    {modalDetails.installerLocation}
                  </p>
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontWeight: 'bold', color: '#555', marginBottom: '8px' }}>
                    Job Address
                  </label>
                  <p style={{ margin: 0, fontSize: '16px', color: '#333' }}>
                    {modalDetails.jobAddress}
                  </p>
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontWeight: 'bold', color: '#555', marginBottom: '8px' }}>
                    PO Number
                  </label>
                  <p style={{ margin: 0, fontSize: '16px', color: '#333' }}>
                    {modalDetails.poNumber}
                  </p>
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontWeight: 'bold', color: '#555', marginBottom: '8px' }}>
                    Trade
                  </label>
                  <p style={{ margin: 0, fontSize: '16px', color: '#333' }}>
                    {modalDetails.trade}
                  </p>
                </div>

                <div style={{ marginBottom: '30px' }}>
                  <label style={{ display: 'block', fontWeight: 'bold', color: '#555', marginBottom: '8px' }}>
                    {modalDetails.measurementLabel}
                  </label>
                  <p style={{ margin: 0, fontSize: '16px', color: '#333' }}>
                    {modalDetails.measurement}
                  </p>
                </div>

                <button
                  onClick={() => setShowModal(false)}
                  style={{
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

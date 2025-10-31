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
  };
}

export default function Calendar() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);

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
      const calendarEvents: CalendarEvent[] = data.map((booking: any) => {
        const jobSchedules = booking.job_schedules;

        return {
          id: `booking-${booking.installer_assignments.assignment_id}`,
          title: `${booking.installer_assignments.installer_id} - ${booking.job_schedules.job_id}`,
          start: `${booking.job_schedules.scheduled_date}T08:00:00`,
          end: `${booking.job_schedules.scheduled_date}T17:00:00`,
          backgroundColor: getTradeColor(booking.job_schedules.job_id),
          borderColor: getTradeColor(booking.job_schedules.job_id),
          extendedProps: {
            installerId: booking.installer_assignments.installer_id,
            jobId: booking.job_schedules.job_id,
          },
        };
      });

      setEvents(calendarEvents);
    } catch (error) {
      console.error('Error fetching bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTradeColor = (jobId: number): string => {
    // Assign colors based on job ID for now
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8'];
    return colors[jobId % colors.length];
  };

  const handleEventClick = (info: any) => {
    const { installerId, jobId } = info.event.extendedProps;
    console.log(`Clicked: Installer ${installerId}, Job ${jobId}`);
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
          />
        )}
      </div>
    </div>
  );
}

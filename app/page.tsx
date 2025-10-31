'use client';

import Link from 'next/link';
import Calendar from '@/components/Calendar';
import JobsList from '@/components/JobsList';
import Chat from '@/components/Chat';

export default function Home() {
  return (
    <div className="dashboard">
      <div style={{ gridColumn: '1 / -1', marginBottom: '10px' }}>
        <Link
          href="/job/create"
          style={{
            display: 'inline-block',
            padding: '10px 16px',
            backgroundColor: '#0066cc',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '4px',
            fontSize: '13px',
            fontWeight: 600,
            transition: 'background-color 0.2s',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLAnchorElement).style.backgroundColor = '#0052a3';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLAnchorElement).style.backgroundColor = '#0066cc';
          }}
        >
          + Create New Job
        </Link>
      </div>
      <Calendar />
      <JobsList />
      <Chat />
    </div>
  );
}

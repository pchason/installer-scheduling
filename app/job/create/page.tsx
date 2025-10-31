'use client';

import { useRouter } from 'next/navigation';
import JobForm from '@/components/JobForm';

export default function CreateJobPage() {
  const router = useRouter();

  const handleSuccess = () => {
    setTimeout(() => {
      router.push('/');
    }, 1500);
  };

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
      <div style={{ marginBottom: '20px' }}>
        <button
          onClick={() => router.back()}
          style={{
            padding: '8px 16px',
            backgroundColor: '#e0e0e0',
            color: '#333',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: 500,
            transition: 'background-color 0.2s',
          }}
          onMouseEnter={(e) => {
            (e.target as HTMLButtonElement).style.backgroundColor = '#d0d0d0';
          }}
          onMouseLeave={(e) => {
            (e.target as HTMLButtonElement).style.backgroundColor = '#e0e0e0';
          }}
        >
          ← Back
        </button>
      </div>
      <JobForm onSuccess={handleSuccess} />
    </div>
  );
}

export default function Home() {
  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <h1>Installer Scheduling API</h1>
      <p>Version: 1.0.0</p>
      <h2>API Endpoints:</h2>
      <ul>
        <li>
          <a href="/api/health">/api/health</a> - Health check
        </li>
        <li>
          <a href="/api">/api</a> - API info
        </li>
        <li>
          <strong>/api/installers</strong> - Manage installers
        </li>
        <li>
          <strong>/api/bookings</strong> - Manage bookings
        </li>
        <li>
          <strong>/api/locations</strong> - Manage locations
        </li>
        <li>
          <strong>/api/chat</strong> - Chat with AI agent
        </li>
      </ul>
    </div>
  );
}

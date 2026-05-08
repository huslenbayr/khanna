const AdminPanel = () => {
  return (
    <div style={{ padding: '2rem' }}>
      <h1>Admin Panel</h1>
      <p style={{ color: 'var(--text-muted)' }}>Developer tools to manage POIs, team units, AI filters and reports.</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
        <div className="glass-panel" style={{ padding: '1rem' }}>
          <h3>Points of Interest</h3>
          <p style={{ color: 'var(--text-muted)' }}>Create, edit or remove important locations.</p>
          <button className="glass-button">Add POI</button>
        </div>

        <div className="glass-panel" style={{ padding: '1rem' }}>
          <h3>Teams</h3>
          <p style={{ color: 'var(--text-muted)' }}>Manage teams and trackers.</p>
          <button className="glass-button">Add Team</button>
        </div>

        <div className="glass-panel" style={{ padding: '1rem' }}>
          <h3>AI Filters</h3>
          <p style={{ color: 'var(--text-muted)' }}>Tweak automation thresholds and tagging rules.</p>
          <button className="glass-button">Open AI Console</button>
        </div>
      </div>
    </div>
  )
}

export default AdminPanel

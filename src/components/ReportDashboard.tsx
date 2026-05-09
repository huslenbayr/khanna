import { AlertTriangle, CheckCircle2, ShieldAlert, Cpu } from 'lucide-react';

type ReportSeverity = 'low' | 'medium' | 'high'

type IncidentReport = {
  id: number
  type: string
  desc: string
  time: string
  severity: ReportSeverity
  aiTag: string
}

const ReportDashboard = () => {
  const reports: IncidentReport[] = [
    { id: 1, type: 'Maintenance', desc: 'Street light outage reported near Seoul Street', time: '2m ago', severity: 'low', aiTag: 'Verified' },
    { id: 2, type: 'Traffic', desc: 'High density near Peace Avenue. Potential bottleneck.', time: '5m ago', severity: 'high', aiTag: 'Urgent Action' },
    { id: 3, type: 'Medical', desc: 'Minor injury reported near Central Tower', time: '12m ago', severity: 'medium', aiTag: 'Dispatched' },
    { id: 4, type: 'Security', desc: 'Suspicious access attempt near service corridor', time: '20m ago', severity: 'high', aiTag: 'Resolved' },
  ];

  return (
    <div className="glass-panel overlay-panel animate-fade-in" style={{
      top: '2rem', right: '2rem', width: '400px', maxHeight: '80vh', overflowY: 'auto', padding: '1.5rem',
      display: 'flex', flexDirection: 'column', gap: '1rem'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-glass)', paddingBottom: '0.75rem' }}>
        <h2 style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <AlertTriangle size={24} color="var(--accent)" /> AI Incident Reports
        </h2>
        <span style={{ fontSize: '0.75rem', background: 'rgba(74, 222, 128, 0.2)', color: 'var(--primary)', padding: '0.2rem 0.5rem', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          <Cpu size={14} /> AI Active
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {reports.map(report => (
          <div key={report.id} style={{
            background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border-glass)', borderRadius: '8px', padding: '1rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: '600', color: report.severity === 'high' ? 'var(--accent)' : (report.severity === 'medium' ? '#fbbf24' : 'var(--text-muted)') }}>
                {report.type}
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{report.time}</span>
            </div>
            <p style={{ fontSize: '0.9rem', marginBottom: '0.75rem', lineHeight: '1.4' }}>{report.desc}</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {report.aiTag === 'Resolved' || report.aiTag === 'Verified' ? 
                <CheckCircle2 size={16} color="var(--primary)" /> : 
                <ShieldAlert size={16} color="var(--accent)" />
              }
              <span style={{ fontSize: '0.75rem', color: 'var(--text-main)', opacity: 0.8 }}>AI Status: {report.aiTag}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ReportDashboard;

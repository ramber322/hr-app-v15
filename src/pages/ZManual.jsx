export default function ZManual() {
  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC', fontFamily: "'Inter', 'Segoe UI', sans-serif", 
      color: '#1E293B', padding: '48px 24px', display: 'flex', justifyContent: 'center'}}>
      
      <div style={{ 
        maxWidth: '720px', width: '100%', display: 'flex', flexDirection: 'column', gap: '32px' }}>

        {/* STARTUP */}
        <section>
          <h2 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 12px 0' }}>PDS</h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <pre style={{ background: '#1E293B', color: '#E2E8F0', padding: '12px 16px', borderRadius: '8px', fontSize: '13px', fontFamily: 'monospace', margin: 0, overflowX: 'auto' }}>
                venv\Scripts\activate
              </pre>
            </div>

            <div>
              <pre style={{ background: '#1E293B', color: '#E2E8F0', padding: '12px 16px', borderRadius: '8px', fontSize: '13px', fontFamily: 'monospace', margin: 0, overflowX: 'auto' }}>
                python -m uvicorn main:app --reload
              </pre>
            </div>

            <div>
              <pre style={{ background: '#1E293B', color: '#E2E8F0', padding: '12px 16px', borderRadius: '8px', fontSize: '13px', fontFamily: 'monospace', margin: 0, overflowX: 'auto' }}>
                src/services: emailService.js, smsService.js, - 0, TXTBEE HOST
              </pre>
            </div>
          </div>

        </section>

        {/* SURVEY */}
        <section>
          <h2 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 8px 0' }}>Survey Questionnaire</h2>
          <a 
            href="https://forms.gle/WVeD2CR1KYjTsNUt5" 
            target="_blank" 
            rel="noopener noreferrer"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: '#4F46E5', color: 'white', 
              padding: '16px 20px', borderRadius: '10px', textDecoration: 'none',
              fontWeight: 600, fontSize: '14px',
              transition: 'background 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#4338CA'}
            onMouseLeave={(e) => e.currentTarget.style.background = '#4F46E5'}
          >
            <span>Open Survey Form</span>
            <span style={{ fontSize: '18px' }}>↗</span>
          </a>
           <p>https://forms.gle/WVeD2CR1KYjTsNUt5</p>
        </section>

       
{/* DOWNLOADS */}
<section>
  <h2 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 8px 0' }}>Downloadables</h2>
  

  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
    {[
      { name: 'PDF Form (TOR)', file: '/downloads/transcript-of-records.pdf', type: 'PDF' },
      { name: 'PDF Form (Performance Rating)', file: '/downloads/performance rating.pdf', type: 'PDF' },
      { name: 'Bachelor-3yrs-10TH', file: '/downloads/CSC (Bachelor)-(3yrs)-(PROF)-(10TH).xlsx', type: 'XLSX' },
      { name: 'Master-4yrs-30TH', file: '/downloads/CSC (Master)-(4yrs)-(PROF)-(30TH).xlsx', type: 'XLSX' },
    ].map((f) => (
      <a
        key={f.file}
        href={f.file}
        download
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          background: 'white',
          border: '1px solid #E2E8F0',
          borderRadius: '8px',
          textDecoration: 'none',
          color: '#1E293B',
          fontSize: '13px',
          fontWeight: 500,
          transition: 'all 0.15s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = '#F8FAFC';
          e.currentTarget.style.borderColor = '#4F46E5';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'white';
          e.currentTarget.style.borderColor = '#E2E8F0';
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{
            fontSize: '10px',
            fontWeight: 700,
            padding: '2px 8px',
            borderRadius: '4px',
            background: f.type === 'PDF' ? '#FEF2F2' : '#F0FDF4',
            color: f.type === 'PDF' ? '#B91C1C' : '#15803D',
            border: `1px solid ${f.type === 'PDF' ? '#FEE2E2' : '#BBF7D0'}`,
          }}>
            {f.type}
          </span>
          {f.name}
        </span>
        <span style={{ color: '#4F46E5', fontSize: '16px' }}>↓</span>
      </a>
    ))}
  </div>
</section>
       

      </div>
    </div>
  );
}
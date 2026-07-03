const base = 'http://localhost:5001';
const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MiwibXNzaWQiOiJNU1MwMDAwMDAwIiwicm9sZSI6ImNvb3JkaW5hdG9yIiwiaWF0IjoxNzgzMDUyOTE5LCJleHAiOjE3ODMwNTY1MTl9.av-qIS1wQbXxE4SwegAxhfPEjSGAPfq8QXkmQLMrgfU';

async function run() {
  try {
    const studentsRes = await fetch(`${base}/api/coordinator/students`, { headers: { Authorization: `Bearer ${token}` } });
    const studentsJson = await studentsRes.json().catch(() => null);
    if (!studentsJson || !studentsJson.data) {
      console.error('Failed to load students:', studentsRes.status, studentsJson);
      process.exit(2);
    }
    const students = studentsJson.data || [];
    console.log(`Found ${students.length} students; testing up to 20`);
    const sample = students.slice(0, 20);
    const results = [];
    for (const s of sample) {
      const mssid = s.mssid || s.mss || s.id || 'UNKNOWN';
      const url = `${base}/api/coordinator/report-card/${encodeURIComponent(String(mssid))}`;
      const t0 = Date.now();
      try {
        const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
        const json = await r.json().catch(() => null);
        const ok = r.status === 200 && json && json.success === true && json.data && json.data.student;
        results.push({ mssid, status: r.status, ok, durationMs: Date.now() - t0 });
        console.log(`mssid=${mssid} status=${r.status} ok=${ok} time=${Date.now()-t0}ms`);
      } catch (err) {
        console.error(`mssid=${mssid} fetch error:`, err.message);
        results.push({ mssid, status: 'ERR', ok: false, error: err.message });
      }
    }
    const failed = results.filter(r => !r.ok);
    console.log('\nSummary:');
    console.log(`Total tested: ${results.length}`);
    console.log(`Passed: ${results.length - failed.length}`);
    console.log(`Failed: ${failed.length}`);
    if (failed.length > 0) console.log('Failures:', failed);
    process.exit(0);
  } catch (err) {
    console.error('Script error:', err);
    process.exit(3);
  }
}

run();

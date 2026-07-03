import React, { useEffect, useState } from 'react';
import { FiDownload } from 'react-icons/fi';
import api from '../services/api';

const colleges = ['Vasavi', 'CBIT', 'KMIT', 'Vardhaman', 'Narayanamma', 'BVRIT', 'IIIT Hyderabad', 'Other'];
const yearOptions = [
  { label: '1st Year', value: '1' },
  { label: '2nd Year', value: '2' },
  { label: '3rd Year', value: '3' },
  { label: '4th Year', value: '4' },
];

const getStudentTag = (student) => {
  if (student.year_of_study) return `${student.year_of_study} ${student.department || ''}`.trim();
  return student.year || student.year_of_study || 'Year not set';
};

const resolveScore = (student) => {
  if (student.avg_smart_score != null) return Number(student.avg_smart_score).toFixed(1);
  if (student.coding_score != null) return student.coding_score;
  if (student.best_smart_score != null) return student.best_smart_score;
  return 'N/A';
};

const resolveGoalCompletion = (student) => {
  if (student.goal_completion_percent != null) return `${student.goal_completion_percent}%`;
  if (student.overall_goal_completion != null) return `${student.overall_goal_completion}%`;
  if (student.overallGoalPercent != null) return `${student.overallGoalPercent}%`;
  return 'N/A';
};

const formatValue = (value) => {
  if (value == null || value === '') return 'No Data Available';
  return String(value);
};

const sectionCard = (title, icon, children) => (
  <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
    <div className="flex items-center gap-3 mb-4">
      <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-50 text-slate-700 text-xl">{icon}</span>
      <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
    </div>
    {children}
  </div>
);

const CoordinatorReportCards = () => {
  const [college, setCollege] = useState('');
  const [year, setYear] = useState('');
  const [students, setStudents] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadStudents = async () => {
      setLoading(true);
      try {
        const res = await api.get('/coordinator/students');
        setStudents(res.data.data || []);
      } catch (err) {
        console.error('Failed to load coordinator students:', err);
        setError('Unable to load student list.');
        setStudents([]);
      } finally {
        setLoading(false);
      }
    };
    loadStudents();
  }, []);

  const handleViewStudents = () => {
    setStudentsLoading(true);
    try {
      const normalizedYear = String(year || '').toLowerCase();
      const matching = students.filter((student) => {
        const studentCollege = String(student.college_name || student.college || '').toLowerCase();
        const studentYear = String(student.year_of_study || student.year || '').toLowerCase();
        return (
          (college ? studentCollege === college.toLowerCase() : true) &&
          (year ? studentYear.includes(normalizedYear) : true)
        );
      });
      setFilteredStudents(matching);
    } finally {
      setStudentsLoading(false);
    }
  };

  const createPopupWindow = (title, width = 1000, height = 900) => {
    console.log('createPopupWindow:', title, { width, height });
    const win = window.open('about:blank', '_blank', `width=${width},height=${height}`);
    if (!win) {
      console.error('Popup window blocked for', title);
      return null;
    }
    try {
      win.document.open();
      win.document.write(`<!DOCTYPE html><html><head><title>${title}</title></head><body style="font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 0; padding: 24px; color: #334155;"><p>Loading report...</p></body></html>`);
      win.document.close();
      win.focus();
    } catch (err) {
      console.error('Error initializing popup window', err);
    }
    return win;
  };

  const writePopupError = (win, title, details) => {
    if (!win || win.closed) return;
    try {
      const safeDetails = typeof details === 'string' ? details : JSON.stringify(details, null, 2);
      win.document.open();
      win.document.write(`<!DOCTYPE html><html><head><title>${title}</title></head><body style="font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 24px; color: #334155;"><h2>${title}</h2><pre style="white-space:pre-wrap;">${safeDetails}</pre></body></html>`);
      win.document.close();
      win.focus();
    } catch (err) {
      console.error('writePopupError failed:', err);
    }
  };

  const handlePrintWindowLoad = (win) => {
    if (!win || win.closed) {
      console.error('handlePrintWindowLoad: invalid window');
      return;
    }
    let printed = false;
    const doPrint = () => {
      if (printed || !win || win.closed) return;
      printed = true;
      console.log('handlePrintWindowLoad: calling window.print()');
      try {
        win.print();
      } catch (err) {
        console.error('Print failed:', err);
      }
    };
    win.addEventListener('load', () => {
      console.log('Print window load event fired');
      doPrint();
    });
    setTimeout(() => {
      if (!printed && win && !win.closed) {
        console.warn('Print fallback timeout triggered');
        doPrint();
      }
    }, 750);
  };

  const renderReportWindow = (win, data, generated, autoPrint = false) => {
    if (!win || win.closed) {
      console.error('renderReportWindow: popup window is not available');
      return;
    }
    console.log('renderReportWindow: building report HTML', { autoPrint, mssid: data?.student?.mssid });
    const html = buildReportHtml(data, generated, autoPrint);
    try {
      if (autoPrint) {
        handlePrintWindowLoad(win);
      }
      win.document.open();
      win.document.write(html);
      win.document.close();
      win.focus();
    } catch (err) {
      console.error('renderReportWindow failed:', err);
      if (win && !win.closed) {
        try {
          win.document.body.innerHTML = '<p>Unable to render report.</p>';
        } catch (writeErr) {
          console.error('Failed to show fallback error in popup:', writeErr);
        }
      }
    }
  };

  const downloadPDF = async (studentMssid) => {
    if (!studentMssid) return;
    setError(null);
    console.log('Download button clicked for', studentMssid);

    const win = createPopupWindow(`Download Report Card - ${studentMssid}`, 900, 800);
    if (!win) {
      setError('Popup blocked. Allow popups for download.');
      return;
    }

    try {
      const url = `/coordinator/report-card/${encodeURIComponent(studentMssid.trim().toUpperCase())}`;
      console.log('Fetching report card for download:', url);
      const res = await api.get(url);
      console.log('Download API response status:', res.status, 'data:', res.data);
      const data = res.data?.data || null;
      if (!data) {
        // Try a dev-only direct-backend fallback (helps when Vite proxy isn't configured)
        if (window && window.location && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
          try {
            const fallback = await fetch(`http://localhost:5001/api/coordinator/report-card/${encodeURIComponent(studentMssid.trim().toUpperCase())}`, { headers: { Authorization: `Bearer ${localStorage.getItem('mct_token')}` } });
            const fallbackJson = await fallback.json().catch(() => null);
            if (fallbackJson && fallbackJson.data) {
              const now = new Date();
              const generated = now.toLocaleString();
              renderReportWindow(win, fallbackJson.data, generated, true);
              return;
            }
          } catch (e) {
            console.warn('Fallback fetch failed', e);
          }
        }

        const detail = res.data || { status: res.status };
        setError('No report data available.');
        writePopupError(win, 'Unable to load report data', detail);
        return;
      }
      const now = new Date();
      const generated = now.toLocaleString();
      renderReportWindow(win, data, generated, true);
    } catch (err) {
      console.error('Download report failed:', err);
      setError('Unable to generate PDF.');
      if (win && !win.closed) {
        const details = (err && err.response && err.response.data) ? err.response.data : (err.message || String(err));
        writePopupError(win, 'Download failed', details);
      }
    }
  };

  const printReportPreview = async (studentMssid) => {
    if (!studentMssid) return;
    setError(null);
    console.log('Preview button clicked for', studentMssid);

    const win = createPopupWindow(`Preview Report Card - ${studentMssid}`, 1000, 900);
    if (!win) {
      setError('Popup blocked. Allow popups for preview.');
      return;
    }

    try {
      const url = `/coordinator/report-card/${encodeURIComponent(studentMssid.trim().toUpperCase())}`;
      console.log('Fetching report card for preview:', url);
      const res = await api.get(url);
      console.log('Preview API response status:', res.status, 'data:', res.data);
      const data = res.data?.data || null;
      if (!data) {
        // Try dev-only fallback to direct backend host before failing
        if (window && window.location && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
          try {
            const fallback = await fetch(`http://localhost:5001/api/coordinator/report-card/${encodeURIComponent(studentMssid.trim().toUpperCase())}`, { headers: { Authorization: `Bearer ${localStorage.getItem('mct_token')}` } });
            const fallbackJson = await fallback.json().catch(() => null);
            if (fallbackJson && fallbackJson.data) {
              const now = new Date();
              const generated = now.toLocaleString();
              renderReportWindow(win, fallbackJson.data, generated, false);
              return;
            }
          } catch (e) {
            console.warn('Fallback fetch failed', e);
          }
        }

        const detail = res.data || { status: res.status };
        setError('No report data available.');
        writePopupError(win, 'Unable to load preview data', detail);
        return;
      }
      const now = new Date();
      const generated = now.toLocaleString();
      renderReportWindow(win, data, generated, false);
    } catch (err) {
      console.error('Preview report failed:', err);
      setError('Unable to preview report.');
      if (win && !win.closed) {
        const details = (err && err.response && err.response.data) ? err.response.data : (err.message || String(err));
        writePopupError(win, 'Preview failed', details);
      }
    }
  };

  const openReportPreview = (data) => {
    const win = window.open('', '_blank', 'width=1000,height=900');
    if (!win) return;
    const now = new Date();
    const generated = now.toLocaleString();
    const html = buildReportHtml(data, generated, false);
    win.document.write(html);
    win.document.close();
    win.focus();
  };

  const printReport = (data) => {
    const now = new Date();
    const generated = now.toLocaleString();
    const html = buildReportHtml(data, generated, true);
    const win = window.open('', '_blank', 'width=900,height=800');
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.focus();
    win.print();
  };

  const buildReportHtml = (data, generated, autoPrint = false) => {
    console.log('buildReportHtml called', { mssid: data?.student?.mssid, autoPrint });
    const student = data.student || {};
    const personal = data.personal || {};
    const academic = data.academic || {};
    const family = data.family || {};
    const siblings = data.siblings || [];
    const semesters = data.semesters || [];
    const volunteering = data.volunteering || [];
    const goals = data.goals || [];
    const coding = data.coding || [];
    const codingAnalytics = data.codingAnalytics || {};
    const contestHistory = data.contestHistory || [];
    const codingHistory = data.codingHistory || [];
    const projects = data.projects || [];
    const certifications = data.certifications || [];
    const achievements = data.achievements || [];
    const placements = data.placements || [];
    const resume = data.resume || null;

    const overallCodingScore = codingAnalytics.avgCodingScore ?? codingAnalytics.bestCodingScore ?? (coding[0]?.coding_score ?? 'N/A');
    const overallGoalCompletion = formatValue(data.goal_completion_percent ?? data.overall_goal_completion ?? data.overallGoalPercent ?? 'No Data Available');
    const placementReadiness = data.placement_readiness_score ?? 'No Data Available';
    const overallMctScore = data.overall_mct_score ?? data.placement_readiness_score ?? 'No Data Available';

    const reportHtml = `
      <html>
      <head>
        <title>MCT Report Card - ${personal.full_name || student.mssid || 'Student'}</title>
        <style>
          body { font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 0; padding: 0; color: #334155; background: #f8fafc; }
          .page { width: 100%; padding: 28px 32px; box-sizing: border-box; }
          .section { page-break-inside: avoid; margin-bottom: 24px; border-radius: 24px; overflow: hidden; border: 1px solid #e2e8f0; background: #ffffff; }
          .header { background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); color: #f8fafc; padding: 32px; display: flex; gap: 24px; align-items: center; }
          .profile-photo { width: 120px; height: 120px; border-radius: 24px; background: #cbd5e1; display: flex; align-items: center; justify-content: center; font-size: 48px; color: #0f172a; }
          .header .header-text { flex: 1; }
          .tag-grid { display: grid; grid-template-columns: repeat(auto-fit,minmax(180px,1fr)); gap: 12px; margin-top: 18px; }
          .tag { background: rgba(241,245,249,0.9); color: #0f172a; padding: 14px 16px; border-radius: 16px; font-size: 14px; }
          .section-title { margin: 0; font-size: 18px; font-weight: 700; }
          .section-body { padding: 24px 28px; }
          .field-grid { display: grid; grid-template-columns: repeat(auto-fit,minmax(220px,1fr)); gap: 16px; }
          .field { padding: 14px; border-radius: 16px; background: #f8fafc; border: 1px solid #e2e8f0; }
          .field-label { margin: 0 0 6px; font-size: 12px; letter-spacing: .08em; text-transform: uppercase; color: #64748b; }
          .field-value { margin: 0; font-size: 15px; font-weight: 600; color: #0f172a; }
          .row { display: flex; flex-wrap: wrap; gap: 12px; }
          .card-row { border-radius: 20px; border: 1px solid #e2e8f0; padding: 18px; margin-bottom: 14px; background: #f8fafc; }
          .table { width: 100%; border-collapse: collapse; margin-top: 12px; }
          .table th, .table td { padding: 12px 10px; border: 1px solid #e2e8f0; text-align: left; vertical-align: top; font-size: 13px; }
          .table th { background: #e2e8f0; font-weight: 700; }
          .badge { display: inline-block; border-radius: 999px; background: #e2e8f0; color: #0f172a; padding: 6px 10px; font-size: 12px; margin: 2px 0; }
          .footer { text-align: center; font-size: 12px; color: #64748b; padding: 18px 0 0; }
          .section-slim { padding: 20px 24px; }
          .section-accent { background: #eef2ff; }
        </style>
      </head>
      <body>
        <div class="page">
          <div class="section">
            <div class="header">
              <div class="profile-photo">${personal.full_name ? personal.full_name.charAt(0) : 'M'}</div>
              <div class="header-text">
                <h1 style="margin:0;font-size:32px;">${personal.full_name || student.mssid || 'Student'}</h1>
                <p style="margin:10px 0 0;font-size:14px;color:#cbd5e1;">MCT Student Report Card</p>
                <div class="tag-grid">
                  <div class="tag">MSS ID: ${formatValue(student.mssid)}</div>
                  <div class="tag">College: ${formatValue(academic.college_name || student.college_name || student.college)}</div>
                  <div class="tag">Batch: ${formatValue(student.mss_batch || student.batch)}</div>
                  <div class="tag">Year: ${formatValue(student.year_of_study || student.year)}</div>
                  <div class="tag">Role: ${formatValue(personal.role || student.role || 'Student')}</div>
                  <div class="tag">Generated: ${generated}</div>
                </div>
              </div>
              <div style="min-width:220px;">
                <div style="border-radius:24px;background:#0f172a;padding:20px;color:#fff;">
                  <p style="margin:0;font-size:12px;letter-spacing:.08em;text-transform:uppercase;">Coding Score</p>
                  <p style="margin:8px 0 0;font-size:32px;font-weight:700;">${overallCodingScore}</p>
                </div>
                <div style="margin-top:14px;border-radius:24px;background:#1e293b;padding:20px;color:#fff;">
                  <p style="margin:0;font-size:12px;letter-spacing:.08em;text-transform:uppercase;">Goal Completion</p>
                  <p style="margin:8px 0 0;font-size:20px;font-weight:700;">${overallGoalCompletion}</p>
                </div>
                <div style="margin-top:14px;border-radius:24px;background:#063970;padding:20px;color:#fff;">
                  <p style="margin:0;font-size:12px;letter-spacing:.08em;text-transform:uppercase;">Placement Readiness</p>
                  <p style="margin:8px 0 0;font-size:20px;font-weight:700;">${formatValue(placementReadiness)}</p>
                </div>
                <div style="margin-top:14px;border-radius:24px;background:#065f46;padding:20px;color:#fff;">
                  <p style="margin:0;font-size:12px;letter-spacing:.08em;text-transform:uppercase;">Overall MCT Score</p>
                  <p style="margin:8px 0 0;font-size:20px;font-weight:700;">${formatValue(overallMctScore)}</p>
                </div>
              </div>
            </div>
          </div>
          ${renderSection('Personal Information', '<FiUser />', `
            <div class="field-grid">
              ${renderField('Full Name', personal.full_name || student.full_name)}
              ${renderField('Gender', personal.gender)}
              ${renderField('DOB', personal.date_of_birth ? new Date(personal.date_of_birth).toLocaleDateString() : '')}
              ${renderField('Email', personal.email)}
              ${renderField('Phone', personal.phone)}
              ${renderField('Address', personal.address)}
            </div>
          `)}
          ${renderSection('Family Information', '👥', `
            <div class="field-grid">
              ${renderField("Father's Name", family.father_name)}
              ${renderField("Father's Occupation", family.father_occupation)}
              ${renderField("Mother's Name", family.mother_name)}
              ${renderField("Mother's Occupation", family.mother_occupation)}
            </div>
          `)}
          ${renderSection('Sibling Information', '👤', `${siblings.length === 0 ? '<p>No Data Available</p>' : `
            <div class="table-wrapper"><table class="table"><thead><tr><th>Name</th><th>Education</th><th>Occupation</th></tr></thead><tbody>${siblings.map(s => `<tr><td>${formatValue(s.sibling_name)}</td><td>${formatValue(s.education)}</td><td>${formatValue(s.occupation)}</td></tr>`).join('')}</tbody></table></div>
          `}`)}
          ${renderSection('Academic Details', '📘', `<div class="field-grid">
              ${renderField('College', academic.college_name || student.college_name || student.college)}
              ${renderField('Department', academic.department)}
              ${renderField('Degree', academic.degree)}
              ${renderField('Year of Study', academic.year_of_study ? `Year ${academic.year_of_study}` : student.year)}
              ${renderField('CGPA', academic.cgpa ? `${academic.cgpa} / 10` : '')}
              ${renderField('Backlogs', academic.backlogs)}
              ${renderField('Roll No', academic.rollno)}
              ${renderField('Admission Year', academic.admission_year)}
              ${renderField('Passout Year', academic.passout_year)}
            </div>`) }
          ${renderSection('Mentor Details', '🛡️', `<div class="field-grid">
              ${renderField('Mentor Name', personal.mentor_name)}
              ${renderField('Mentor Email', personal.mentor_email)}
              ${renderField('Mentor Phone', personal.mentor_phone)}
              ${renderField('Block', personal.block_name)}
            </div>`) }
          ${renderSection('Goals', '🎯', `${goals.length === 0 ? '<p>No Data Available</p>' : goals.map(g => `
            <div class="card-row">
              <h3 style="margin:0 0 10px;font-size:15px;font-weight:700;">${formatValue(g.title)}</h3>
              <p style="margin:0 0 8px;color:#475569;">${formatValue(g.description)}</p>
              <div style="display:flex;gap:12px;flex-wrap:wrap;">${renderFieldInline('Progress', `${g.progressStats?.average ?? g.progress_percentage ?? g.progress ?? 'N/A'}%`)}${renderFieldInline('Status', g.status || 'N/A')}</div>
              ${renderTopicList(g.topics || [], 'Topics')}
            </div>
          `).join('')}`)}
          ${renderSection('Coding Profiles', '💻', `${coding.length === 0 ? '<p>No Data Available</p>' : coding.map(c => `
            <div class="card-row">
              <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:14px;flex-wrap:wrap;">
                <div>
                  <div style="font-weight:700;font-size:15px;">${formatValue(c.platform)}</div>
                  <div style="margin-top:8px;color:#475569;font-size:13px;">Username: ${formatValue(c.username)}</div>
                  <div style="color:#475569;font-size:13px;">Profile: ${c.profile_url ? `<a href='${c.profile_url}' target='_blank' style='color:#2563eb;text-decoration:none;'>Open</a>` : 'No Data Available'}</div>
                </div>
                <div style="display:grid;gap:8px;text-align:right;">
                  <div style="font-size:13px;color:#64748b;">Rating</div><div style="font-weight:700;">${formatValue(c.rating)}</div>
                  <div style="font-size:13px;color:#64748b;">Smart Score</div><div style="font-weight:700;">${formatValue(c.coding_score)}</div>
                </div>
              </div>
            </div>
          `).join('')}`)}
          ${renderSection('Coding Analytics', '📊', `${Object.keys(codingAnalytics).length === 0 ? '<p>No Data Available</p>' : `
            <div class="field-grid">
              ${renderField('Profiles Synced', codingAnalytics.platformProfiles?.length)}
              ${renderField('Average Coding Score', codingAnalytics.avgCodingScore)}
              ${renderField('Best Coding Score', codingAnalytics.bestCodingScore)}
              ${renderField('Problems Solved', codingAnalytics.totals?.totalProblemsSolved)}
              ${renderField('Contests Attended', codingAnalytics.totals?.totalContests)}
              ${renderField('Active Platforms', codingAnalytics.totals?.platformCount)}
            </div>
          `}`)}
          ${renderSection('Contest History', '🏅', `${contestHistory.length === 0 ? '<p>No Data Available</p>' : `
            <div class="table-wrapper"><table class="table"><thead><tr><th>Platform</th><th>Contest</th><th>Rank</th><th>Rating Change</th><th>Problems Solved</th><th>Date</th></tr></thead><tbody>${contestHistory.map(item => `<tr><td>${formatValue(item.platform)}</td><td>${formatValue(item.contestName || item.contest_name)}</td><td>${formatValue(item.rank)}</td><td>${formatValue(item.ratingChange ?? item.rating_change)}</td><td>${formatValue(item.problemsSolved ?? item.problems_solved)}</td><td>${item.contestDate ? new Date(item.contestDate).toLocaleDateString() : 'No Data Available'}</td></tr>`).join('')}</tbody></table></div>
          `}`)}
          ${renderSection('Projects', '💼', `${projects.length === 0 ? '<p>No Data Available</p>' : projects.map(p => `
            <div class="card-row">
              <h3 style="margin:0 0 8px;font-size:15px;font-weight:700;">${formatValue(p.title)}</h3>
              <p style="margin:0 0 10px;color:#475569;">${formatValue(p.description)}</p>
              <div style="display:flex;flex-wrap:wrap;gap:12px;">${renderFieldInline('Tech Stack', p.tech_stack)}${renderFieldInline('GitHub', p.github_url ? `<a href='${p.github_url}' target='_blank' style='color:#2563eb;text-decoration:none;'>Link</a>` : 'No Data Available')} ${renderFieldInline('Live Link', p.live_url ? `<a href='${p.live_url}' target='_blank' style='color:#2563eb;text-decoration:none;'>Live</a>` : 'No Data Available')}</div>
            </div>
          `).join('')}`)}
          ${renderSection('Certifications', '🛡️', `${certifications.length === 0 ? '<p>No Data Available</p>' : certifications.map(c => `
            <div class="card-row">
              <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;">
                <div>
                  <div style="font-weight:700;font-size:15px;">${formatValue(c.title)}</div>
                  <div style="font-size:13px;color:#475569;">${formatValue(c.issuing_organization)}</div>
                </div>
                <div style="font-size:13px;color:#64748b;">${formatValue(c.issue_date)}</div>
              </div>
            </div>
          `).join('')}`)}
          ${renderSection('Achievements', '🏅', `${achievements.length === 0 ? '<p>No Data Available</p>' : achievements.map(a => `
            <div class="card-row">
              <div style="font-weight:700;font-size:15px;">${formatValue(a.title)}</div>
              <div style="font-size:13px;color:#475569;">${formatValue(a.category)}</div>
            </div>
          `).join('')}`)}
          ${renderSection('Placements', '💼', `${placements.length === 0 ? '<p>No Data Available</p>' : placements.map(p => `
            <div class="card-row">
              <div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;">
                <div>
                  <div style="font-weight:700;font-size:15px;">${formatValue(p.company_name)}</div>
                  <div style="font-size:13px;color:#475569;">${formatValue(p.role)}</div>
                </div>
                <div style="text-align:right;font-size:13px;color:#64748b;">${formatValue(p.status)} · ${formatValue(p.package_lpa ? `${p.package_lpa} LPA` : 'No Data Available')}</div>
              </div>
            </div>
          `).join('')}`)}
          ${renderSection('Volunteering', '❤️', `${volunteering.length === 0 ? '<p>No Data Available</p>' : volunteering.map(v => `
            <div class="card-row">
              <div>
                <div style="font-weight:700;font-size:15px;">${formatValue(v.title)}</div>
                <div style="font-size:13px;color:#475569;">${formatValue(v.organization)}</div>
                <div style="margin-top:8px;font-size:13px;color:#64748b;">${formatValue(v.description)}</div>
              </div>
              <div style="text-align:right;font-size:13px;color:#64748b;">${formatValue(v.hours ? `${v.hours} hrs` : 'No Data Available')}</div>
            </div>
          `).join('')}`)}
          ${renderSection('Resume', '📄', resume ? `
            <div class="field-grid">
              ${renderField('File Name', resume.file_name)}
              ${renderField('Uploaded', resume.uploaded_at ? new Date(resume.uploaded_at).toLocaleDateString() : '')}
              ${renderField('Download', resume.file_path ? `<a href='${resume.file_path}' target='_blank' style='color:#2563eb;text-decoration:none;'>Download Resume</a>` : '')}
            </div>
          ` : '<p>No Data Available</p>')}
          <div class="footer">Generated by MCT Student Performance Tracking System • ${generated}</div>
        </div>
      </body>
      </html>
    `;
    return reportHtml;
  };

  const renderField = (label, value) => `
    <div class="field">
      <div class="field-label">${label}</div>
      <div class="field-value">${formatValue(value)}</div>
    </div>
  `;

  const renderFieldInline = (label, value) => `
    <div style="min-width:220px;background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:12px;">
      <div style="font-size:11px;text-transform:uppercase;color:#64748b;letter-spacing:.08em;margin-bottom:4px;">${label}</div>
      <div style="font-weight:700;color:#0f172a;">${formatValue(value)}</div>
    </div>
  `;

  const renderTopicList = (topics, title) => {
    if (!topics || topics.length === 0) return '<p style="color:#64748b;">No topics available</p>';
    return `
      <div style="display:grid;gap:10px;">
        ${topics.map((topic) => `<div style="padding:12px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:14px;"><div style="font-weight:700;color:#0f172a;">${formatValue(topic.topic_name)}</div><div style="font-size:13px;color:#475569;">Progress: ${formatValue(topic.progress_percentage ?? topic.progress ?? topic.progress_percent ?? 'N/A')}%</div></div>`).join('')}
      </div>
    `;
  };

  const renderSection = (title, icon, content) => `
    <div class="section section-slim">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;"><div style="width:36px;height:36px;border-radius:14px;background:#eef2ff;color:#4338ca;display:flex;align-items:center;justify-content:center;font-size:18px;">${icon}</div><h2 style="margin:0;font-size:18px;font-weight:700;color:#0f172a;">${title}</h2></div>
      <div>${content}</div>
    </div>
  `;

  return (
    <div className="space-y-8">
      <div className="panel-header">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Coordinator toolkit</p>
          <h1 className="page-title">MCT Report Cards</h1>
          <p className="panel-subtitle">Generate polished student report cards using existing academic, coding and placement records.</p>
        </div>
      </div>

      <div className="panel-grid lg:grid-cols-[1.4fr_0.6fr]">
        <div className="card">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Filters</p>
              <h2 className="mt-2 panel-title">Select a cohort</h2>
            </div>
            <span className="overview-pill">Report Generator</span>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">College</label>
              <select value={college} onChange={(e) => setCollege(e.target.value)} className="input-field">
                <option value="">Select college</option>
                {colleges.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Year</label>
              <select value={year} onChange={(e) => setYear(e.target.value)} className="input-field">
                <option value="">Select year</option>
                {yearOptions.map((item) => (
                  <option key={item.value} value={item.value}>{item.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1 text-sm text-slate-600">
              <p className="font-semibold text-slate-900">Build report cards</p>
              <p>Choose filters and click View Students to display matching student records.</p>
            </div>
            <button
              type="button"
              disabled={!college || !year}
              onClick={handleViewStudents}
              className="btn-primary rounded-2xl px-6 py-3 disabled:cursor-not-allowed disabled:opacity-50"
            >
              View Students
            </button>
          </div>
        </div>

        <div className="metric-card-strong">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Report builder</p>
          <h2 className="mt-3 text-2xl font-semibold">Official student portfolio reports</h2>
          <p className="mt-4 text-sm leading-6 text-slate-300">Use this module to generate detailed, printable report cards with student performance metrics and academic summaries.</p>

          <div className="mt-6 grid gap-3">
            <div className="rounded-3xl bg-white/10 p-4 text-slate-200">
              <p className="text-sm">Filter driven. No MSS ID entry required.</p>
            </div>
            <div className="rounded-3xl bg-white/10 p-4 text-slate-200">
              <p className="text-sm">Cards include coding score, goal completion, batch, and placement readiness.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Student roster</p>
            <h2 className="mt-2 panel-title">Matching students</h2>
          </div>
          <div className="text-sm text-slate-600">{filteredStudents.length} student{filteredStudents.length !== 1 ? 's' : ''} selected</div>
        </div>

        {studentsLoading ? (
          <div className="mt-6 text-center text-slate-500">Loading matching students…</div>
        ) : filteredStudents.length === 0 ? (
          <div className="mt-6 rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-slate-500">No matching students yet. Select college and year then click View Students.</div>
        ) : (
          <div className="mt-6 grid gap-4 xl:grid-cols-2">
            {filteredStudents.map((student) => (
              <div key={student.id || student.mssid} className="group rounded-[28px] border border-slate-200 bg-slate-50 p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm uppercase tracking-[0.24em] text-slate-500">{student.college_name || student.college || 'College not set'}</p>
                    <h3 className="mt-2 text-xl font-semibold text-slate-900">{student.full_name || student.mssid}</h3>
                    <p className="mt-1 text-sm text-slate-600">{student.mssid || 'MSS ID unavailable'}</p>
                  </div>
                  <div className="rounded-3xl bg-white px-4 py-3 text-sm font-semibold text-slate-900 shadow-sm">{resolveScore(student)}</div>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <ReportField label="Year" value={student.year_of_study || student.year || 'N/A'} />
                  <ReportField label="Batch" value={student.mss_batch || student.batch || 'N/A'} />
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <ReportField label="Current Coding Score" value={resolveScore(student)} />
                  <ReportField label="Goal Completion" value={resolveGoalCompletion(student)} />
                </div>

                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => printReportPreview(student.mssid)}
                    className="btn-secondary w-full"
                  >
                    Preview Report
                  </button>
                  <button
                    type="button"
                    onClick={() => downloadPDF(student.mssid)}
                    className="btn-secondary w-full"
                  >
                    <FiDownload className="h-4 w-4" /> Download Report Card
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {loading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40">
          <div className="rounded-3xl bg-white px-6 py-5 shadow-xl">Loading…</div>
        </div>
      )}
    </div>
  );
};

const SectionGroup = ({ title, icon, children }) => (
  <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
    <div className="mb-5 flex items-center gap-3">
      <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700 text-xl">{icon}</div>
      <div>
        <p className="text-sm font-semibold text-slate-900">{title}</p>
      </div>
    </div>
    {children}
  </div>
);

const ReportField = ({ label, value }) => (
  <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
    <p className="text-xs uppercase tracking-[0.24em] text-slate-400">{label}</p>
    <p className="mt-2 text-sm font-semibold text-slate-900">{formatValue(value)}</p>
  </div>
);

const ProgressBar = ({ label, value }) => {
  const percent = Number(value) > 100 ? 100 : Number(value) < 0 ? 0 : Number(value);
  return (
    <div>
      <div className="flex items-center justify-between text-sm text-slate-500">
        <span>{label}</span>
        <span>{isNaN(percent) ? 'N/A' : `${percent}%`}</span>
      </div>
      <div className="mt-2 h-3 overflow-hidden rounded-full bg-slate-200">
        <div className="h-full rounded-full bg-gradient-to-r from-slate-900 to-slate-500" style={{ width: isNaN(percent) ? '0%' : `${percent}%` }} />
      </div>
    </div>
  );
};

const ReportChip = ({ label, value }) => (
  <div className="rounded-3xl bg-slate-50 p-3 text-sm text-slate-700">
    <p className="text-xs uppercase tracking-[0.18em] text-slate-400">{label}</p>
    <p className="mt-1 font-semibold text-slate-900">{typeof value === 'string' || typeof value === 'number' ? formatValue(value) : value}</p>
  </div>
);

export default CoordinatorReportCards;

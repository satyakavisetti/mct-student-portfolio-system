#!/usr/bin/env node
/*
  Test script to fetch student volunteering details using existing DB config.
  Usage: node scripts/test_volunteering_query.js <studentId>
*/
const path = require('path');
const { query } = require('../src/config/database');

const studentId = process.argv[2] ? Number(process.argv[2]) : null;

if (!studentId) {
  console.error('Usage: node scripts/test_volunteering_query.js <studentId>');
  process.exit(1);
}

async function run(id) {
  try {
    const studentResult = await query(
      `SELECT s.id, s.mssid, COALESCE(pd.full_name, '') AS full_name, COALESCE(s.college_name, '') AS college_name, COALESCE(ad.year_of_study, s.year) AS year_of_study, s.mss_batch
       FROM students s
       LEFT JOIN personal_details pd ON pd.student_id = s.id
       LEFT JOIN academic_details ad ON ad.student_id = s.id
       WHERE s.id = $1 LIMIT 1`,
      [id]
    );

    if (studentResult.rows.length === 0) {
      console.log('Student not found for id', id);
      process.exit(0);
    }

    const volunteeringRes = await query(
      'SELECT id, title, organization, role, description, start_date, end_date, hours, category, certificate_url, certificate_path, created_at, updated_at FROM volunteering WHERE student_id = $1 ORDER BY start_date DESC NULLS LAST, id DESC',
      [id]
    );

    const student = studentResult.rows[0];
    const activities = volunteeringRes.rows || [];
    const totalHours = activities.reduce((sum, a) => sum + Number(a.hours || 0), 0);
    const remaining = Math.max(0, 20 - totalHours);
    const eligibility = totalHours >= 20 ? 'Eligible' : 'Not Eligible';

    console.log(JSON.stringify({ student, summary: { totalHours, remaining, eligibility, activityCount: activities.length }, activities }, null, 2));
    process.exit(0);
  } catch (err) {
    console.error('Error running volunteering test:', err.stack || err.message || err);
    process.exit(2);
  }
}

run(studentId);

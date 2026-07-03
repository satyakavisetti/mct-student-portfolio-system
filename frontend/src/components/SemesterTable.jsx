import React, { useMemo } from 'react';

const gradePoints = {
  'A+': 10, A: 9, B: 8, C: 7, D: 6, E: 5, F: 0,
};

const toNumber = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
const getGradePoint = (grade, rawMarks) => {
  if (gradePoints[grade] !== undefined) return gradePoints[grade];
  if (rawMarks >= 90) return 10;
  if (rawMarks >= 80) return 9;
  if (rawMarks >= 70) return 8;
  if (rawMarks >= 60) return 7;
  if (rawMarks >= 50) return 6;
  if (rawMarks >= 45) return 5;
  return 0;
};

const SemesterTable = ({ subjects = [], onChange, onSave, onDelete }) => {
  const totals = useMemo(() => {
    let sumPoints = 0, sumCredits = 0;
    subjects.forEach((s) => {
      const credits = toNumber(s.credits);
      const rawMarks = clamp(toNumber(s.semester_marks), 0, 100);
      const points = getGradePoint(s.grade, rawMarks);
      sumPoints += points * credits;
      sumCredits += credits;
    });
    const sgpa = sumCredits ? (sumPoints / sumCredits) : 0;
    return { sumPoints, sumCredits, sgpa };
  }, [subjects]);

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-gray-500">
            <th className="p-2">Subject</th>
            <th className="p-2">Mid1</th>
            <th className="p-2">Mid2</th>
            <th className="p-2">Sem Marks</th>
            <th className="p-2">Grade</th>
            <th className="p-2">Credits</th>
            <th className="p-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {subjects.map((s) => (
            <tr key={s.id} className="border-t">
              <td className="p-2"><input className="input-field" value={s.subject_name} onChange={(e) => onChange(s.id, 'subject_name', e.target.value)} /></td>
              <td className="p-2"><input type="number" min="0" step="0.5" className="input-field" value={s.mid1_marks ?? ''} onChange={(e) => onChange(s.id, 'mid1_marks', e.target.value)} /></td>
              <td className="p-2"><input type="number" min="0" step="0.5" className="input-field" value={s.mid2_marks ?? ''} onChange={(e) => onChange(s.id, 'mid2_marks', e.target.value)} /></td>
              <td className="p-2"><input type="number" min="0" max="100" step="0.5" className="input-field" value={s.semester_marks ?? ''} onChange={(e) => onChange(s.id, 'semester_marks', e.target.value)} /></td>
              <td className="p-2"><input className="input-field" value={s.grade ?? ''} onChange={(e) => onChange(s.id, 'grade', e.target.value)} /></td>
              <td className="p-2 w-24"><input type="number" min="0" step="0.5" className="input-field" value={s.credits ?? ''} onChange={(e) => onChange(s.id, 'credits', e.target.value)} /></td>
              <td className="p-2">
                <div className="flex gap-2">
                  <button className="btn-primary px-3 py-1" onClick={() => onSave(s)}>Save</button>
                  <button className="btn-secondary px-3 py-1" onClick={() => onDelete(s.id)}>Delete</button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-3 text-sm text-gray-600">SGPA: <span className="font-medium">{totals.sgpa ? `${totals.sgpa.toFixed(2)} / 10` : 'N/A'}</span></div>
    </div>
  );
};

export default SemesterTable;

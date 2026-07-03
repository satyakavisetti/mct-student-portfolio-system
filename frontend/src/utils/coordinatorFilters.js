const normalizeText = (value) => String(value ?? '').trim().toLowerCase();

const normalizeCollegeValue = (value) => {
  const raw = normalizeText(value);
  if (!raw) return '';

  const aliases = {
    vasavi: 'Vasavi',
    'vasavi college of engineering': 'Vasavi',
    cbit: 'CBIT',
    'chaitanya bharathi institute of technology': 'CBIT',
    kmit: 'KMIT',
    vardhaman: 'Vardhaman',
    narayanamma: 'Narayanamma',
    bvrit: 'BVRIT',
    'iiit hyderabad': 'IIIT Hyderabad',
    'iiit-hyderabad': 'IIIT Hyderabad',
    other: 'Other',
  };

  return aliases[raw] || String(value).trim();
};

const normalizeYearValue = (value) => {
  const raw = normalizeText(value);
  if (!raw) return '';

  const aliases = {
    '1': '1st Year',
    '1st': '1st Year',
    '1st year': '1st Year',
    '1styr': '1st Year',
    'first year': '1st Year',
    'i year': '1st Year',
    'year 1': '1st Year',
    '2': '2nd Year',
    '2nd': '2nd Year',
    '2nd year': '2nd Year',
    '2ndyr': '2nd Year',
    'second year': '2nd Year',
    'ii year': '2nd Year',
    'year 2': '2nd Year',
    '3': '3rd Year',
    '3rd': '3rd Year',
    '3rd year': '3rd Year',
    '3rdyr': '3rd Year',
    'third year': '3rd Year',
    'iii year': '3rd Year',
    'year 3': '3rd Year',
    '4': '4th Year',
    '4th': '4th Year',
    '4th year': '4th Year',
    '4thyr': '4th Year',
    'fourth year': '4th Year',
    'iv year': '4th Year',
    'year 4': '4th Year',
  };

  if (aliases[raw]) return aliases[raw];

  if (raw.includes('1st') || raw.includes('first') || raw.includes('year 1') || raw.includes('i year')) return '1st Year';
  if (raw.includes('2nd') || raw.includes('second') || raw.includes('year 2') || raw.includes('ii year')) return '2nd Year';
  if (raw.includes('3rd') || raw.includes('third') || raw.includes('year 3') || raw.includes('iii year')) return '3rd Year';
  if (raw.includes('4th') || raw.includes('fourth') || raw.includes('year 4') || raw.includes('iv year')) return '4th Year';

  return String(value).trim();
};

export { normalizeCollegeValue, normalizeYearValue };
export default { normalizeCollegeValue, normalizeYearValue };

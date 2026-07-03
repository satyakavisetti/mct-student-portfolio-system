# MCT API Documentation

## Base URL
```
http://localhost:5000/api
```

## Authentication

All protected endpoints require a Bearer token in the Authorization header:
```
Authorization: Bearer <jwt_token>
```

## Response Format

All responses follow this format:
```json
{
  "success": true/false,
  "message": "...",
  "data": {}
}
```

---

## 🔐 Authentication Endpoints

### Register Student
```
POST /auth/register
Body: {
  "mssid": "MSS2022096",
  "password": "password123",
  "confirmPassword": "password123"
}
Response: {
  "success": true,
  "token": "jwt_token",
  "user": { "id", "mssid", "role" }
}
```

### Login
```
POST /auth/login
Body: {
  "mssid": "MSS2022096",
  "password": "password123"
}
Response: {
  "success": true,
  "token": "jwt_token",
  "user": { "id", "mssid", "role" }
}
```

### Get Current User
```
GET /auth/me
Headers: Authorization: Bearer <token>
Response: {
  "success": true,
  "user": { "id", "mssid", "role", "full_name", "email", "phone" }
}
```

---

## 👤 Personal Details

### Get Personal Details
```
GET /personal
Headers: Authorization: Bearer <token>
Response: {
  "success": true,
  "personalDetails": {
    "id", "student_id", "full_name", "email", "phone",
    "date_of_birth", "gender", "address", "city", "state",
    "pincode", "profile_photo"
  }
}
```

### Update Personal Details
```
PUT /personal
Headers: Authorization: Bearer <token>
Body: {
  "full_name": "John Doe",
  "email": "john@example.com",
  "phone": "9876543210",
  "date_of_birth": "2003-01-15",
  "gender": "Male",
  "address": "123 Main St",
  "city": "Hyderabad",
  "state": "Telangana",
  "pincode": "500001"
}
Response: { "success": true, "message": "...", "personalDetails": {...} }
```

---

## 👨‍👩‍👧‍👦 Family Details

### Get Family Details
```
GET /family
Headers: Authorization: Bearer <token>
```

### Update Family Details
```
PUT /family
Headers: Authorization: Bearer <token>
Body: {
  "father_name": "Rajesh Kumar",
  "father_occupation": "Engineer",
  "mother_name": "Priya Kumar",
  "mother_occupation": "Teacher"
}
```

---

## 👶 Siblings Management

### Get All Siblings
```
GET /siblings
Headers: Authorization: Bearer <token>
```

### Add Sibling
```
POST /siblings
Headers: Authorization: Bearer <token>
Body: {
  "sibling_name": "Priya",
  "education": "B.Tech",
  "occupation": "Student"
}
```

### Update Sibling
```
PUT /siblings/:id
Headers: Authorization: Bearer <token>
Body: {
  "sibling_name": "Priya",
  "education": "B.Tech",
  "occupation": "Student"
}
```

### Delete Sibling
```
DELETE /siblings/:id
Headers: Authorization: Bearer <token>
```

---

## 🎓 Education Details

### School Details

#### Get School Details
```
GET /education/school
Headers: Authorization: Bearer <token>
```

#### Update School Details
```
PUT /education/school
Headers: Authorization: Bearer <token>
Body: {
  "school_name": "DAV Public School",
  "board": "CBSE",
  "pass_year": 2019,
  "gpa": 9.5
}
```

### Intermediate Details

#### Get Intermediate Details
```
GET /education/intermediate
Headers: Authorization: Bearer <token>
```

#### Update Intermediate Details
```
PUT /education/intermediate
Headers: Authorization: Bearer <token>
Body: {
  "college_name": "Vidya Vikas College",
  "board": "IPE",
  "ipe_marks": 950,
  "ipe_percentage": 95.0,
  "eamcet_rank": 1500,
  "jee_mains_percentile": 85.5,
  "jee_advanced_percentile": 78.2
}
```

### BTech Details

#### Get BTech Details
```
GET /education/btech
Headers: Authorization: Bearer <token>
```

#### Update BTech Details
```
PUT /education/btech
Headers: Authorization: Bearer <token>
Body: {
  "college_name": "Vasavi College of Engineering",
  "branch": "CSE",
  "admission_year": 2020,
  "passout_year": 2024,
  "current_cgpa": 8.5
}
```

---

## 📚 Semesters & Subjects

### Get All Semesters
```
GET /semesters
Headers: Authorization: Bearer <token>
```

### Update Semester
```
PUT /semesters
Headers: Authorization: Bearer <token>
Body: {
  "semester_number": 1,
  "sgpa": 8.5
}
```

### Get Subjects for Semester
```
GET /semesters/:semesterId/subjects
Headers: Authorization: Bearer <token>
```

### Add Subject
```
POST /semesters/:semesterId/subjects
Headers: Authorization: Bearer <token>
Body: {
  "subject_name": "Data Structures",
  "mid1_marks": 18,
  "mid2_marks": 17,
  "semester_marks": 85,
  "grade": "A",
  "credits": 3.0
}
```

### Update Subject
```
PUT /semesters/subjects/:subjectId
Headers: Authorization: Bearer <token>
Body: { "subject_name": "...", "mid1_marks": ..., ... }
```

### Delete Subject
```
DELETE /semesters/subjects/:subjectId
Headers: Authorization: Bearer <token>
```

---

## 🎯 Goals

### Get All Goals
```
GET /goals
Headers: Authorization: Bearer <token>
```

### Add Goal
```
POST /goals
Headers: Authorization: Bearer <token>
Body: {
  "goal": "Learn Machine Learning",
  "description": "Complete Andrew Ng's course",
  "deadline": "2024-12-31",
  "progress_percentage": 50,
  "status": "in_progress"
}
```

### Update Goal
```
PUT /goals/:id
Headers: Authorization: Bearer <token>
```

### Delete Goal
```
DELETE /goals/:id
Headers: Authorization: Bearer <token>
```

---

## 💻 Coding Profiles

### Get All Coding Profiles
```
GET /coding
Headers: Authorization: Bearer <token>
```

### Add Coding Profile
```
POST /coding
Headers: Authorization: Bearer <token>
Body: {
  "platform": "LeetCode",
  "username": "johndoe",
  "profile_url": "https://leetcode.com/johndoe",
  "rating": 2000,
  "problems_solved": 450
}
```

### Update Coding Profile
```
PUT /coding/:id
Headers: Authorization: Bearer <token>
```

### Delete Coding Profile
```
DELETE /coding/:id
Headers: Authorization: Bearer <token>
```

---

## 📁 Projects

### Get All Projects
```
GET /projects
Headers: Authorization: Bearer <token>
```

### Add Project
```
POST /projects
Headers: Authorization: Bearer <token>
Body: {
  "title": "E-Commerce Platform",
  "description": "Full-stack MERN app",
  "tech_stack": "MERN, MongoDB, Redis",
  "github_url": "https://github.com/...",
  "live_url": "https://app.example.com",
  "start_date": "2023-01-01",
  "end_date": "2023-06-01"
}
```

### Update Project
```
PUT /projects/:id
Headers: Authorization: Bearer <token>
```

### Delete Project
```
DELETE /projects/:id
Headers: Authorization: Bearer <token>
```

---

## 📄 Resume

### Get Resume Info
```
GET /resume
Headers: Authorization: Bearer <token>
```

### Upload Resume
```
POST /resume
Headers: Authorization: Bearer <token>, Content-Type: multipart/form-data
Body: FormData with file "resume"
```

### Download Resume
```
GET /resume/download
Headers: Authorization: Bearer <token>
```

---

## 🏅 Certifications

### Get All Certifications
```
GET /certifications
Headers: Authorization: Bearer <token>
```

### Add Certification
```
POST /certifications
Headers: Authorization: Bearer <token>
Body: {
  "title": "AWS Solutions Architect",
  "organization": "Amazon",
  "issue_date": "2023-06-01",
  "credential_url": "https://aws.amazon.com/..."
}
```

### Update Certification
```
PUT /certifications/:id
Headers: Authorization: Bearer <token>
```

### Delete Certification
```
DELETE /certifications/:id
Headers: Authorization: Bearer <token>
```

---

## 🏆 Achievements

### Get All Achievements
```
GET /achievements
Headers: Authorization: Bearer <token>
```

### Add Achievement
```
POST /achievements
Headers: Authorization: Bearer <token>
Body: {
  "title": "CodeChef Long Challenge Winner",
  "description": "Ranked 1st in August 2023",
  "category": "Competitive Programming",
  "achievement_date": "2023-08-31"
}
```

### Update Achievement
```
PUT /achievements/:id
Headers: Authorization: Bearer <token>
```

### Delete Achievement
```
DELETE /achievements/:id
Headers: Authorization: Bearer <token>
```

---

## 💼 Placements

### Get All Placements
```
GET /placements
Headers: Authorization: Bearer <token>
```

### Add Placement
```
POST /placements
Headers: Authorization: Bearer <token>
Body: {
  "company_name": "Google",
  "role": "Software Engineer",
  "package": 50.0,
  "placement_type": "full_time",
  "status": "accepted"
}
```

### Update Placement
```
PUT /placements/:id
Headers: Authorization: Bearer <token>
```

### Delete Placement
```
DELETE /placements/:id
Headers: Authorization: Bearer <token>
```

---

## 📊 Coordinator APIs

### Get All Students
```
GET /coordinator/students
Headers: Authorization: Bearer <token>
Note: User must have role='coordinator'
```

### Search Students
```
GET /coordinator/students/search?q=name&block=1&mentor=1
Headers: Authorization: Bearer <token>
```

### Get Student Profile
```
GET /coordinator/students/:studentId
Headers: Authorization: Bearer <token>
```

### Dashboard Statistics
```
GET /coordinator/analytics/dashboard
Headers: Authorization: Bearer <token>
Response: {
  "stats": {
    "totalStudents": 600,
    "totalCoordinators": 5,
    "totalBlocks": 6,
    "placements": { "total", "placed", "avg_package" },
    "cgpaDistribution": [...],
    "topPerformers": [...]
  }
}
```

### Placement Analytics
```
GET /coordinator/analytics/placements
Headers: Authorization: Bearer <token>
Response: {
  "analytics": {
    "byCompany": [...],
    "byType": [...]
  }
}
```

### Coding Analytics
```
GET /coordinator/analytics/coding
Headers: Authorization: Bearer <token>
Response: {
  "analytics": {
    "platforms": [...]
  }
}
```

### Block Analytics
```
GET /coordinator/analytics/blocks
Headers: Authorization: Bearer <token>
Response: {
  "analytics": [...]
}
```

---

## 📦 Blocks API

### Get All Blocks
```
GET /blocks
```

### Get Block Details
```
GET /blocks/:id
```

### Get Students in Block
```
GET /blocks/:id/students
```

---

## Error Codes

| Code | Message |
|------|---------|
| 400 | Bad Request - Invalid input |
| 401 | Unauthorized - Invalid/missing token |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource doesn't exist |
| 409 | Conflict - Resource already exists |
| 500 | Server Error |

---

## Rate Limits
- No rate limiting currently implemented
- File upload limit: 5MB

## Pagination
- Most list endpoints return all results
- Implement pagination in frontend if needed

## Timestamps
- All timestamps are in ISO 8601 format (UTC)
- Example: "2024-06-23T10:30:45.000Z"

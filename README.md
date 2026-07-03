# MCT - Student Management and Tracking Platform v2.0

## Project Overview

Complete Student Management and Tracking Platform for Vasavi College of Engineering with role-based access (Students & Coordinators), academic tracking, coding profiles, placement analytics, and mentor allocation.

## ✨ Features

### Authentication & Security
- JWT-based authentication
- Role-based access control (Student & Coordinator)
- Secure password hashing with bcryptjs
- Token expiration and refresh

### Student Features
- Personal Details (Name, Contact, Address, etc.)
- Family Details (Father/Mother occupation)
- Academic Tracking
  - School Details (Board, GPA)
  - Intermediate Details (IPE, EAMCET, JEE scores)
  - BTech Details (Branch, CGPA)
  - Semester Tracking (Semester 1-8 with SGPA)
  - Subject Tracking (Mid marks, Final marks, Grades, Credits)
- Siblings Management
- Goals & Progress Tracking
- Coding Profiles (7 platforms: LeetCode, CodeChef, CodeForces, HackerRank, GeeksForGeeks, GitHub, AtCoder)
- Projects Portfolio
- Resume Upload/Download
- Certifications
- Achievements
- Placement Tracking
- Mentor Information Display

### Coordinator Features
- Student Management
  - View All Students
  - Search Students (by name, MSSID, email)
  - Filter by Block/Mentor
  - View Student Profiles
- Block Management
  - 6 Student Blocks
  - Mentor Assignment per Block
- Analytics Dashboard
  - Total Students, Coordinators, Blocks
  - Placement Statistics
  - CGPA Distribution
  - Top Performers
  - Coding Analytics by Platform
  - Block-wise Analytics
  - Company-wise Placement Stats

### Database Features
- PostgreSQL with 22 tables
- Foreign Key relationships with CASCADE deletes
- Comprehensive indexing for performance
- Migration-safe schema

## 🛠 Tech Stack

### Backend
- Node.js + Express.js
- PostgreSQL
- JWT Authentication
- Multer for file uploads
- Bcryptjs for password hashing

### Frontend
- React 18
- Vite
- React Router v6
- Recharts for analytics
- Axios for API calls
- Tailwind CSS
- React Icons
- React Toastify

## 📋 Setup Instructions

### Prerequisites
- Node.js (v14+)
- PostgreSQL (v12+)
- npm or yarn

### Database Setup

1. **Create Database:**
```bash
createdb mct_project
```

2. **Run Migration Schema:**
```bash
psql -U postgres -d mct_project -f backend/database/schema.sql
```

This will:
- Create all 22 tables
- Set up foreign key relationships
- Create indexes for performance
- Insert default blocks and mentors
- Create coordinator account (MSS0000000 / password)

### Backend Setup

1. **Install Dependencies:**
```bash
cd backend
npm install
```

2. **Configure Environment:**
Edit `.env` file with your database credentials:
```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=mct_project
DB_USER=postgres
DB_PASSWORD=postgres
PORT=5000
JWT_SECRET=mct_jwt_secret_key_change_in_production_2024
```

3. **Start Backend:**
```bash
npm run dev
```

Backend runs on: http://localhost:5000

### Frontend Setup

1. **Install Dependencies:**
```bash
cd frontend
npm install
```

2. **Start Frontend:**
```bash
npm run dev
```

Frontend runs on: http://localhost:5173

## 🔐 Default Credentials

### Coordinator Login
- MSSID: `MSS0000000`
- Password: `password`

### Student Registration
- Students can self-register with format: `MSS` + 7 digits (e.g., MSS2022096)

## 📚 API Endpoints

### Authentication
- `POST /api/auth/register` - Student registration
- `POST /api/auth/login` - Login for both roles
- `GET /api/auth/me` - Get current user

### Student Features
- `GET/PUT /api/personal` - Personal details
- `GET/PUT /api/family` - Family details
- `GET /api/siblings` - List siblings
- `POST /api/siblings` - Add sibling
- `PUT /api/siblings/:id` - Update sibling
- `DELETE /api/siblings/:id` - Delete sibling
- `GET/PUT /api/education/school` - School details
- `GET/PUT /api/education/intermediate` - Intermediate details
- `GET/PUT /api/education/btech` - BTech details
- `GET /api/semesters` - List semesters
- `PUT /api/semesters` - Add/update semester
- `GET /api/semesters/:semesterId/subjects` - List subjects
- `POST /api/semesters/:semesterId/subjects` - Add subject
- `GET/POST /api/goals` - Goals management
- `GET/POST /api/coding` - Coding profiles
- `GET/POST /api/projects` - Projects
- `GET/POST /api/resume` - Resume management
- `GET/POST /api/certifications` - Certifications
- `GET/POST /api/achievements` - Achievements
- `GET/POST /api/placements` - Placement tracking

### Coordinator Features
- `GET /api/coordinator/students` - All students
- `GET /api/coordinator/students/search` - Search students
- `GET /api/coordinator/students/:studentId` - Student profile
- `GET /api/coordinator/analytics/dashboard` - Dashboard stats
- `GET /api/coordinator/analytics/placements` - Placement analytics
- `GET /api/coordinator/analytics/coding` - Coding analytics
- `GET /api/coordinator/analytics/blocks` - Block analytics
- `GET /api/blocks` - All blocks with mentors
- `GET /api/blocks/:id` - Block details
- `GET /api/blocks/:id/students` - Students in block

## 📊 Database Schema

### Core Tables
- **students** - Authentication and user roles
- **personal_details** - Student personal information
- **family_details** - Father/Mother details
- **siblings** - Multiple siblings per student
- **blocks** - Student blocks (6 total)
- **mentors** - Block mentors

### Academic Tables
- **school_details** - 10+2 school information
- **inter_details** - Intermediate/Pre-university details
- **btech_details** - B.Tech program details
- **semesters** - Semester tracking (1-8)
- **subjects** - Subject marks and grades per semester

### Career Tables
- **coding_profiles** - 7 coding platforms
- **coding_profile_history** - Rating history tracking
- **projects** - Student projects
- **resume** - Resume file management
- **certifications** - Professional certifications
- **achievements** - Academic/non-academic achievements
- **placements** - Placement records
- **goals** - Student goals and progress

## 🧪 Testing Checklist

✅ Database creates successfully
✅ Backend starts without errors
✅ Frontend builds successfully
✅ Student registration works
✅ Student login works
✅ Coordinator login works (MSS0000000)
✅ JWT authentication works
✅ Student can view own profile
✅ Coordinator can view all students
✅ Coordinator can search students
✅ Block assignments work
✅ Personal details CRUD works
✅ Academic details CRUD works
✅ Siblings management works
✅ Coding profiles CRUD works
✅ Placements tracking works
✅ Analytics display correctly
✅ Charts render properly (Recharts)
✅ Responsive design works
✅ File uploads work

## 🚀 Deployment

### Backend Deployment (e.g., Heroku/Railway)
1. Set environment variables on platform
2. Deploy from Git
3. Run migrations on hosted database

### Frontend Deployment (e.g., Vercel/Netlify)
1. Set `VITE_API_URL` environment variable
2. Deploy from Git

## 📝 Notes

- All timestamps are in UTC
- File uploads limited to 5MB
- Tokens expire after 7 days
- CGPA and SGPA tracked to 2 decimal places
- Semester-wise SGPA calculated from subject credits
- All queries use parameterized statements to prevent SQL injection

## 🐛 Troubleshooting

**Database Connection Error:**
- Verify PostgreSQL is running
- Check DB credentials in .env
- Ensure database `mct_project` exists

**Port Already in Use:**
- Change PORT in .env (backend)
- Change port in vite.config.js (frontend)

**CORS Errors:**
- Verify FRONTEND_URL in .env matches actual frontend URL
- Check browser console for specific errors

**Token Expired:**
- User must login again
- Implement refresh token logic if needed

## 📧 Support

For issues or feature requests, contact the development team.

## 📄 License

Private - Vasavi College of Engineering

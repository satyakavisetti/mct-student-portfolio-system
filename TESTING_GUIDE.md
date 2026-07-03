# MCT Platform - Testing & Verification Guide

## Pre-Launch Checklist

This guide helps verify that the MCT platform is working correctly after deployment.

### 1. Database Verification

```sql
-- Connect to database
psql -U postgres -d mct_project

-- Check table count (should be 22)
SELECT COUNT(*) FROM information_schema.tables 
WHERE table_schema='public';

-- Check default blocks exist
SELECT * FROM blocks;
-- Expected: 6 blocks (Block A through F)

-- Check mentors
SELECT * FROM mentors;
-- Expected: 6 mentors (one per block)

-- Check coordinator account
SELECT mssid, role FROM students WHERE mssid = 'MSS0000000';
-- Expected: MSS0000000 | coordinator
```

### 2. Backend Health Check

```bash
# Start backend
cd backend
npm run dev

# In another terminal, check health endpoint
curl http://localhost:5000/api/health

# Expected response:
# { "success": true, "message": "Server and DB are healthy." }
```

### 3. API Endpoint Testing

#### Authentication Tests

```bash
# Test Student Registration
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "mssid": "MSS2022001",
    "password": "TestPass123",
    "confirmPassword": "TestPass123"
  }'
# Expected: 201 Created with token

# Test Student Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "mssid": "MSS2022001",
    "password": "TestPass123"
  }'
# Expected: 200 OK with token

# Test Coordinator Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "mssid": "MSS0000000",
    "password": "password"
  }'
# Expected: 200 OK with token
```

#### Student Features Tests

```bash
# Set token from login response
TOKEN="your_jwt_token_here"

# Test Get Current User
curl -X GET http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer $TOKEN"
# Expected: User details

# Test Personal Details
curl -X GET http://localhost:5000/api/personal \
  -H "Authorization: Bearer $TOKEN"
# Expected: Personal details (may be empty for new user)

curl -X PUT http://localhost:5000/api/personal \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "full_name": "John Doe",
    "email": "john@example.com",
    "phone": "9876543210",
    "gender": "Male",
    "city": "Hyderabad",
    "state": "Telangana"
  }'
# Expected: 200 OK with updated details

# Test Family Details
curl -X PUT http://localhost:5000/api/family \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "father_name": "Rajesh",
    "father_occupation": "Engineer",
    "mother_name": "Priya",
    "mother_occupation": "Teacher"
  }'
# Expected: 200 OK

# Test Goals CRUD
curl -X POST http://localhost:5000/api/goals \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "goal": "Learn AI",
    "description": "Complete ML course",
    "deadline": "2024-12-31",
    "status": "in_progress"
  }'
# Expected: 201 Created

# Test Coding Profile
curl -X POST http://localhost:5000/api/coding \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "platform": "LeetCode",
    "username": "johndoe",
    "profile_url": "https://leetcode.com/johndoe",
    "rating": 2000,
    "problems_solved": 450
  }'
# Expected: 201 Created
```

#### Coordinator Features Tests

```bash
# Set coordinator token
TOKEN="coordinator_jwt_token"

# Test Get All Students
curl -X GET http://localhost:5000/api/coordinator/students \
  -H "Authorization: Bearer $TOKEN"
# Expected: 200 OK with array of students

# Test Search Students
curl -X GET "http://localhost:5000/api/coordinator/students/search?q=john&block=1" \
  -H "Authorization: Bearer $TOKEN"
# Expected: 200 OK with filtered students

# Test Dashboard Stats
curl -X GET http://localhost:5000/api/coordinator/analytics/dashboard \
  -H "Authorization: Bearer $TOKEN"
# Expected: Statistics object with counts and analytics

# Test Block Analytics
curl -X GET http://localhost:5000/api/coordinator/analytics/blocks \
  -H "Authorization: Bearer $TOKEN"
# Expected: Block-wise analytics

# Test Placement Analytics
curl -X GET http://localhost:5000/api/coordinator/analytics/placements \
  -H "Authorization: Bearer $TOKEN"
# Expected: Placement statistics by company
```

### 4. Frontend Startup

```bash
cd frontend
npm run dev

# Open browser: http://localhost:5173
# Expected: Login/Register page loads
```

### 5. Frontend Functional Tests

#### Student User Flow
1. ✅ Register new student (MSS + 7 digits)
2. ✅ Login with credentials
3. ✅ View dashboard
4. ✅ Update personal details
5. ✅ Add family details
6. ✅ Add sibling
7. ✅ Update school details
8. ✅ Update intermediate details
9. ✅ Update BTech details
10. ✅ Add semester and subjects
11. ✅ Add goals
12. ✅ Add coding profiles
13. ✅ Add projects
14. ✅ Upload resume
15. ✅ Add certifications
16. ✅ Add achievements
17. ✅ Add placements
18. ✅ View mentor information

#### Coordinator User Flow
1. ✅ Login (MSS0000000 / password)
2. ✅ View coordinator dashboard
3. ✅ View all students
4. ✅ Search students by name/MSSID
5. ✅ Filter by block/mentor
6. ✅ Click student to view profile
7. ✅ View dashboard analytics
8. ✅ Check placement stats
9. ✅ Check coding analytics
10. ✅ Check block-wise analytics
11. ✅ View CGPA distribution
12. ✅ See top performers

### 6. UI/UX Verification

- ✅ Responsive design (test on mobile, tablet, desktop)
- ✅ All forms validate inputs
- ✅ Error messages display correctly
- ✅ Success notifications appear
- ✅ Loading states show
- ✅ Charts render properly (Recharts)
- ✅ Tables display with pagination
- ✅ Sidebar navigation works
- ✅ Logout functionality works
- ✅ Protected routes redirect unauthenticated users

### 7. Security Verification

```bash
# Test missing token
curl http://localhost:5000/api/personal
# Expected: 401 Unauthorized

# Test invalid token
curl -H "Authorization: Bearer invalid" \
  http://localhost:5000/api/personal
# Expected: 401 Unauthorized

# Test coordinator-only endpoint with student token
# Expected: 403 Forbidden

# Test CORS
# Open browser console, check no CORS errors
```

### 8. Database Performance

```sql
-- Check indexes
SELECT schemaname, tablename, indexname 
FROM pg_indexes 
WHERE schemaname = 'public';

-- Should see indexes on all foreign keys and frequently queried columns
```

### 9. Data Integrity Tests

```sql
-- Test cascade delete
INSERT INTO siblings (student_id, sibling_name, education, occupation)
VALUES (1, 'Test', 'BTech', 'Student');

DELETE FROM students WHERE id = 1;

SELECT COUNT(*) FROM siblings WHERE student_id = 1;
-- Expected: 0 (cascade delete worked)
```

### 10. Load Testing Scenarios

Test with sample data:

```bash
# Option 1: Manually create test data through frontend
# Create 5-10 test student accounts
# Add various data to each account

# Option 2: Use database script to populate test data
psql -U postgres -d mct_project << 'EOF'
-- Insert test students
INSERT INTO students (mssid, password, role, block_id, mentor_id)
VALUES 
  ('MSS2022050', '$2a$10$...', 'student', 1, 1),
  ('MSS2022051', '$2a$10$...', 'student', 1, 1),
  ('MSS2022052', '$2a$10$...', 'student', 2, 2);

-- Add personal details
INSERT INTO personal_details (student_id, full_name, email, phone)
VALUES 
  (2, 'Alice', 'alice@test.com', '9876543210'),
  (3, 'Bob', 'bob@test.com', '9876543211');
EOF
```

### 11. Error Scenario Testing

```bash
TOKEN="valid_student_token"

# Test accessing other student's data
curl -X GET http://localhost:5000/api/coordinator/students/999 \
  -H "Authorization: Bearer $TOKEN"
# Expected: 403 Forbidden (coordinator only)

# Test updating non-existent sibling
curl -X PUT http://localhost:5000/api/siblings/99999 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"sibling_name": "Test"}'
# Expected: 403 or 404

# Test invalid MSSID format
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "mssid": "INVALID",
    "password": "Test123"
  }'
# Expected: 400 Bad Request
```

### 12. Performance Metrics

Monitor while testing:
- Backend response times (should be < 200ms for most endpoints)
- Frontend load time (should be < 2s)
- API query times (check server logs)
- Database query optimization

### 13. Browser Compatibility

Test on:
- ✅ Chrome (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest)
- ✅ Edge (latest)
- ✅ Mobile browsers (iOS Safari, Chrome Mobile)

### 14. Final Checklist

- [ ] Database health confirmed
- [ ] Backend starts without errors
- [ ] Frontend builds successfully
- [ ] Student registration works
- [ ] Student login works
- [ ] Coordinator login works
- [ ] JWT tokens valid
- [ ] All CRUD operations work
- [ ] All analytics endpoints work
- [ ] Charts render correctly
- [ ] Responsive design works
- [ ] Error handling works
- [ ] Security rules enforced
- [ ] No console errors
- [ ] No network errors

### 15. Issue Resolution

If tests fail:

1. **Database Error:**
   - Check PostgreSQL is running
   - Verify schema.sql ran successfully
   - Check database permissions

2. **Backend Error:**
   - Check Node.js version (v14+)
   - Verify .env configuration
   - Check port not in use (5000)
   - Review server logs

3. **Frontend Error:**
   - Clear node_modules and reinstall
   - Check API URL in environment
   - Verify CORS settings
   - Check browser console

4. **API Error:**
   - Verify request format
   - Check authentication headers
   - Verify content-type headers
   - Review API documentation

## Performance Tuning

If performance is slow:

1. **Database:**
   - Ensure indexes are created
   - Check query execution plans
   - Consider adding VACUUM ANALYZE

2. **Backend:**
   - Enable compression middleware
   - Implement response caching
   - Optimize database queries

3. **Frontend:**
   - Enable build optimization
   - Implement code splitting
   - Cache API responses

## Monitoring Recommendations

For production:
- Set up application logging (Winston/Bunyan)
- Enable database query logging
- Monitor API response times
- Track error rates
- Monitor server resource usage
- Set up automated backups

## Success Criteria

The platform is ready for deployment when:
✅ All core features work correctly
✅ No critical bugs or errors
✅ Performance is acceptable
✅ Security measures in place
✅ Documentation is complete
✅ Users can complete workflows end-to-end

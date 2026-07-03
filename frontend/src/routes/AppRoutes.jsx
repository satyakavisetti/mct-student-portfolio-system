import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute   from '../components/ProtectedRoute';
import DashboardLayout  from '../layouts/DashboardLayout';

import Login                     from '../pages/Login';
import Signup                    from '../pages/Signup';
import Dashboard                 from '../pages/Dashboard';
import PersonalDetails           from '../pages/PersonalDetails';
import AcademicDetails           from '../pages/AcademicDetails';
import Goals                     from '../pages/Goals';
import CodingHandles             from '../pages/CodingHandles';
import CodingDashboard           from '../pages/CodingDashboard';
import AnalyticsPlatformDetails   from '../pages/AnalyticsPlatformDetails';
import MentorDetails             from '../pages/MentorDetails';
import Projects                  from '../pages/Projects';
import Resume                    from '../pages/Resume';
import Certifications            from '../pages/Certifications';
import Achievements              from '../pages/Achievements';
import Placements                from '../pages/Placements';
import Volunteering              from '../pages/Volunteering';
import CoordinatorDashboard      from '../pages/CoordinatorDashboard';
import CoordinatorGoalTracking   from '../pages/CoordinatorGoalTracking';
import CoordinatorCodingTracking from '../pages/CoordinatorCodingTracking';
import CoordinatorDSATracking    from '../pages/CoordinatorDSATracking';
import CoordinatorReportCards    from '../pages/CoordinatorReportCards';
import CoordinatorVolunteeringTracking from '../pages/CoordinatorVolunteeringTracking';
import CoordinatorVolunteerDetails from '../pages/CoordinatorVolunteerDetails';
import CoordinatorProjectTracking from '../pages/CoordinatorProjectTracking';

const AppRoutes = () => (
  <Routes>
    {/* Public */}
    <Route path="/login"  element={<Login />} />
    <Route path="/signup" element={<Signup />} />

    {/* Protected student routes */}
    <Route path="/" element={
      <ProtectedRoute studentOnly>
        <DashboardLayout />
      </ProtectedRoute>
    }>
      <Route index element={<Navigate to="/dashboard" replace />} />
      <Route path="dashboard"      element={<Dashboard />} />
      <Route path="personal"       element={<PersonalDetails />} />
      <Route path="family"         element={<Navigate to="/personal" replace />} />
      <Route path="school"         element={<Navigate to="/academic" replace />} />
      <Route path="inter"          element={<Navigate to="/academic" replace />} />
      <Route path="btech"          element={<Navigate to="/academic" replace />} />
      <Route path="semesters"      element={<Navigate to="/academic" replace />} />
      <Route path="academic"       element={<AcademicDetails />} />
      <Route path="goals"          element={<Goals />} />
      <Route path="coding-dashboard" element={<CodingDashboard />} />
      <Route path="student/coding-handles" element={<CodingHandles />} />
      <Route path="analytics/:platform" element={<AnalyticsPlatformDetails />} />
      <Route path="mentor"         element={<MentorDetails />} />
      <Route path="projects"       element={<Projects />} />
      <Route path="volunteering"    element={<Volunteering />} />
      <Route path="resume"         element={<Resume />} />
      <Route path="certifications" element={<Certifications />} />
      <Route path="achievements"   element={<Achievements />} />
      <Route path="placements"     element={<Placements />} />
    </Route>

    {/* Protected coordinator routes */}
    <Route path="/coordinator" element={
      <ProtectedRoute coordinatorOnly>
        <DashboardLayout />
      </ProtectedRoute>
    }>
      <Route index element={<Navigate to="/coordinator/dashboard" replace />} />
      <Route path="dashboard"      element={<CoordinatorDashboard />} />
      <Route path="report-cards"   element={<CoordinatorReportCards />} />
      <Route path="coding-tracking" element={<CoordinatorCodingTracking />} />
      <Route path="dsa-tracking"   element={<CoordinatorDSATracking />} />
      <Route path="analytics/student/:studentId/:platform" element={<AnalyticsPlatformDetails />} />
      <Route path="goal-tracking"  element={<CoordinatorGoalTracking />} />
      <Route path="volunteering-tracking" element={<CoordinatorVolunteeringTracking />} />
      <Route path="volunteering-tracking/:studentId" element={<CoordinatorVolunteerDetails />} />
      <Route path="project-tracking" element={<CoordinatorProjectTracking />} />
    </Route>

    {/* Catch-all */}
    <Route path="*" element={<Navigate to="/dashboard" replace />} />
  </Routes>
);

export default AppRoutes;

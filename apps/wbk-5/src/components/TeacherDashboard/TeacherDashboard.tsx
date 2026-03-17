import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import {
  getAllStudents,
  getStudentDetail,
  formatTimestamp,
  formatDate,
  StudentBasicInfo,
  StudentDetail,
} from '../../services/teacherDashboard';
import { StudentDetailView } from './StudentDetailView';

interface TeacherDashboardProps {
  user: User;
}

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({ user }) => {
  const [students, setStudents] = useState<StudentBasicInfo[]>([]);
  const [isLoadingStudents, setIsLoadingStudents] = useState(true);
  const [selectedStudentDetail, setSelectedStudentDetail] = useState<StudentDetail | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ===== INITIAL LOAD =====
  useEffect(() => {
    const loadStudents = async () => {
      setIsLoadingStudents(true);
      setError(null);
      try {
        const studentsList = await getAllStudents();
        setStudents(studentsList);
        console.log('[TeacherDash] Loaded', studentsList.length, 'students');
      } catch (err) {
        setError('Failed to load students. Please try again.');
        console.error('[TeacherDash] Error:', err);
      } finally {
        setIsLoadingStudents(false);
      }
    };

    loadStudents();
  }, []);

  // ===== HANDLE STUDENT SELECTION =====
  const handleSelectStudent = async (studentUid: string) => {
    setIsLoadingDetail(true);
    setError(null);
    try {
      const detail = await getStudentDetail(studentUid);
      if (detail) {
        setSelectedStudentDetail(detail);
      } else {
        setError('Could not load student details.');
      }
    } catch (err) {
      setError('Failed to load student details.');
      console.error('[TeacherDash] Error:', err);
    } finally {
      setIsLoadingDetail(false);
    }
  };

  // ===== SHOW DETAIL VIEW IF SELECTED =====
  if (selectedStudentDetail) {
    return (
      <StudentDetailView
        student={selectedStudentDetail}
        onBack={() => setSelectedStudentDetail(null)}
      />
    );
  }

  // ===== LOADING STATE =====
  if (isLoadingStudents) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-100 to-blue-50 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="text-slate-600 mt-4">Loading students...</p>
          </div>
        </div>
      </div>
    );
  }

  // ===== ERROR STATE =====
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-100 to-blue-50 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6">
            <h2 className="text-lg font-bold text-red-800 mb-2">Error</h2>
            <p className="text-red-700">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ===== EMPTY STATE =====
  if (students.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-100 to-blue-50 p-6">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold text-slate-800 mb-8">Teacher Dashboard</h1>
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <p className="text-slate-600 text-lg">No students found yet.</p>
            <p className="text-slate-500 mt-2">Students will appear here once they register.</p>
          </div>
        </div>
      </div>
    );
  }

  // ===== MAIN DASHBOARD =====
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-100 to-blue-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-800">📊 Teacher Dashboard</h1>
          <p className="text-slate-600 mt-2">
            Monitoring {students.length} student{students.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Students Table */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
                <tr>
                  <th className="px-6 py-4 text-left font-semibold">Name</th>
                  <th className="px-6 py-4 text-left font-semibold">Email</th>
                  <th className="px-6 py-4 text-left font-semibold">Type</th>
                  <th className="px-6 py-4 text-left font-semibold">Last Active</th>
                  <th className="px-6 py-4 text-center font-semibold">Sessions</th>
                  <th className="px-6 py-4 text-center font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {students.map((student, index) => (
                  <tr
                    key={student.uid}
                    className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50'}
                  >
                    <td className="px-6 py-4">
                      <span className="font-semibold text-slate-800">{student.name}</span>
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {student.email || '-'}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-medium ${
                          student.isAnonymous
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-green-100 text-green-800'
                        }`}
                      >
                        {student.isAnonymous ? 'Anonymous' : 'Email'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-600 text-sm">
                      {formatDate(student.lastActive)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-semibold">
                        0
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => handleSelectStudent(student.uid)}
                        disabled={isLoadingDetail}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-all active:scale-95 disabled:opacity-50"
                      >
                        {isLoadingDetail ? 'Loading...' : 'View'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Stats Footer */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
          <div className="bg-white rounded-xl shadow p-6 text-center">
            <p className="text-slate-600 text-sm font-medium">Total Students</p>
            <p className="text-3xl font-bold text-blue-600 mt-2">{students.length}</p>
          </div>
          <div className="bg-white rounded-xl shadow p-6 text-center">
            <p className="text-slate-600 text-sm font-medium">Anonymous Users</p>
            <p className="text-3xl font-bold text-purple-600 mt-2">
              {students.filter(s => s.isAnonymous).length}
            </p>
          </div>
          <div className="bg-white rounded-xl shadow p-6 text-center">
            <p className="text-slate-600 text-sm font-medium">Registered Users</p>
            <p className="text-3xl font-bold text-green-600 mt-2">
              {students.filter(s => !s.isAnonymous).length}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

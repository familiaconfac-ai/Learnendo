import React from 'react';
import { StudentDetail, formatTimestamp, formatDate } from '../../services/teacherDashboard';

interface StudentDetailViewProps {
  student: StudentDetail;
  onBack: () => void;
}

export const StudentDetailView: React.FC<StudentDetailViewProps> = ({ student, onBack }) => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-100 to-blue-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Back Button */}
        <button
          onClick={onBack}
          className="mb-6 bg-slate-200 hover:bg-slate-300 text-slate-800 px-4 py-2 rounded-lg font-medium transition-all"
        >
          ← Back to Students
        </button>

        {/* Header Card */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-800">{student.name}</h1>
              <p className="text-slate-600 mt-1">{student.email || 'No email'}</p>
              <div className="flex gap-3 mt-4">
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium ${
                    student.isAnonymous
                      ? 'bg-purple-100 text-purple-800'
                      : 'bg-green-100 text-green-800'
                  }`}
                >
                  {student.isAnonymous ? 'Anonymous User' : 'Registered User'}
                </span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-slate-600">Student ID</p>
              <p className="text-xs font-mono text-slate-500 mt-1">{student.uid}</p>
            </div>
          </div>
        </div>

        {/* Profile Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Created At */}
          <div className="bg-white rounded-xl shadow p-6">
            <p className="text-sm font-semibold text-slate-600">Joined</p>
            <p className="text-lg font-bold text-slate-800 mt-2">{formatDate(student.createdAt)}</p>
            <p className="text-xs text-slate-500 mt-1">{formatTimestamp(student.createdAt)}</p>
          </div>

          {/* Last Active */}
          <div className="bg-white rounded-xl shadow p-6">
            <p className="text-sm font-semibold text-slate-600">Last Active</p>
            <p className="text-lg font-bold text-slate-800 mt-2">{formatDate(student.lastActive)}</p>
            <p className="text-xs text-slate-500 mt-1">{formatTimestamp(student.lastActive)}</p>
          </div>
        </div>

        {/* Activity Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          {/* Total Sessions */}
          <div className="bg-white rounded-xl shadow p-6">
            <p className="text-sm font-semibold text-slate-600">Total Sessions</p>
            <p className="text-3xl font-bold text-blue-600 mt-3">{student.activity.totalSessions}</p>
          </div>

          {/* Last Login */}
          <div className="bg-white rounded-xl shadow p-6">
            <p className="text-sm font-semibold text-slate-600">Last Login</p>
            <p className="text-sm font-bold text-slate-800 mt-3">
              {formatDate(student.activity.lastLogin)}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {formatTimestamp(student.activity.lastLogin)}
            </p>
          </div>

          {/* Daily Access */}
          <div className="bg-white rounded-xl shadow p-6">
            <p className="text-sm font-semibold text-slate-600">Today's Access</p>
            <p className="text-3xl font-bold text-green-600 mt-3">
              {student.activity.dailyAccessCount}
            </p>
            <p className="text-xs text-slate-500 mt-1">{student.activity.lastAccessDate}</p>
          </div>
        </div>

        {/* Latest Placement Test */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-6">
          <h2 className="text-2xl font-bold text-slate-800 mb-6">Latest Placement Test</h2>
          {student.latestPlacementTest ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm font-semibold text-slate-600">Level</p>
                <p className="text-3xl font-bold text-blue-600 mt-2">
                  {student.latestPlacementTest.level}
                </p>
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-600">Score</p>
                <p className="text-3xl font-bold text-green-600 mt-2">
                  {student.latestPlacementTest.percentage}%
                </p>
              </div>
              <div className="md:col-span-2">
                <p className="text-sm font-semibold text-slate-600">Date</p>
                <p className="text-slate-800 font-medium mt-2">
                  {formatTimestamp(student.latestPlacementTest.createdAt)}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-slate-600">No placement test taken yet.</p>
          )}
        </div>

        {/* All Placement Tests History */}
        {student.allPlacementTests.length > 0 && (
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <h2 className="text-2xl font-bold text-slate-800 mb-6">Test History</h2>
            <div className="space-y-3">
              {student.allPlacementTests.map((test, index) => (
                <div
                  key={test.testId}
                  className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200"
                >
                  <div>
                    <p className="font-semibold text-slate-800">Test #{index + 1}</p>
                    <p className="text-sm text-slate-600">{formatDate(test.createdAt)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-blue-600">{test.level}</p>
                    <p className="text-sm text-green-600 font-semibold">{test.percentage}%</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

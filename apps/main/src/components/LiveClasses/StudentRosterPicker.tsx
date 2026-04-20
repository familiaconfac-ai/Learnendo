import React from 'react';
import { StudentBasicInfo } from '../../services/teacherDashboard';

interface StudentRosterPickerProps {
  students: StudentBasicInfo[];
  loading?: boolean;
  selectedStudentIds: Set<string>;
  onToggleStudent: (student: StudentBasicInfo) => void;
}

export const StudentRosterPicker: React.FC<StudentRosterPickerProps> = ({
  students,
  loading = false,
  selectedStudentIds,
  onToggleStudent,
}) => {
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-sm font-bold text-white">Registered Participants</p>
        <span className="text-xs text-slate-400">
          {loading ? 'Loading...' : `${students.length} available`}
        </span>
      </div>

      {students.length === 0 ? (
        <p className="text-xs text-slate-400">
          No registered participants found yet. You can still paste IDs manually below.
        </p>
      ) : (
        <div className="max-h-48 space-y-2 overflow-y-auto pr-1">
          {students.map((student) => {
            const selected = selectedStudentIds.has(student.uid);
            const roleLabel = student.role === 'teacher' ? 'Teacher' : 'Student';
            return (
              <button
                key={student.uid}
                type="button"
                onClick={() => onToggleStudent(student)}
                className={`w-full rounded-xl border px-3 py-2 text-left transition-colors ${
                  selected
                    ? 'border-blue-500 bg-blue-500/15 text-blue-100'
                    : 'border-slate-700 bg-slate-800 text-slate-200 hover:border-slate-500'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{student.name}</p>
                    <p className="truncate text-xs text-slate-400">
                      {student.email ?? student.uid} · {roleLabel}
                    </p>
                  </div>
                  <span className="text-xs font-black uppercase">
                    {selected ? 'Added' : 'Add'}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Calendar, User } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/common/Button';
import { EmptyState } from '@/components/common/EmptyState';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { Select } from '@/components/common/Select';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { getDayAttendance, saveDayAttendance } from '@/services/attendanceService';
import { listStudentsPaged } from '@/services/studentService';
import { listClassesPaged } from '@/services/classService';
import { errorMessage } from '@/utils/errors';
import { formatDisplayDate, todayIso } from '@/utils/dates';
import type { Student } from '@/types';

type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';
const STATUS_LABEL: Record<AttendanceStatus, string> = { present: 'Present', absent: 'Absent', late: 'Late', excused: 'Excused' };
const STATUS_TONE: Record<AttendanceStatus, string> = { present: 'bg-emerald-50 text-emerald-700', absent: 'bg-rose-50 text-rose-700', late: 'bg-amber-50 text-amber-700', excused: 'bg-slate-50 text-slate-600' };

export default function AttendancePage() {
  const { userRecord, authUser } = useAuth();
  const toast = useToast();
  const institutionId = userRecord?.institutionId ?? '';
  const [classes, setClasses] = useState<{ id: string; name: string }[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [date, setDate] = useState<string>(todayIso());
  const [students, setStudents] = useState<Student[]>([]);
  const [statuses, setStatuses] = useState<Record<string, AttendanceStatus>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!institutionId) return;
    setLoading(true);
    setError(null);
    try {
      const [classPage, studentPage] = await Promise.all([listClassesPaged(institutionId), listStudentsPaged(institutionId)]);
      setClasses(classPage.items.map((c) => ({ id: c.id, name: c.name })));
      const allStudents = studentPage.items;
      if (selectedClassId) { setStudents(allStudents.filter((s) => s.classId === selectedClassId)); } else { setStudents([]); }
    } catch (err) { setError(errorMessage(err)); } finally { setLoading(false); }
  }, [institutionId, selectedClassId]);
  useEffect(() => { void load(); }, [load]);

  const loadDay = useCallback(async () => {
    if (!selectedClassId || !date) return;
    try {
      const { entries } = await getDayAttendance(institutionId, selectedClassId, date);
      const statusMap: Record<string, AttendanceStatus> = {};
      const noteMap: Record<string, string> = {};
      for (const [uid, entry] of Object.entries(entries)) {
        statusMap[uid] = entry.status;
        noteMap[uid] = entry.note ?? '';
      }
      setStatuses(statusMap);
      setNotes(noteMap);
    } catch (err) { setError(errorMessage(err)); }
  }, [institutionId, selectedClassId, date]);
  useEffect(() => { if (selectedClassId && date) void loadDay(); }, [selectedClassId, date, loadDay]);

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const entries: Record<string, { status: AttendanceStatus; note: string; markedBy: string; updatedAt: number }> = {};
      const now = Date.now();
      for (const [uid, status] of Object.entries(statuses)) {
        entries[uid] = { status, note: notes[uid] ?? '', markedBy: authUser?.uid ?? '', updatedAt: now };
      }
      await saveDayAttendance({ institutionId, classId: selectedClassId, date, entries, markedBy: authUser?.uid ?? '' });
      toast.success('Attendance saved.');
    } catch (err) { setError(errorMessage(err)); } finally { setSaving(false); }
  };

  const toggleStatus = (studentUid: string) => {
    const current = statuses[studentUid] ?? 'absent';
    const order: AttendanceStatus[] = ['present', 'late', 'excused', 'absent'];
    const nextIndex = (order.indexOf(current) + 1) % order.length;
    setStatuses((prev) => ({ ...prev, [studentUid]: order[nextIndex] }));
  };

  if (loading) return <LoadingSpinner fullPage />;
  if (error) {
    return (
      <AppShell variant="admin">
        <div role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}{' '}
          <button type="button" onClick={() => void load()} className="font-medium underline ml-2">Retry</button>
        </div>
      </AppShell>
    );
  }

  const selectedClass = classes.find((c) => c.id === selectedClassId);
  const classStudents = students;
  return (
    <AppShell variant="admin">
      <div className="mb-5 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Take Attendance</h1>
          <p className="text-sm text-slate-500">
            Mark attendance for {selectedClass?.name ?? 'a class'} on {formatDisplayDate(date)}
          </p>
        </div>
      </div>
      {!selectedClassId && (
        <EmptyState icon={<Calendar className="h-10 w-10" />} title="Select a class" description="Choose a class from the dropdown to begin marking attendance." />
      )}
      {selectedClassId && (
        <>
          <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <label className="text-sm text-slate-600">Class</label>
              <Select label="Class" value={selectedClassId} onChange={(e) => setSelectedClassId(e.target.value)}>
                <option value="">Select a class</option>
                {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            </div>
            <div className="flex items-center gap-3">
              <label className="text-sm text-slate-600">Date</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="px-3 py-2 text-sm border border-slate-300 rounded-md bg-white focus:ring-2 focus:ring-orange-500 focus:border-transparent" />
              <Button variant="secondary" onClick={() => setDate(todayIso())}>Today</Button>
            </div>
          </div>
          {classStudents.length === 0 ? (
            <EmptyState icon={<User className="h-10 w-10" />} title="No students in this class" description="Enrol students first, then return here to mark attendance." />
          ) : (
            <>
              <form onSubmit={handleSave} className="space-y-2">
                <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white">
                  <table className="w-full text-left border-b border-slate-100">
                    <thead>
                      <tr className="bg-slate-50">
                        <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Student</th>
                        <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400 text-center">Status</th>
                        <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {classStudents.map((s) => (
                        <tr key={s.uid} className="hover:bg-slate-50">
                          <td className="px-4 py-3 text-sm text-slate-700">
                            <div className="font-medium">{s.displayName}</div>
                            <div className="text-xs text-slate-500">{s.email} \u00b7 {s.admissionNo}</div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex justify-center gap-1">
                              {(['present', 'late', 'excused', 'absent'] as AttendanceStatus[]).map((st) => (
                                <button key={st} type="button" onClick={() => toggleStatus(s.uid)} className={`px-2 py-1 text-xs rounded border transition-colors ${statuses[s.uid] === st ? STATUS_TONE[st] + ' border-transparent font-medium' : 'border-slate-200 text-slate-500 hover:bg-slate-100'}`}>{STATUS_LABEL[st]}</button>
                              ))}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <input type="text" placeholder="Note…" value={notes[s.uid] ?? ''} onChange={(e) => setNotes((prev) => ({ ...prev, [s.uid]: e.target.value }))} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent" />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="mt-2 text-xs text-slate-500">Tap a status to cycle: Present → Late → Excused → Absent.</p>
                <div className="mt-4 flex justify-end">
                  <Button type="submit" loading={saving} className="w-full sm:w-auto">{saving ? 'Saving…' : 'Save attendance'}</Button>
                </div>
              </form>
            </>
          )}
        </>
      )}
    </AppShell>
  );
}
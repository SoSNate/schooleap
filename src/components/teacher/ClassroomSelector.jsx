import { useState } from 'react';
import { ChevronDown, Plus, Users } from 'lucide-react';
import Swal from 'sweetalert2';

/**
 * Teacher classroom selector dropdown
 * Shows all classrooms and allows creating/switching between them
 */
export default function ClassroomSelector({
  classrooms,
  selectedClassroom,
  onSelect,
  onCreate,
  loading,
  isReadOnly = false,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);

  // ─── Handle classroom selection ────────────────────────────────────────────
  const handleSelect = (classroom) => {
    onSelect?.(classroom);
    setIsOpen(false);
  };

  // ─── Handle create new classroom ───────────────────────────────────────────
  const handleCreate = async (e) => {
    e.preventDefault();

    if (!newName.trim()) {
      Swal.fire({
        title: '❌ שגיאה',
        text: 'יש להזין שם לכיתה',
        icon: 'error',
        toast: true,
        position: 'top-start',
        timer: 2000,
        showConfirmButton: false,
      });
      return;
    }

    setCreating(true);
    try {
      const result = await onCreate?.(newName);
      if (result) {
        const createdName = newName;
        setNewName('');
        setShowCreateForm(false);
        setIsOpen(false);

        Swal.fire({
          title: '✅ כיתה חדשה',
          text: `כיתה "${createdName}" נוצרה בהצלחה\nקוד: ${result.classroom_code}`,
          icon: 'success',
          toast: true,
          position: 'top-start',
          timer: 3000,
          showConfirmButton: false,
        });
      } else {
        Swal.fire({
          title: '❌ שגיאה',
          text: 'לא ניתן ליצור כיתה',
          icon: 'error',
          toast: true,
          position: 'top-start',
          timer: 2000,
          showConfirmButton: false,
        });
      }
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-slate-100 dark:bg-slate-700/50 rounded-lg px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
        טוען כיתות...
      </div>
    );
  }

  // ─── Empty state: no classrooms yet ─────────────────────────────────────────
  if (classrooms.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4 space-y-3">
        <p className="text-sm font-bold text-slate-700 dark:text-slate-200">אין לך כיתות עדיין</p>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {isReadOnly ? 'יש לרכוש מנוי כדי ליצור כיתות' : 'יצור כיתה חדשה כדי להתחיל'}
        </p>
        {!isReadOnly && !showCreateForm ? (
          <button
            onClick={() => setShowCreateForm(true)}
            className="w-full px-4 py-2 text-sm font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
          >
            + יצור כיתה חדשה
          </button>
        ) : !isReadOnly ? (
          <form onSubmit={handleCreate} className="space-y-2">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="שם הכיתה (לדוגמה: כיתה ח1)"
              autoFocus
              className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={creating}
                className="flex-1 px-3 py-2 text-sm font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-60"
              >
                {creating ? 'יוצר...' : 'יצור'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCreateForm(false);
                  setNewName('');
                }}
                className="flex-1 px-3 py-2 text-sm font-bold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
              >
                ביטול
              </button>
            </div>
          </form>
        )}
      </div>
    );
  }

  if (!selectedClassroom) {
    return (
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg px-4 py-3 text-sm text-blue-900 dark:text-blue-200">
        בחר כיתה מהרשימה
      </div>
    );
  }

  return (
    <div className="relative w-full">
      {/* Main dropdown button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={loading}
        className="w-full flex items-center justify-between bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-3 text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">🏫</span>
          <div className="text-left">
            <div>{selectedClassroom.classroom_name}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-normal">
              {selectedClassroom.classroom_code} • {selectedClassroom.student_count || 0} תלמידים
            </div>
          </div>
        </div>
        <ChevronDown
          size={18}
          className={`transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg z-10">
          {/* Classrooms list */}
          <div className="max-h-48 overflow-y-auto">
            {classrooms.map((classroom) => (
              <button
                key={classroom.id}
                onClick={() => handleSelect(classroom)}
                className={`w-full text-right px-4 py-3 text-sm transition-colors flex items-center justify-between gap-2 ${
                  selectedClassroom.id === classroom.id
                    ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-200 font-bold'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/30'
                }`}
              >
                <div className="text-left">
                  <div>{classroom.classroom_name}</div>
                  <div className="text-xs opacity-70 font-normal">
                    {classroom.classroom_code}
                  </div>
                </div>
                <Users size={14} className="opacity-60" />
              </button>
            ))}
          </div>

          {/* Divider */}
          <div className="border-t border-slate-200 dark:border-slate-700" />

          {/* Create new classroom form — hidden in read-only mode */}
          {!isReadOnly && !showCreateForm ? (
            <button
              onClick={() => setShowCreateForm(true)}
              className="w-full text-right px-4 py-3 text-sm text-indigo-600 dark:text-indigo-400 font-bold hover:bg-indigo-50 dark:hover:bg-indigo-900/10 transition-colors flex items-center justify-between gap-2"
            >
              <span>יצירת כיתה חדשה</span>
              <Plus size={16} />
            </button>
          ) : !isReadOnly ? (
            <form onSubmit={handleCreate} className="px-4 py-3 border-t border-slate-200 dark:border-slate-700 space-y-2">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="שם הכיתה (לדוגמה: כיתה ח1)"
                autoFocus
                className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 px-3 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-60"
                >
                  {creating ? 'יוצר...' : 'יצור'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateForm(false);
                    setNewName('');
                  }}
                  className="flex-1 px-3 py-2 text-xs font-bold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
                >
                  ביטול
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}

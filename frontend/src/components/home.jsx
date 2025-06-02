import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

const Home = () => {
  const [weeklyRoutines, setWeeklyRoutines] = useState([]);
  const [muscleGroupLinks, setMuscleGroupLinks] = useState([]);
  const [exerciseLinks, setExerciseLinks] = useState([]);
  const [dailyEntries, setDailyEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const getWeekDates = () => {
    const today = new Date();
    const offsetHoy = (today.getDay() + 6) % 7;
    const monday = new Date(today);
    monday.setDate(today.getDate() - offsetHoy);

    const dates = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      dates.push(d);
    }
    return dates;
  };

  const weekDates = getWeekDates();

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(
    2,
    '0'
  )}-${String(today.getDate()).padStart(2, '0')}`;

  const monthName = today
    .toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
    .replace(/^./, (str) => str.toUpperCase());

  const getWeekNumberInMonth = (date) => {
    const firstOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
    const firstDayIndex = (firstOfMonth.getDay() + 6) % 7; 
    return Math.ceil((date.getDate() + firstDayIndex) / 7);
  };

  const currentWeekNumber = getWeekNumberInMonth(today);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        setLoading(true);
        const [wrRes, wrmgRes, wreRes, deRes] = await Promise.all([
          fetch('http://localhost:3000/api/weekly-routines'),
          fetch('http://localhost:3000/api/weekly-routine-muscle-groups'),
          fetch('http://localhost:3000/api/weekly-routine-exercises'),
          fetch('http://localhost:3000/api/daily-entries'),
        ]);

        if (!wrRes.ok || !wrmgRes.ok || !wreRes.ok || !deRes.ok) {
          throw new Error('Error cargando datos del servidor');
        }

        const [wrData, wrmgData, wreData, deData] = await Promise.all([
          wrRes.json(),
          wrmgRes.json(),
          wreRes.json(),
          deRes.json(),
        ]);

        setWeeklyRoutines(wrData);
        setMuscleGroupLinks(wrmgData);
        setExerciseLinks(wreData);
        setDailyEntries(deData);
      } catch (err) {
        console.error(err);
        setError('No se pudieron cargar las rutinas/datos');
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, []);

 
  const routineByDay = {};
  weeklyRoutines.forEach((r) => {
    routineByDay[r.day_of_week] = r;
  });

  const muscleGroupsByRoutine = {};
  muscleGroupLinks.forEach((link) => {
    const wrId = Number(link.weekly_routine_id);
    if (!muscleGroupsByRoutine[wrId]) muscleGroupsByRoutine[wrId] = [];
    muscleGroupsByRoutine[wrId].push({
      id: Number(link.muscle_group_id),
      nombre: link.muscle_group_name,
    });
  });

  const exercisesByRoutine = {};
  exerciseLinks.forEach((link) => {
    const wrId = Number(link.weekly_routine_id);
    if (!exercisesByRoutine[wrId]) exercisesByRoutine[wrId] = [];
    exercisesByRoutine[wrId].push({
      id: Number(link.exercise_id),
      nombre: link.exercise_name,
      series: Number(link.series),
      repeticiones: Number(link.repeticiones),
    });
  });

  const dailyByDate = {};
  dailyEntries.forEach((entry) => {
    const d = new Date(entry.fecha);
    const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
      d.getDate()
    ).padStart(2, '0')}`;
    dailyByDate[dateKey] = entry;
  });

  const handleCheckboxChange = async (entryId, checked) => {
    try {
      const res = await fetch(`http://localhost:3000/api/daily-entries/${entryId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: checked }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error actualizando estado');
      }
      setDailyEntries((prev) =>
        prev.map((e) => (e.id === entryId ? { ...e, completed: checked } : e))
      );
    } catch (err) {
      console.error(err);
      alert('No se pudo actualizar el estado de completado');
    }
  };

  if (loading) {
    return (
      <div className="bg-gray-800 min-h-screen text-white text-center p-10">
        <h1 className="text-3xl mb-6">Welcome to trainR</h1>
        <p>Cargando información...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gray-800 min-h-screen text-white text-center p-10">
        <h1 className="text-3xl mb-6">Welcome to trainR</h1>
        <p className="text-red-400">{error}</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 min-h-screen text-white text-center p-10">
      <h1 className="text-3xl font-semibold mb-4">Welcome to trainR</h1>

      <div className="mb-8">
        <p className="text-xl">
          <span className="font-medium">Mes actual:</span> {monthName}
        </p>
        <p className="text-lg">
          <span className="font-medium">Semana del mes:</span> {currentWeekNumber}
        </p>
      </div>

      <div className="grid grid-cols-7 gap-4">
        {weekDates.map((dateObj) => {
          const jsDay = dateObj.getDay(); 
          const dayOfWeek = jsDay === 0 ? 7 : jsDay; 
          const dateStr = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(
            2,
            '0'
          )}-${String(dateObj.getDate()).padStart(2, '0')}`;

          const routine = routineByDay[dayOfWeek];
          const dailyEntry = dailyByDate[dateStr];

          return (
            <div
              key={dateStr}
              className="bg-gray-700 p-4 rounded-lg flex flex-col justify-between"
            >
              <div>
                <p className="capitalize font-medium">
                  {dateObj.toLocaleDateString('es-ES', { weekday: 'long' })}
                </p>
                <p className="text-2xl font-semibold">{dateObj.getDate()}</p>
              </div>

              <div className="mt-3 text-left text-sm">
                {routine ? (
                  <>
                    <p className="font-medium mb-1">
                      Tipo:{' '}
                      {routine.routine_type === 'upper'
                        ? 'Tren superior'
                        : routine.routine_type === 'lower'
                        ? 'Tren inferior'
                        : 'Full body'}
                    </p>

                    <p className="font-medium mb-1">Grupos musculares:</p>
                    <ul className="list-disc list-inside mb-2">
                      {muscleGroupsByRoutine[Number(routine.id)]?.map((mg) => (
                        <li key={mg.id} className="capitalize">
                          {mg.nombre}
                        </li>
                      )) || <li className="italic">Sin grupos</li>}
                    </ul>

                    <p className="font-medium mb-1">Ejercicios:</p>
                    <ul className="list-disc list-inside mb-2">
                      {exercisesByRoutine[Number(routine.id)]?.map((ex) => (
                        <li key={ex.id}>
                          {ex.nombre} – {ex.series}×{ex.repeticiones}
                        </li>
                      )) || <li className="italic">Sin ejercicios</li>}
                    </ul>

                    <p className="font-medium mb-1">Comida:</p>
                    <p className="mb-2">
                      {dailyEntry?.comida || (
                        <span className="italic">Sin comida registrada</span>
                      )}
                    </p>

                    <div className="flex items-center mb-2">
                      <input
                        type="checkbox"
                        disabled={dateStr !== todayStr || !dailyEntry}
                        checked={dailyEntry?.completed || false}
                        onChange={(e) =>
                          dailyEntry && handleCheckboxChange(dailyEntry.id, e.target.checked)
                        }
                        className={`h-5 w-5 ${
                          dateStr === todayStr && dailyEntry
                            ? 'text-green-500'
                            : 'text-gray-500 cursor-not-allowed'
                        }`}
                      />
                      <label className="ml-2">
                        {dateStr === todayStr
                          ? 'Marcar como completado'
                          : dateStr < todayStr
                          ? 'No editable (día pasado)'
                          : 'Se puede marcar hoy'}
                      </label>
                    </div>

                    <Link
                      to={`/edit-routine/${routine.id}/${dateStr}`}
                      className="bg-yellow-500 hover:bg-yellow-600 text-white py-1 px-3 rounded text-sm"
                    >
                      Editar rutina
                    </Link>
                  </>
                ) : (
                  <div className="flex flex-col items-center">
                    <p className="italic text-gray-300 mb-2">No hay rutina</p>
                    <Link
                      to={`/add-routine/${dayOfWeek}`}
                      className="bg-green-500 hover:bg-green-600 text-white py-1 px-3 rounded"
                    >
                      Añadir rutina
                    </Link>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Home;

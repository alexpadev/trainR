import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

const Home = () => {
  const [weeklyRoutines, setWeeklyRoutines] = useState([]);
  const [muscleGroupLinks, setMuscleGroupLinks] = useState([]);
  const [exerciseLinks, setExerciseLinks] = useState([]);
  const [dailyEntries, setDailyEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const API = import.meta.env.VITE_API_URL || "https://trainR.onrender.com/api"
  
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
          fetch(`${API}/weekly-routines`),
          fetch(`${API}/weekly-routine-muscle-groups`),
          fetch(`${API}/weekly-routine-exercises`),
          fetch(`${API}/daily-entries`),
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
    dailyByDate[dateKey] = {
      id: entry.id,
      desayuno: entry.desayuno,
      comida: entry.comida,
      merienda: entry.merienda,
      cena: entry.cena,
      completed: entry.completed,
      weekly_routine_id: entry.weekly_routine_id,
    };
  });

  const handleCheckboxChange = async (entryId, checked) => {
    try {
      const res = await fetch(`${API}/daily-entries/${entryId}`, {
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

  const handleDeleteRoutine = async (routineIdToDelete, dateStr) => {
    const confirmar = window.confirm(
      '¿Estás seguro de que deseas eliminar esta rutina? Esto borrará también la entrada diaria asociada si existe.'
    );
    if (!confirmar) return;

    try {
      const res = await fetch(
        `${API}/weekly-routines/${routineIdToDelete}`,
        {
          method: 'DELETE',
        }
      );
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error eliminando la rutina');
      }

      setWeeklyRoutines((prev) =>
        prev.filter((r) => Number(r.id) !== Number(routineIdToDelete))
      );
      setDailyEntries((prev) =>
        prev.filter((e) => {
          const d = new Date(e.fecha);
          const eDateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
            2,
            '0'
          )}-${String(d.getDate()).padStart(2, '0')}`;
          return eDateKey !== dateStr;
        })
      );
    } catch (err) {
      console.error(err);
      alert(`No se pudo eliminar la rutina: ${err.message}`);
    }
  };

  if (loading) {
    return (
      <div className="bg-gray-800 min-h-screen text-white text-center p-4 md:p-10">
        <h1 className="text-2xl md:text-3xl mb-6">Welcome to trainR</h1>
        <p>Cargando información...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gray-800 min-h-screen text-white text-center p-4 md:p-10">
        <h1 className="text-2xl md:text-3xl mb-6">Welcome to trainR</h1>
        <p className="text-red-400">{error}</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 min-h-screen text-white text-center p-4 md:p-10">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-center">
        <p className="text-2xl md:text-3xl mr-0 sm:mr-2 mb-1 sm:mb-0">
          {monthName} -
        </p>
        <p className="text-2xl md:text-3xl">
          <span>Semana</span> {currentWeekNumber}
        </p>
      </div>

      <div className="grid sm:grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
        {weekDates.map((dateObj) => {
          const jsDay = dateObj.getDay();
          const dayOfWeek = jsDay === 0 ? 7 : jsDay;
          const dateStr = `${dateObj.getFullYear()}-${String(
            dateObj.getMonth() + 1
          ).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;

          const routine = routineByDay[dayOfWeek];
          const dailyEntry = dailyByDate[dateStr];

          const isToday = dateStr === todayStr;
          const highlightToday = isToday && routine;

          const formattedDate = dateObj
            .toLocaleDateString('es-ES', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })
            .replace(/^./, (str) => str.toUpperCase());

          return (
            <div
              key={dateStr}
              className={`
                bg-gray-700 
                p-4 
                rounded-lg 
                flex flex-col 
                ${highlightToday ? 'border border-violet-500' : ''}
              `}
            >
              <div className="flex flex-wrap justify-between items-center mb-2">
                <p className="capitalize font-medium text-md">{formattedDate}</p>

                {routine && (
                  <div className="flex flex-wrap space-x-2 mt-2 sm:mt-0">
                    <Link
                      to={`/edit-routine/${routine.id}/${dateStr}`}
                      className="border-2 border-emerald-500 hover:bg-gray-600 transition text-emerald-400 font-semibold py-1 px-2 rounded-full text-xs"
                    >
                      Editar
                    </Link>
                    <button
                      onClick={() => handleDeleteRoutine(routine.id, dateStr)}
                      className="border-2 border-red-500 hover:bg-gray-600 text-red-400 font-semibold py-1 px-2 rounded-full cursor-pointer text-xs transition"
                    >
                      Eliminar
                    </button>
                  </div>
                )}
              </div>

              <div className="text-left text-sm flex-1">
                {routine ? (
                  <>
                    <p className="font-medium mb-1 text-md">
                      {routine.routine_type === 'upper'
                        ? 'Tren superior'
                        : routine.routine_type === 'lower'
                        ? 'Tren inferior'
                        : 'Full body'}
                    </p>

                    <ul className="flex flex-wrap space-x-2 list-inside mb-2 text-gray-100">
                      {muscleGroupsByRoutine[Number(routine.id)]?.map((mg) => (
                        <li
                          key={mg.id}
                          className="capitalize border rounded-full px-2 py-1 text-xs mb-1"
                        >
                          {mg.nombre}
                        </li>
                      )) || <li className="italic">Sin grupos</li>}
                    </ul>

                    <p className="font-medium mb-1">Ejercicios:</p>
                    <ul className="list-disc list-inside mb-2">
                      {exercisesByRoutine[Number(routine.id)]?.map((ex) => (
                        <li key={ex.id}>
                          <span className="text-gray-100">{ex.nombre}</span>{' '}
                          <span className="text-gray-300 ml-1">
                            {ex.series}×{ex.repeticiones}
                          </span>
                        </li>
                      )) || <li className="italic">Sin ejercicios</li>}
                    </ul>

                    <p className="font-medium mb-1">Desayuno:</p>
                    <p className="mb-1 text-gray-100">
                      {dailyEntry?.desayuno || (
                        <span className="italic text-gray-200">No registrado</span>
                      )}
                    </p>
                    <p className="font-medium mb-1">Comida:</p>
                    <p className="mb-1 text-gray-100">
                      {dailyEntry?.comida || (
                        <span className="italic text-gray-200">No registrado</span>
                      )}
                    </p>
                    <p className="font-medium mb-1">Merienda:</p>
                    <p className="mb-1 text-gray-100">
                      {dailyEntry?.merienda || (
                        <span className="italic text-gray-200">No registrado</span>
                      )}
                    </p>
                    <p className="font-medium mb-1">Cena:</p>
                    <p className="mb-2 text-gray-100">
                      {dailyEntry?.cena || (
                        <span className="italic text-gray-200">No registrado</span>
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
                      <label className="ml-2 text-xs">
                        {dateStr === todayStr ? 'Completado' : 'No disponible'}
                      </label>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center">
                    <p className="italic text-gray-300 mb-2 mt-15">No hay rutina</p>
                    <Link
                      to={`/add-routine/${dayOfWeek}`}
                      className="bg-violet-500 hover:bg-violet-600 text-white py-2 px-4 rounded-full transition cursor-pointer text-sm mb-20 font-semibold"
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

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

const Home = () => {
  const [weeklyRoutines, setWeeklyRoutines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const getWeekDates = () => {
    const today = new Date();
    const dayOfWeek0_6 = (today.getDay() + 6) % 7; 
    const monday = new Date(today);
    monday.setDate(today.getDate() - dayOfWeek0_6);

    const dates = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      dates.push(d);
    }
    return dates;
  };

  const getWeekNumberInMonth = (date) => {
    const firstOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
    const firstDayIndex = (firstOfMonth.getDay() + 6) % 7;
    return Math.ceil((date.getDate() + firstDayIndex) / 7);
  };

  const buildRoutineMap = (routines) => {
    const map = {};
    routines.forEach((r) => {
      map[r.day_of_week] = r;
    });
    return map;
  };

  useEffect(() => {
    const fetchWeeklyRoutines = async () => {
      try {
        setLoading(true);
        const res = await fetch('http://localhost:3000/api/weekly-routines');
        if (!res.ok) {
          throw new Error('Error al obtener weekly routines');
        }
        const data = await res.json();
        setWeeklyRoutines(data);
      } catch (err) {
        console.error(err);
        setError('No se pudieron cargar las rutinas semanales.');
      } finally {
        setLoading(false);
      }
    };
    fetchWeeklyRoutines();
  }, []);

  const weekDates = getWeekDates();
  const today = new Date();
  const monthName = today
    .toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
    .replace(/^./, (str) => str.toUpperCase());
  const currentWeekNumber = getWeekNumberInMonth(today);
  const routineMap = buildRoutineMap(weeklyRoutines);

  if (loading) {
    return (
      <div className="bg-gray-800 min-h-screen text-white text-center p-10">
        <h1 className="text-3xl mb-6">Welcome to trainR</h1>
        <p>Cargando rutinas...</p>
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

          const routine = routineMap[dayOfWeek];

          return (
            <div
              key={dateObj.toISOString()}
              className="bg-gray-700 p-4 rounded-lg flex flex-col justify-between"
            >
              <div>
                <p className="capitalize font-medium">
                  {dateObj.toLocaleDateString('es-ES', { weekday: 'long' })}
                </p>
                <p className="text-2xl font-semibold">{dateObj.getDate()}</p>
              </div>

              <div className="mt-4">
                {routine ? (
                  <div>
                    <p className="font-medium">
                      {routine.routine_type === 'upper' ? 'Tren superior' : 'Tren inferior'}
                    </p>
                  </div>
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

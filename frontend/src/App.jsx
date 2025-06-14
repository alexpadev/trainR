import { UserContext } from './context/UserContext.js';
import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Home from './components/home.jsx';
import Header from './components/layout/Header.jsx';
import Login from './components/auth/Login.jsx';
import Register from './components/auth/Register.jsx';
import RoutineAdd from './components/routine/routineAdd.jsx';
import RoutineEdit from './components/routine/routineEdit.jsx';

function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [user, setUser] = useState(null)

  const updateToken = (newToken) => {
    setToken(newToken);
    if (newToken) {
      localStorage.setItem('token', newToken);
      console.log('User logged in successfully with token:', newToken);
    } else {
      localStorage.removeItem('token');
    }
  };

  return (
    <div>
      <UserContext.Provider value={{ token, setToken: updateToken, user, setUser }}>
        <Router>
          {token !== null && <Header />}
          <Routes>
            {token !== null ? (
              <>
                <Route path="/" element={<Home />} />
                <Route path="/add-routine/:dayOfWeek" element={<RoutineAdd />} />
                <Route path="/edit-routine/:routineId/:date" element={<RoutineEdit />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </>
            ) : (
              <>
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="*" element={<Navigate to="/login" replace />} />
              </>
            )}
          </Routes>
        </Router>
      </UserContext.Provider>
    </div>
  );
}

export default App;

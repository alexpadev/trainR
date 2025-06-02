import './App.css';
import { BrowserRouter as Router, Routes, Route, Navigate} from "react-router-dom"
import Home from './components/home.jsx';
import Header from './components/layout/Header.jsx';
import Login from './components/auth/Login.jsx';
import Register from './components/auth/Register.jsx';
import { UserContext } from './context/UserContext.js';
import { useState } from 'react';

function App() {

  const [token, setToken] = useState(localStorage.getItem("token"))

   const updateToken = (newToken) => {
    setToken(newToken)
    if (newToken) {
      localStorage.setItem("token", newToken)
      console.log("User logged in successfully with token:", newToken);
    } else {
      localStorage.removeItem("token")
    }
  }

  return (
    <div>
      <UserContext.Provider value={{token, setToken: updateToken}}>
      <Router>
        {token !== null && <Header/>}
        <Routes>
          {token !== null ? (
            <>
            <Route path="/" element={<Home/>}/>
            <Route path="*" element={<Navigate to="/" replace />} />
            </>
          ) : (
            <>
              <Route path="*" element={<Navigate to="login" replace />} />              
              <Route path="login" element={<Login/>}/>
              <Route path="register" element={<Register/>}/>
            </>
          )
        }
        </Routes>
      </Router>

      </UserContext.Provider>
    </div>
  )
}

export default App;

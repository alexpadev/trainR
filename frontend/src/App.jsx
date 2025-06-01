import './App.css';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './components/home.jsx';
import Header from './components/layout/Header.jsx';
import Login from './components/auth/Login.jsx';
import Register from './components/auth/Register.jsx';

function App() {
  return (
    <BrowserRouter>
    <Header />
      <Routes>
        
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

import './App.css';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './components/home.jsx';
import Header from './components/layout/Header.jsx';

function App() {
  return (
    <BrowserRouter>
    <Header />
      <Routes>
        
        <Route path="/" element={<Home />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

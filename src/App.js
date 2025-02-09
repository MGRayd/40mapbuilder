import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from './components/LandingPage';
import MissionMapBuilder from './components/MissionMapBuilder';
import './App.css';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/map-builder" element={<MissionMapBuilder />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;

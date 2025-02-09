import React from 'react';
import { Link } from 'react-router-dom';
import './LandingPage.css';

const LandingPage = () => {
  return (
    <div className="landing-container">
      <h1>40k Map Builder</h1>
      <div className="tools-container">
        <Link to="/map-builder" className="tool-card">
          <h2>Map Builder</h2>
          <p>Create and customize battle maps for your games</p>
        </Link>
      </div>
    </div>
  );
};

export default LandingPage;

import React from "react";
import "./LoadingSpinner.css";

const LoadingSpinner = () => {
  return (
    <div className="loading-overlay">
      <div className="minimal-spinner"></div>
    </div>
  );
};

export default LoadingSpinner;

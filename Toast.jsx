import React from 'react';

export const Toast = ({ message, isVisible }) => {
  return (
    <div id="toast" role="status" className={isVisible ? 'on' : ''}>
      {message}
    </div>
  );
};

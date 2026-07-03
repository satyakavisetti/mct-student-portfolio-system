import React from 'react';

const ErrorCard = ({ title = 'Something went wrong', message }) => (
  <div className="rounded-3xl border border-red-200 bg-red-50 p-5 shadow-sm">
    <p className="text-sm font-semibold text-red-900">{title}</p>
    {message ? <p className="mt-2 text-sm text-red-700">{message}</p> : null}
  </div>
);

export default ErrorCard;

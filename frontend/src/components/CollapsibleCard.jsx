import React, { useState } from 'react';

const CollapsibleCard = ({ title, defaultOpen = false, children, right }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center justify-between p-4 border-b">
        <div>
          <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
        </div>
        <div className="flex items-center gap-3">
          {right}
          <button onClick={() => setOpen((s) => !s)} className="text-sm text-gray-500">
            {open ? 'Collapse' : 'Expand'}
          </button>
        </div>
      </div>
      {open && <div className="p-4">{children}</div>}
    </div>
  );
};

export default CollapsibleCard;

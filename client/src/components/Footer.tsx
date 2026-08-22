import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-white border-t border-gray-200 mt-auto py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <p className="text-sm font-semibold text-gray-900">
          RepairConnect &copy; {new Date().getFullYear()}
        </p>
        <p className="text-xs text-gray-500 mt-2 max-w-md mx-auto">
          "Understand what's broken. Know whether it's worth repairing. Find the right person to fix it."
        </p>
        <div className="flex justify-center gap-4 text-xs font-semibold text-primary-600 mt-4">
          <span>Reduce Waste</span>
          <span>&bull;</span>
          <span>Extend Lifecycle</span>
          <span>&bull;</span>
          <span>Save Money</span>
        </div>
      </div>
    </footer>
  );
};

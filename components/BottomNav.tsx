import React from 'react';
import { NavLink } from 'react-router-dom';

const BottomNav: React.FC = () => {
  const navItems = [
    { to: '/', label: '首页', icon: <path d="M12 3L4 9v12h5v-7h6v7h5V9z" /> },
    { to: '/statistics', label: '统计', icon: <path d="M3 13.75C3 12.507 4.007 11.5 5.25 11.5h1.5C7.993 11.5 9 12.507 9 13.75v5.5C9 20.493 7.993 21.5 6.75 21.5h-1.5C4.007 21.5 3 20.493 3 19.25v-5.5zM10.5 7.75c0-1.243 1.007-2.25 2.25-2.25h1.5c1.243 0 2.25 1.007 2.25 2.25v11.5c0 1.243-1.007 2.25-2.25 2.25h-1.5c-1.243 0-2.25-1.007-2.25-2.25V7.75zM18 10.75c0-1.243 1.007-2.25 2.25-2.25h1.5c1.243 0 2.25 1.007 2.25 2.25v8.5c0 1.243-1.007 2.25-2.25 2.25h-1.5c-1.243 0-2.25-1.007-2.25-2.25v-8.5z" /> },
    { to: '/profile', label: '我的', icon: <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" /> },
  ];

  return (
    <nav className="fixed bottom-0 left-0 w-full bg-white border-t border-gray-200 pb-safe z-50">
      <div className="grid grid-cols-3 h-16 max-w-md mx-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-1 transition-colors w-full ${isActive ? 'text-black' : 'text-gray-400 hover:text-gray-600'
              }`
            }
          >
            <svg fill="currentColor" height="24" viewBox="0 0 24 24" width="24">
              {item.icon}
            </svg>
            <span className="text-[10px] font-medium">{item.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
};

export default BottomNav;

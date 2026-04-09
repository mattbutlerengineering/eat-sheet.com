import { NavLink } from 'react-router-dom';

const navItems = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/floor-plan', label: 'Floor Plan' },
  { to: '/reservations', label: 'Reservations' },
  { to: '/waitlist', label: 'Waitlist' },
  { to: '/guests', label: 'Guests' },
  { to: '/settings', label: 'Settings' },
];

export function Nav() {
  return (
    <nav className="w-56 bg-stone-900 text-stone-100 flex flex-col shrink-0">
      <div className="px-6 py-5 border-b border-stone-700">
        <span className="text-lg font-semibold tracking-tight">Eat Sheet</span>
      </div>
      <ul className="flex-1 py-4">
        {navItems.map(({ to, label, end }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={end}
              className={({ isActive }) =>
                `block px-6 py-2.5 text-sm font-medium rounded-none transition-colors ${
                  isActive
                    ? 'bg-stone-700 text-white'
                    : 'text-stone-400 hover:bg-stone-800 hover:text-stone-100'
                }`
              }
            >
              {label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

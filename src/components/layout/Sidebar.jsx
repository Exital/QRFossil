import { NavLink, useNavigate } from "react-router-dom";
import { useApp } from "../../context/AppContext.jsx";
import Icon from "../ui/Icon.jsx";

const navItems = [
  { to: "/", icon: "dashboard", label: "Dashboard", end: true },
  { to: "/codes", icon: "qr_code_2", label: "My QR Codes" },
  { to: "/settings", icon: "settings", label: "Settings" },
];

export default function Sidebar() {
  const { siteName } = useApp();
  const navigate = useNavigate();

  function handleCreate() {
    navigate("/codes/new");
  }

  return (
    <aside className="fixed left-0 top-0 z-50 flex h-screen w-[280px] flex-col space-y-base border-r border-outline-variant bg-surface-container-low p-md shadow-sm dark:border-outline dark:bg-surface-dim">
      <div className="mb-lg flex items-center gap-sm">
        <img
          alt="QRFossil logo"
          className="h-10 w-10 rounded-lg border border-outline-variant shadow-sm"
          src={`${import.meta.env.BASE_URL}mark.svg`}
        />
        <div>
          <h1 className="text-[20px] font-bold leading-tight text-primary dark:text-primary-fixed">
            {siteName}
          </h1>
          <p className="text-body-sm text-on-surface-variant">Self-hosted · GitHub Pages</p>
        </div>
      </div>

      <button
        type="button"
        onClick={handleCreate}
        className="mb-md flex w-full items-center justify-center gap-xs rounded-lg bg-primary px-md py-sm text-label-md text-on-primary shadow-sm transition-all duration-200 ease-in-out hover:opacity-90 active:scale-[0.98]"
      >
        <Icon name="add" size={20} />
        Create QR Code
      </button>

      <nav className="flex flex-1 flex-col gap-xs">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `flex items-center gap-sm rounded-lg px-sm py-xs transition-all duration-200 ease-in-out active:scale-[0.98] ${
                isActive
                  ? "bg-primary-container font-semibold text-on-primary-container shadow-sm"
                  : "text-secondary hover:bg-surface-container-highest hover:text-primary"
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon name={item.icon} filled={isActive} />
                {item.label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto flex flex-col gap-xs border-t border-outline-variant pt-md">
        <a
          href="https://github.com"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-sm rounded-lg px-sm py-xs text-secondary transition-colors duration-200 hover:bg-surface-container-highest hover:text-primary active:scale-[0.98]"
        >
          <Icon name="help" />
          Help Center
        </a>
      </div>
    </aside>
  );
}

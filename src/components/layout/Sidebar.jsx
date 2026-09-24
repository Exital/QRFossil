import { NavLink, useNavigate } from "react-router-dom";
import { useApp } from "../../context/AppContext.jsx";
import Icon from "../ui/Icon.jsx";
import markSvg from "../../assets/mark.svg";
import { useLayoutNav } from "./LayoutNavContext.jsx";

export const UPSTREAM_REPO = "https://github.com/Exital/QRFossil";

const navItems = [
  { to: "/", icon: "dashboard", label: "Dashboard", end: true },
  { to: "/codes", icon: "qr_code_2", label: "My QR Codes" },
  { to: "/docs", icon: "menu_book", label: "Docs" },
  { to: "/settings", icon: "settings", label: "Settings" },
];

export default function Sidebar() {
  const { siteName } = useApp();
  const navigate = useNavigate();
  const { navOpen, closeNav } = useLayoutNav();

  function handleCreate() {
    closeNav();
    navigate("/codes/new");
  }

  return (
    <aside
      id="app-sidebar"
      className={`fixed left-0 top-0 z-50 flex h-screen w-[min(350px,88vw)] flex-col space-y-base border-r border-outline-variant bg-surface-container-low p-md shadow-sm transition-transform duration-200 ease-out lg:w-[350px] lg:translate-x-0 ${
        navOpen ? "translate-x-0" : "-translate-x-full"
      }`}
    >
      <div className="mb-lg flex items-center gap-sm">
        <img
          alt="QRFossil logo"
          className="h-12 w-12 shrink-0 rounded-lg border border-outline-variant bg-surface-container-lowest shadow-sm"
          src={markSvg}
        />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[25px] font-bold leading-tight text-primary">{siteName}</h1>
          <p className="text-body-sm text-on-surface-variant">Self-hosted · GitHub Pages</p>
        </div>
        <button
          type="button"
          onClick={closeNav}
          className="rounded-full p-xs text-on-surface-variant hover:bg-surface-container-highest hover:text-on-surface lg:hidden"
          aria-label="Close menu"
        >
          <Icon name="close" />
        </button>
      </div>

      <button
        type="button"
        onClick={handleCreate}
        className="mb-md flex w-full items-center justify-center gap-xs rounded-lg bg-primary px-md py-sm text-label-md text-on-primary shadow-sm transition-all duration-200 ease-in-out hover:opacity-90 active:scale-[0.98]"
      >
        <Icon name="add" size={20} />
        Create QR Code
      </button>

      <nav className="flex flex-1 flex-col gap-xs overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={closeNav}
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
          href={UPSTREAM_REPO}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-sm rounded-lg px-sm py-xs text-secondary transition-colors duration-200 hover:bg-surface-container-highest hover:text-primary active:scale-[0.98]"
        >
          <Icon name="code" />
          GitHub
        </a>
      </div>
    </aside>
  );
}

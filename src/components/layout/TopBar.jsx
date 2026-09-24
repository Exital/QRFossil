import { Link } from "react-router-dom";
import { useApp } from "../../context/AppContext.jsx";
import Icon from "../ui/Icon.jsx";
import { useLayoutNav } from "./LayoutNavContext.jsx";

export default function TopBar({ title, search, onSearchChange }) {
  const { canEdit, darkMode, setDarkMode, requestWriteAccess, forgetToken, hasToken, isLocalDev, repo } = useApp();
  const { openNav } = useLayoutNav();

  async function handleEnableEditing() {
    await requestWriteAccess();
  }

  return (
    <header className="sticky top-0 z-30 w-full border-b border-outline-variant bg-surface-container-lowest">
      <div className="flex h-16 items-center justify-between gap-sm px-margin-mobile sm:h-20 lg:px-margin-desktop">
        <div className="flex min-w-0 flex-1 items-center gap-sm sm:gap-md">
          <button
            type="button"
            onClick={openNav}
            className="shrink-0 rounded-lg p-xs text-on-surface-variant transition-colors hover:bg-surface-container-highest hover:text-primary lg:hidden"
            aria-label="Open menu"
            aria-controls="app-sidebar"
          >
            <Icon name="menu" />
          </button>
          <span className="truncate text-headline-sm font-bold tracking-tight text-on-surface sm:text-headline-md">
            {title}
          </span>
          {onSearchChange && (
            <div className="relative hidden min-w-0 items-center rounded-lg transition-all focus-within:ring-2 focus-within:ring-primary md:flex">
              <Icon name="search" size={20} className="pointer-events-none absolute left-sm text-on-surface-variant" />
              <input
                className="w-48 rounded-lg border-none bg-surface-container-low py-xs pl-xl pr-sm text-body-sm text-on-surface placeholder:text-outline focus:ring-0 lg:w-80"
                placeholder="Search codes..."
                type="search"
                value={search || ""}
                onChange={(e) => onSearchChange(e.target.value)}
              />
            </div>
          )}
        </div>

        <div className="hidden items-center gap-md lg:flex">
          <Link className="text-on-surface-variant transition-opacity hover:text-primary hover:opacity-80" to="/docs">
            Docs
          </Link>
          <span className="text-on-surface-variant">·</span>
          <span className="font-mono text-label-sm text-on-surface-variant">
            {isLocalDev ? "local preview" : repo.owner && repo.repo ? `${repo.owner}/${repo.repo}` : "read-only"}
          </span>
        </div>

        <div className="flex shrink-0 items-center gap-xs sm:gap-sm">
          <span
            className={`hidden rounded-full px-sm py-xs text-label-sm sm:inline ${
              canEdit ? "bg-primary/15 text-primary" : "bg-surface-container text-on-surface-variant"
            }`}
          >
            {canEdit ? (isLocalDev ? "Local editor" : "Editor") : "Read-only"}
          </span>

          {!canEdit && (
            <button
              type="button"
              onClick={handleEnableEditing}
              className="rounded-lg bg-primary px-sm py-xs text-label-sm text-on-primary shadow-sm transition-opacity hover:opacity-90"
            >
              <span className="sm:hidden">Edit</span>
              <span className="hidden sm:inline">Enable Editing</span>
            </button>
          )}

          {hasToken && !isLocalDev && (
            <button
              type="button"
              onClick={forgetToken}
              className="hidden rounded-lg border border-outline-variant px-sm py-xs text-label-sm text-on-surface-variant transition-colors hover:bg-surface-container-low md:inline"
            >
              Forget Token
            </button>
          )}

          <button
            type="button"
            onClick={() => setDarkMode(!darkMode)}
            className="rounded-full p-xs text-on-surface-variant transition-colors hover:bg-surface-container-highest hover:text-primary"
            aria-label="Toggle dark mode"
          >
            <Icon name={darkMode ? "light_mode" : "dark_mode"} />
          </button>
        </div>
      </div>

      {onSearchChange && (
        <div className="border-t border-outline-variant/60 px-margin-mobile pb-sm pt-sm md:hidden">
          <div className="relative flex items-center rounded-lg focus-within:ring-2 focus-within:ring-primary">
            <Icon name="search" size={20} className="pointer-events-none absolute left-sm text-on-surface-variant" />
            <input
              className="w-full rounded-lg border-none bg-surface-container-low py-xs pl-xl pr-sm text-body-sm text-on-surface placeholder:text-outline focus:ring-0"
              placeholder="Search codes..."
              type="search"
              value={search || ""}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>
        </div>
      )}
    </header>
  );
}

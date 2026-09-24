import { Link } from "react-router-dom";
import { useApp } from "../../context/AppContext.jsx";
import Icon from "../ui/Icon.jsx";

export default function TopBar({ title, search, onSearchChange }) {
  const { canEdit, darkMode, setDarkMode, requestWriteAccess, forgetToken, hasToken, isLocalDev, repo } = useApp();

  async function handleEnableEditing() {
    await requestWriteAccess();
  }

  return (
    <header className="sticky top-0 z-40 flex h-20 w-full items-center justify-between border-b border-outline-variant bg-surface-container-lowest px-margin-mobile lg:px-margin-desktop">
      <div className="flex items-center gap-md">
        <span className="text-headline-md font-bold tracking-tight text-on-surface">{title}</span>
        {onSearchChange && (
          <div className="relative hidden items-center rounded-lg transition-all focus-within:ring-2 focus-within:ring-primary lg:flex">
            <Icon name="search" size={20} className="pointer-events-none absolute left-sm text-on-surface-variant" />
            <input
              className="w-80 rounded-lg border-none bg-surface-container-low py-xs pl-xl pr-sm text-body-sm text-on-surface placeholder:text-outline focus:ring-0"
              placeholder="Search codes..."
              type="search"
              value={search || ""}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>
        )}
      </div>

      <div className="hidden items-center gap-md md:flex">
        <Link className="text-on-surface-variant transition-opacity hover:text-primary hover:opacity-80" to="/docs">
          Docs
        </Link>
        <span className="text-on-surface-variant">·</span>
        <span className="font-mono text-label-sm text-on-surface-variant">
          {isLocalDev ? "local preview" : repo.owner && repo.repo ? `${repo.owner}/${repo.repo}` : "read-only"}
        </span>
      </div>

      <div className="flex items-center gap-sm">
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
            Enable Editing
          </button>
        )}

        {hasToken && !isLocalDev && (
          <button
            type="button"
            onClick={forgetToken}
            className="hidden rounded-lg border border-outline-variant px-sm py-xs text-label-sm text-on-surface-variant transition-colors hover:bg-surface-container-low sm:inline"
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
    </header>
  );
}

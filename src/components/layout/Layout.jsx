import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar.jsx";
import { LayoutNavProvider, useLayoutNav } from "./LayoutNavContext.jsx";

function LayoutShell() {
  const { navOpen, closeNav } = useLayoutNav();

  return (
    <div className="flex h-full overflow-hidden bg-background text-on-background">
      {navOpen && (
        <button
          type="button"
          aria-label="Close menu"
          className="fixed inset-0 z-40 bg-inverse-surface/50 backdrop-blur-sm lg:hidden"
          onClick={closeNav}
        />
      )}
      <Sidebar />
      <div className="flex h-screen min-w-0 flex-1 flex-col overflow-hidden lg:ml-[350px]">
        <Outlet />
      </div>
    </div>
  );
}

export default function Layout() {
  return (
    <LayoutNavProvider>
      <LayoutShell />
    </LayoutNavProvider>
  );
}

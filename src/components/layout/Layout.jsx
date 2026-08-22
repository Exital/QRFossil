import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar.jsx";

export default function Layout() {
  return (
    <div className="flex h-full overflow-hidden bg-background text-on-background">
      <Sidebar />
      <div className="ml-[280px] flex h-screen flex-1 flex-col overflow-hidden">
        <Outlet />
      </div>
    </div>
  );
}

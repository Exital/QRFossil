import { HashRouter, Navigate, Route, Routes } from "react-router-dom";
import AuthModal from "./components/modals/AuthModal.jsx";
import Layout from "./components/layout/Layout.jsx";
import Toast from "./components/ui/Toast.jsx";
import { AppProvider, useApp } from "./context/AppContext.jsx";
import CodesListPage from "./pages/CodesListPage.jsx";
import DashboardPage from "./pages/DashboardPage.jsx";
import DocsPage from "./pages/DocsPage.jsx";
import EditorPage from "./pages/EditorPage.jsx";
import SettingsPage from "./pages/SettingsPage.jsx";

function AppRoutes() {
  const { toast, showSetup, authModalOpen, closeAuthModal, connectGitHub } = useApp();

  return (
    <>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<DashboardPage />} />
          <Route path="codes" element={<CodesListPage />} />
          <Route path="codes/:slug" element={<EditorPage />} />
          <Route path="docs" element={<DocsPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {toast && <Toast message={toast.message} kind={toast.kind} />}
      <AuthModal open={authModalOpen} onClose={closeAuthModal} onConnect={connectGitHub} />
      {showSetup && (
        <div className="fixed bottom-gutter left-[calc(350px+30px)] z-50 max-w-sm rounded-lg border border-primary/30 bg-primary-fixed px-md py-sm text-body-sm text-on-primary-fixed shadow-card">
          Finish setup in Settings so QR URLs resolve correctly.
        </div>
      )}
    </>
  );
}

export default function App() {
  return (
    <AppProvider>
      <HashRouter>
        <AppRoutes />
      </HashRouter>
    </AppProvider>
  );
}

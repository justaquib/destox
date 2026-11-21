import { useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Sidebar } from "./components/Sidebar";
import { AllAppsView } from "./features/applications/AllAppsView";
import { RecentlyInstalledView } from "./features/applications/RecentlyInstalledView";
import { LargeFilesView } from "./features/applications/LargeFilesView";
import { TrashBinView } from "./features/trash/TrashBinView";
import { useAppStore } from "./store/appStore";

function AppShell() {
  const store = useAppStore();
  const { apps, query, sort, message, confirming, installed, trash } = store;

  const visibleApps = apps.filter((a) =>
    a.name.toLowerCase().includes(query.toLowerCase()),
  );
  const sorted = [...visibleApps].sort((a, b) =>
    sort === "size" ? b.sizeMb - a.sizeMb : a.name.localeCompare(b.name),
  );
  const selected = apps.filter((a) => a.selected);
  const selectedSize =
    selected.reduce((t, a) => t + a.sizeMb, 0) > 1024
      ? `${(selected.reduce((t, a) => t + a.sizeMb, 0) / 1024).toFixed(2)} GB`
      : `${selected.reduce((t, a) => t + a.sizeMb, 0)} MB`;

  useEffect(() => {
    store.fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="app-shell">
      <section className="window">
        <Sidebar />
        <div className="content">
          <header className="topbar">
            <div>
              <p className="eyebrow">Application manager</p>
              <h1>Destox</h1>
            </div>
            <div className="topbar-actions">
              <label className="search-box">
                <input
                  aria-label="Search applications"
                  onChange={(e) => store.setQuery(e.target.value)}
                  placeholder="Search"
                  value={query}
                />
              </label>
            </div>
          </header>

          <Routes>
            <Route
              path="/"
              element={
                <AllAppsView
                  apps={apps}
                  visibleApps={sorted}
                  selected={selected}
                  selectedSize={selectedSize}
                  sort={sort}
                  setSort={store.setSort}
                  onToggle={store.toggleApp}
                  onUninstall={() => store.setConfirming(true)}
                  message={message}
                />
              }
            />
            <Route
              path="/recently-installed"
              element={<RecentlyInstalledView installed={installed} />}
            />
            <Route path="/large-files" element={<LargeFilesView />} />
            <Route
              path="/trash"
              element={
                <TrashBinView
                  trash={trash}
                  onRescan={store.rescanTrash}
                  onDelete={store.deleteTrash}
                  onRecover={store.recoverTrash}
                />
              }
            />
          </Routes>
        </div>
      </section>

      {confirming && (
        <div className="modal-backdrop" role="presentation">
          <div className="confirm-modal" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
            <h2 id="confirm-title">Uninstall selected apps?</h2>
            <p>
              {selected.length} applications and their related files will be deleted permanently. You’ll free up {selectedSize}.
            </p>
            <div className="modal-actions">
              <button onClick={() => store.setConfirming(false)} type="button">
                Cancel
              </button>
              <button
                className="confirm-button"
                onClick={() => store.uninstallSelected()}
                type="button"
              >
                Uninstall
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  );
}

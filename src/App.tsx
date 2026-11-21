import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { CloudSun } from "lucide-react";
import { Sidebar } from "./components/Sidebar";
import { AllAppsView } from "./features/applications/AllAppsView";
import { RecentlyInstalledView } from "./features/applications/RecentlyInstalledView";
import { LargeFilesView } from "./features/applications/LargeFilesView";
import { TrashBinView } from "./features/trash/TrashBinView";
import { PermissionsView } from "./features/permissions/PermissionsView";
import { AboutView } from "./features/about/AboutView";
import { useAppStore } from "./store/appStore";
import { getSystemInfo } from "./lib/tauri";
import { getLocalWeather, WEATHER_ENABLED_KEY } from "./lib/weather";

function AppShell() {
  const store = useAppStore();
  const { apps, query, sort, message, confirming, installed, trash, loading } = store;
  const [userName, setUserName] = useState("there");
  const [weather, setWeather] = useState<string | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);

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
    getSystemInfo().then((info) => setUserName(info.user_name || "there")).catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadWeather = () => {
    if (localStorage.getItem(WEATHER_ENABLED_KEY) !== "true") {
      setWeather("Enable weather in Permissions");
      return;
    }
    setWeatherLoading(true);
    getLocalWeather()
      .then(setWeather)
      .catch(() => setWeather("Weather unavailable · check internet"))
      .finally(() => setWeatherLoading(false));
  };

  useEffect(() => {
    const onWeatherEnabled = () => {
      if (localStorage.getItem(WEATHER_ENABLED_KEY) === "true") loadWeather();
      else setWeather(null);
    };
    window.addEventListener("destox:weather-enabled", onWeatherEnabled);
    if (localStorage.getItem(WEATHER_ENABLED_KEY) === "true") loadWeather();
    return () => window.removeEventListener("destox:weather-enabled", onWeatherEnabled);
    // loadWeather is intentionally run on mount and when the permission changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="app-shell">
      <section className="window">
        <Sidebar />
        <div className="content">
          <header className="topbar">
            <div>
              <p className="eyebrow">Destox . System</p>
              <h1>Hi {userName}</h1>
            </div>
            <div className="topbar-actions">
              <button className="weather-pill" onClick={loadWeather} type="button" aria-label="Get local weather">
                <CloudSun size={18} />
                <span>{weatherLoading ? "Checking weather…" : weather ?? "Get local weather"}</span>
              </button>
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
            <Route path="/permissions" element={<PermissionsView />} />
            <Route path="/about" element={<AboutView />} />
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

      {loading && (
        <div className="modal-backdrop" role="presentation">
          <div className="confirm-modal" role="dialog" aria-modal="true">
            <h2>Loading…</h2>
            <p>Scanning your Mac for apps and files.</p>
          </div>
        </div>
      )}

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

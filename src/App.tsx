import { useEffect, useRef, useState } from "react";
import { BrowserRouter, Routes, Route, useLocation, useNavigate } from "react-router-dom";
import { listen } from "@tauri-apps/api/event";
import { CloudSun } from "lucide-react";
import { Sidebar } from "./components/Sidebar";
import { AllAppsView } from "./features/applications/AllAppsView";
import { RecentlyInstalledView } from "./features/applications/RecentlyInstalledView";
import { LargeFilesView } from "./features/applications/LargeFilesView";
import { TrashBinView } from "./features/trash/TrashBinView";
import { PermissionsView } from "./features/permissions/PermissionsView";
import { AboutView } from "./features/about/AboutView";
import { PreferencesView } from "./features/preferences/PreferencesView";
import { PortsView } from "./features/ports/PortsView";
import { useAppStore } from "./store/appStore";
import { getPermissions } from "./lib/tauri";
import { getSystemInfo } from "./lib/tauri";
import { getLocalWeather, WEATHER_ENABLED_KEY } from "./lib/weather";
import type { LargeScanProgress } from "./features/applications/types";

function AppShell() {
  const navigate = useNavigate();
  const location = useLocation();
  const store = useAppStore();
  const setLargeScanProgress = useAppStore((state) => state.setLargeScanProgress);
  const { apps, query, sort, message, confirming, installed, trash, loading } = store;
  const { largeScanProgress, scanInBackground } = store;
  const [splashVisible, setSplashVisible] = useState(true);
  const initialLoadStarted = useRef(false);
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
    if (initialLoadStarted.current) return;
    initialLoadStarted.current = true;
    const minimumSplash = new Promise<void>((resolve) => window.setTimeout(resolve, 700));
    void Promise.allSettled([store.fetchAll(), minimumSplash]).then(() => setSplashVisible(false));
    getSystemInfo().then((info) => setUserName(info.user_name || "there")).catch(() => undefined);
    getPermissions().then((perms) => { if (perms.some((perm) => !perm.granted)) navigate("/permissions"); }).catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    let disposed = false;
    void listen<LargeScanProgress>("large-scan-progress", ({ payload }) => {
      setLargeScanProgress(payload);
    }).then((stop) => {
      if (disposed) stop();
      else unlisten = stop;
    });
    return () => {
      disposed = true;
      unlisten?.();
    };
  }, [setLargeScanProgress]);

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
                  onUninstall={() => {
                    if (localStorage.getItem("destox.confirmDelete") === "false") {
                      store.uninstallSelected();
                    } else {
                      store.setConfirming(true);
                    }
                  }}
                  message={message}
                />
              }
            />
            <Route
              path="/recently-installed"
              element={<RecentlyInstalledView installed={installed} onDelete={store.uninstallRecentlyInstalled} />}
            />
            <Route path="/large-files" element={<LargeFilesView />} />
            <Route path="/permissions" element={<PermissionsView />} />
            <Route path="/about" element={<AboutView />} />
            <Route path="/preferences" element={<PreferencesView />} />
            <Route path="/ports" element={<PortsView />} />
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

      {(splashVisible || loading) && (
        <div className="modal-backdrop splash-screen" role="dialog" aria-modal="true" aria-label="Loading Destox" style={{ background: "rgba(232,238,235,0.96)", backdropFilter: "blur(10px)" }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
            <img src="/icon.png" alt="Destox" style={{ width: 96, height: 96, borderRadius: 24, objectFit: "cover", boxShadow: "0 12px 32px rgba(46,66,59,0.18)" }} />
            <h2 style={{ margin: 0, color: "#26332f", fontSize: 24, fontWeight: 680 }}>Destox</h2>
            <p style={{ margin: 0, color: "#8a9691", fontSize: 12 }}>Loading your Mac…</p>
          </div>
        </div>
      )}

      {largeScanProgress && !largeScanProgress.complete && (location.pathname !== "/large-files" || scanInBackground) && (
        <div className="scan-toast" role="status" aria-live="polite">
          <span className="scan-toast-spinner" aria-hidden="true" />
          <div>
            <strong>Large file scan running</strong>
            <span>{largeScanProgress.stage === "folders"
              ? `${largeScanProgress.scanned_entries.toLocaleString()} entries checked · ${formatBytes(largeScanProgress.folder_size_bytes)} in folders`
              : `${largeScanProgress.scanned_entries.toLocaleString()} entries checked · ${largeScanProgress.files_found.toLocaleString()} large files found`}</span>
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

function formatBytes(bytes: number) {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${bytes.toLocaleString()} B`;
}

export default function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  );
}

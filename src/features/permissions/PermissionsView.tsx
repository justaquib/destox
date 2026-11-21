import { useEffect, useState } from "react";
import { Icon } from "../../components/Icon";
import { getPermissions, openPermissionSettings } from "../../lib/tauri";
import type { PermissionStatus } from "../../features/applications/types";
import { WEATHER_ENABLED_KEY } from "../../lib/weather";

export function PermissionsView() {
  const [permissions, setPermissions] = useState<PermissionStatus[]>([]);
  const [loading, setLoading] = useState(false);
  const [weatherEnabled, setWeatherEnabled] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      setPermissions(await getPermissions());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    setWeatherEnabled(localStorage.getItem(WEATHER_ENABLED_KEY) === "true");
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  const toggleWeather = () => {
    const next = !weatherEnabled;
    setWeatherEnabled(next);
    localStorage.setItem(WEATHER_ENABLED_KEY, String(next));
    window.dispatchEvent(new Event("destox:weather-enabled"));
  };

  const grantedCount = permissions.filter((p) => p.granted).length + Number(weatherEnabled);
  const permissionCount = permissions.length + 1;

  return (
    <>
      <div className="toolbar">
        <p>
          <strong>Permissions</strong>
          <span>· {grantedCount}/{permissionCount} granted</span>
        </p>
        <button
          className="uninstall-button"
          type="button"
          onClick={load}
          style={{ marginLeft: "auto" }}
        >
          Rescan
        </button>
      </div>
      <div className="app-list">
        {loading && <div className="empty-state"><strong>Checking permissions…</strong></div>}
        {!loading && permissions.length === 0 && (
          <div className="empty-state">
            <Icon name="info" size={24} />
            <strong>No system permissions need attention</strong>
          </div>
        )}
        {permissions.map((perm, index) => (
          <div className="app-row" key={`${perm.name}-${index}`}>
            <span />
            <span className="app-icon">
              <Icon name="settings" size={18} />
            </span>
            <span className="app-details">
              <strong>{perm.name}</strong>
              <small>{perm.description}</small>
            </span>
            <span className="app-size">{perm.granted ? "Granted" : "Missing"}</span>
            <span className="row-arrow" style={{ display: "flex", gap: "6px", opacity: 1 }}>
              <button
                type="button"
                onClick={openPermissionSettings}
                aria-pressed={perm.granted}
                style={{
                  width: 44,
                  height: 24,
                  borderRadius: 12,
                  border: "none",
                  cursor: "pointer",
                  background: perm.granted ? "#527666" : "#cfd8d3",
                  position: "relative",
                  padding: 0,
                  transition: "background 160ms ease",
                  flexShrink: 0,
                }}
                title={perm.granted ? "Granted" : "Open System Settings to grant"}
              >
                <span
                  style={{
                    position: "absolute",
                    top: 2,
                    left: perm.granted ? 22 : 2,
                    width: 20,
                    height: 20,
                    borderRadius: "50%",
                    background: "#fff",
                    boxShadow: "0 1px 2px rgba(0,0,0,0.25)",
                    transition: "left 160ms ease",
                  }}
                />
              </button>
            </span>
          </div>
        ))}
        {!loading && (
          <div className="app-row">
            <span />
            <span className="app-icon">
              <Icon name="weather" size={18} />
            </span>
            <span className="app-details">
              <strong>Weather and approximate location</strong>
              <small>Shares your public IP with ipapi.co to estimate your city, then loads weather. No GPS access is needed.</small>
            </span>
            <span className="app-size">{weatherEnabled ? "Enabled" : "Disabled"}</span>
            <span className="row-arrow" style={{ display: "flex", gap: "6px", opacity: 1 }}>
              <button
                type="button"
                onClick={toggleWeather}
                aria-pressed={weatherEnabled}
                style={{
                  width: 44,
                  height: 24,
                  borderRadius: 12,
                  border: "none",
                  cursor: "pointer",
                  background: weatherEnabled ? "#527666" : "#cfd8d3",
                  position: "relative",
                  padding: 0,
                  transition: "background 160ms ease",
                  flexShrink: 0,
                }}
                title={weatherEnabled ? "Disable local weather" : "Enable local weather"}
              >
                <span
                  style={{
                    position: "absolute",
                    top: 2,
                    left: weatherEnabled ? 22 : 2,
                    width: 20,
                    height: 20,
                    borderRadius: "50%",
                    background: "#fff",
                    boxShadow: "0 1px 2px rgba(0,0,0,0.25)",
                    transition: "left 160ms ease",
                  }}
                />
              </button>
            </span>
          </div>
        )}
      </div>
    </>
  );
}

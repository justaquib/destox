import { useEffect, useState } from "react";

const KEYS = {
  minSize: "destox.minLargeFileSizeMb",
  minFolderSize: "destox.minLargeFolderSizeMb",
  scanHidden: "destox.scanHidden",
  confirmDelete: "destox.confirmDelete",
  autoScan: "destox.autoScan",
};

function usePref(key: string, initial: string) {
  const [value, setValue] = useState(() => localStorage.getItem(key) ?? initial);
  useEffect(() => {
    localStorage.setItem(key, value);
  }, [key, value]);
  return [value, setValue] as const;
}

export function PreferencesView() {
  const [minSize, setMinSize] = usePref(KEYS.minSize, "5");
  const [minFolderSize, setMinFolderSize] = usePref(KEYS.minFolderSize, "10");
  const [scanHidden, setScanHidden] = usePref(KEYS.scanHidden, "false");
  const [confirmDelete, setConfirmDelete] = usePref(KEYS.confirmDelete, "true");
  const [autoScan, setAutoScan] = usePref(KEYS.autoScan, "true");

  const toggle = (value: string, setter: (v: string) => void) =>
    setter(value === "true" ? "false" : "true");

  return (
    <>
      <div className="toolbar">
        <p>
          <strong>Preferences</strong>
        </p>
      </div>
      <div className="app-list">
        <div style={{ padding: 24, display: "grid", gap: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 14px", border: "1px solid #e4e9e7", borderRadius: 10, background: "#fff" }}>
            <div>
              <strong style={{ display: "block", fontSize: 12 }}>Minimum large file size (MB)</strong>
              <small style={{ color: "#8a9691", fontSize: 10 }}>Files smaller than this are ignored in Large Files.</small>
            </div>
            <input
              type="number"
              min={1}
              step={1}
              aria-label="Minimum large file size in megabytes"
              value={minSize}
              onChange={(e) => setMinSize(e.target.value)}
              style={{ width: 80, padding: "6px 8px", border: "1px solid #dfe5e2", borderRadius: 6 }}
            />
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 14px", border: "1px solid #e4e9e7", borderRadius: 10, background: "#fff" }}>
            <div>
              <strong style={{ display: "block", fontSize: 12 }}>Minimum large folder size (MB)</strong>
              <small style={{ color: "#8a9691", fontSize: 10 }}>Folders smaller than this are omitted from the Folders view.</small>
            </div>
            <input
              type="number"
              min={1}
              step={1}
              aria-label="Minimum large folder size in megabytes"
              value={minFolderSize}
              onChange={(e) => setMinFolderSize(e.target.value)}
              style={{ width: 80, padding: "6px 8px", border: "1px solid #dfe5e2", borderRadius: 6 }}
            />
          </div>

          {[
            { label: "Scan hidden files", desc: "Include dotfiles when scanning.", key: "scanHidden", value: scanHidden, set: setScanHidden },
            { label: "Confirm before deleting files", desc: "Ask before permanently deleting a file from Large Files.", key: "confirmDelete", value: confirmDelete, set: setConfirmDelete },
            { label: "Auto-scan on open", desc: "Automatically scan when opening Large Files.", key: "autoScan", value: autoScan, set: setAutoScan },
          ].map((item) => (
            <div key={item.key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 14px", border: "1px solid #e4e9e7", borderRadius: 10, background: "#fff" }}>
              <div>
                <strong style={{ display: "block", fontSize: 12 }}>{item.label}</strong>
                <small style={{ color: "#8a9691", fontSize: 10 }}>{item.desc}</small>
              </div>
              <button
                type="button"
                onClick={() => toggle(item.value, item.set)}
                style={{
                  width: 44,
                  height: 24,
                  borderRadius: 12,
                  border: "none",
                  cursor: "pointer",
                  background: item.value === "true" ? "#527666" : "#cfd8d3",
                  position: "relative",
                  padding: 0,
                  transition: "background 160ms ease",
                  flexShrink: 0,
                }}
              >
                <span
                  style={{
                    position: "absolute",
                    top: 2,
                    left: item.value === "true" ? 22 : 2,
                    width: 20,
                    height: 20,
                    borderRadius: "50%",
                    background: "#fff",
                    boxShadow: "0 1px 2px rgba(0,0,0,0.25)",
                    transition: "left 160ms ease",
                  }}
                />
              </button>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

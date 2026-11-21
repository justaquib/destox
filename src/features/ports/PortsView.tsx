import { useEffect, useState } from "react";
import { Icon } from "../../components/Icon";
import { getPorts, killPort } from "../../lib/tauri";
import type { PortInfo } from "../../features/applications/types";

export function PortsView() {
  const [ports, setPorts] = useState<PortInfo[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      setPorts(await getPorts());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <>
      <div className="toolbar">
        <p>
          <strong>{ports.length} listening ports</strong>
        </p>
        <button className="uninstall-button" type="button" onClick={load} style={{ marginLeft: "auto" }}>
          Rescan
        </button>
      </div>
      <div className="app-list">
        {loading && <div className="empty-state"><strong>Scanning ports…</strong></div>}
        {!loading && ports.length === 0 && (
          <div className="empty-state">
            <Icon name="info" size={24} />
            <strong>No listening ports found</strong>
          </div>
        )}
        {ports.map((p, index) => (
          <div className="app-row" key={`${p.port}-${p.pid}-${index}`}>
            <span />
            <span className="app-icon">
              <Icon name="network" size={18} />
            </span>
            <span className="app-details">
              <strong>Port {p.port}</strong>
              <small>{p.process} (PID {p.pid}) · {p.protocol}</small>
            </span>
            <span className="app-size">{p.protocol}</span>
            <span className="row-arrow" style={{ display: "flex", gap: "6px", opacity: 1 }}>
              <button
                type="button"
                title="Kill process"
                onClick={async () => {
                  await killPort(p.pid);
                  await load();
                }}
                style={{ border: "none", background: "transparent", cursor: "pointer", color: "#a46e68" }}
              >
                <Icon name="trash" size={16} />
              </button>
            </span>
          </div>
        ))}
      </div>
    </>
  );
}

import { useEffect, useState } from "react";
import { Activity, Cpu, HardDrive, MemoryStick, Monitor, Network, Server, Wifi } from "lucide-react";
import { getSystemInfo } from "../../lib/tauri";
import type { SystemInfo } from "../../features/applications/types";

export function AboutView() {
  const [info, setInfo] = useState<SystemInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(false);
    try {
      setInfo(await getSystemInfo());
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const specs = info ? [
    { label: "Computer name", value: info.hostname || info.device_name, detail: `Account: ${info.user_name}`, Icon: Server },
    { label: "Operating system", value: `${info.os_name} ${info.os_version}`, detail: `Build ${info.os_build}`, Icon: Monitor },
    { label: "Local IP address", value: info.ip_address, detail: "Active network interface", Icon: Network },
    { label: "Default gateway", value: info.default_gateway, detail: "Current network route", Icon: Network },
    { label: "MAC address", value: info.mac_address, detail: "Active network interface", Icon: Wifi },
    { label: "DNS server", value: info.dns_server, detail: "Primary configured resolver", Icon: Server },
    { label: "Storage", value: `${info.free_storage_gb.toFixed(1)} GB free`, detail: `of ${info.total_storage_gb.toFixed(1)} GB total`, Icon: HardDrive },
    { label: "Memory", value: `${info.ram_gb.toFixed(1)} GB`, detail: "Unified memory", Icon: MemoryStick },
    { label: "Processor", value: `${info.cpu_cores} cores`, detail: `${info.architecture} architecture`, Icon: Cpu },
    { label: "Kernel", value: info.kernel_version, detail: "Darwin kernel release", Icon: Activity },
  ] : [];

  return (
    <section className="about-view">
      {info && (
        <div className="about-heading">
          <article className="device-hero">
            <div className="device-art"><Monitor size={40} strokeWidth={1.35} /></div>
            <div className="device-copy">
              <span className="device-label">YOUR DEVICE</span>
              <h3>{info.device_name}</h3>
              <p>{info.os_name} {info.os_version} <span className="device-dot" /> Destox 0.1.0</p>
            </div>
            <div className="device-status"><Activity size={14} /> System healthy</div>
          </article>
        </div>
      )}

      <div className="about-scroll">
        {loading && !info ? (
          <div className="about-loading"><span className="loading-orb" /><strong>Reading system details</strong><span>This should only take a moment.</span></div>
        ) : error && !info ? (
          <div className="about-loading"><strong>System details are unavailable</strong><span>Try refreshing to scan this Mac again.</span></div>
        ) : info && (
          <>
            <div className="specs-heading"><div><h3>System overview</h3><p>Hardware, software, and network details at a glance</p></div><span>{specs.length} DETAILS</span></div>
            <div className="spec-grid">
              {specs.map(({ label, value, detail, Icon }) => (
                <article className="spec-card" key={label}>
                  <div className="spec-icon"><Icon size={18} strokeWidth={1.7} /></div>
                  <span className="spec-label">{label}</span>
                  <strong>{value}</strong>
                  <small>{detail}</small>
                </article>
              ))}
            </div>
            <div className="about-footer"><span className="about-footer-mark">D</span><span>Destox keeps your Mac tidy, with care.</span><span className="version-tag">VERSION 0.1.0</span></div>
          </>
        )}
      </div>
    </section>
  );
}

use serde::Serialize;
use std::process::Command;

#[derive(Serialize)]
pub struct PortInfo {
    pub port: u16,
    pub protocol: String,
    pub process: String,
    pub pid: u32,
}

#[tauri::command]
pub fn get_ports() -> Result<Vec<PortInfo>, String> {
    let output = Command::new("lsof")
        .args(["-nP", "-iTCP", "-sTCP:LISTEN"])
        .output()
        .map_err(|e| e.to_string())?;
    let text = String::from_utf8_lossy(&output.stdout);
    let mut ports = Vec::new();
    for line in text.lines().skip(1) {
        let cols: Vec<&str> = line.split_whitespace().collect();
        if cols.len() < 9 {
            continue;
        }
        let process = cols[0].to_string();
        let pid: u32 = match cols[1].parse() {
            Ok(v) => v,
            Err(_) => continue,
        };
        let name = cols[8];
        // name like *:3000 or 127.0.0.1:8080
        let port_str = name.rsplit(':').next().unwrap_or("");
        let port: u16 = match port_str.parse() {
            Ok(v) => v,
            Err(_) => continue,
        };
        ports.push(PortInfo {
            port,
            protocol: "TCP".to_string(),
            process,
            pid,
        });
    }
    // dedup by port+pid
    ports.sort_by(|a, b| a.port.cmp(&b.port));
    ports.dedup_by(|a, b| a.port == b.port && a.pid == b.pid);
    Ok(ports)
}

#[tauri::command]
pub fn kill_port(pid: u32) -> Result<(), String> {
    let status = Command::new("kill")
        .arg("-9")
        .arg(pid.to_string())
        .status()
        .map_err(|e| e.to_string())?;
    if !status.success() {
        return Err("failed to kill process".into());
    }
    Ok(())
}

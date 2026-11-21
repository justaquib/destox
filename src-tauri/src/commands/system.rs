use serde::Serialize;
use std::process::Command;

#[derive(Serialize)]
pub struct SystemInfo {
    pub user_name: String,
    pub device_name: String,
    pub hostname: String,
    pub ip_address: String,
    pub mac_address: String,
    pub default_gateway: String,
    pub dns_server: String,
    pub os_name: String,
    pub os_version: String,
    pub os_build: String,
    pub architecture: String,
    pub kernel_version: String,
    pub total_storage_gb: f64,
    pub free_storage_gb: f64,
    pub ram_gb: f64,
    pub cpu_cores: u32,
}

fn run(cmd: &str, args: &[&str]) -> String {
    Command::new(cmd)
        .args(args)
        .output()
        .ok()
        .and_then(|o| String::from_utf8(o.stdout).ok())
        .unwrap_or_default()
        .trim()
        .to_string()
}

#[tauri::command]
pub fn get_system_info() -> Result<SystemInfo, String> {
    let device_name = run("scutil", &["--get", "ComputerName"]);
    let hostname = run("hostname", &[]);
    let default_route = run("route", &["-n", "get", "default"]);
    let interface = default_route
        .lines()
        .find_map(|line| line.trim().strip_prefix("interface: "))
        .unwrap_or("en0");
    let default_gateway = default_route
        .lines()
        .find_map(|line| line.trim().strip_prefix("gateway: "))
        .unwrap_or("")
        .to_string();
    let ip_address = run("ipconfig", &["getifaddr", interface]);
    let interface_config = run("ifconfig", &[interface]);
    let mac_address = interface_config
        .lines()
        .find_map(|line| line.trim().strip_prefix("ether "))
        .unwrap_or("")
        .to_string();
    let dns_config = run("scutil", &["--dns"]);
    let dns_server = dns_config
        .lines()
        .find_map(|line| line.trim().strip_prefix("nameserver[0] : "))
        .unwrap_or("")
        .to_string();
    let os_name = run("sw_vers", &["-productName"]);
    let os_version = run("sw_vers", &["-productVersion"]);
    let os_build = run("sw_vers", &["-buildVersion"]);

    let output = Command::new("df")
        .args(["-k", "/"])
        .output()
        .map_err(|e| e.to_string())?;
    let text = String::from_utf8_lossy(&output.stdout);
    let mut lines = text.lines();
    lines.next();
    let line = lines.next().ok_or("no df output")?;
    let cols: Vec<&str> = line.split_whitespace().collect();
    let total_kb: f64 = cols[1].parse().unwrap_or(0.0);
    let avail_kb: f64 = cols[3].parse().unwrap_or(0.0);

    let mem_bytes: u64 = run("sysctl", &["-n", "hw.memsize"]).parse().unwrap_or(0);
    let cpu_cores: u32 = run("sysctl", &["-n", "hw.ncpu"]).parse().unwrap_or(0);
    let architecture = run("uname", &["-m"]);
    let kernel_version = run("uname", &["-r"]);

    Ok(SystemInfo {
        user_name: run("id", &["-F"]).split_whitespace().last().unwrap_or("there").to_string(),
        device_name: if device_name.is_empty() { "Mac".to_string() } else { device_name },
        hostname,
        ip_address: if ip_address.is_empty() { "Not connected".to_string() } else { ip_address },
        mac_address: if mac_address.is_empty() { "Unavailable".to_string() } else { mac_address },
        default_gateway: if default_gateway.is_empty() { "Unavailable".to_string() } else { default_gateway },
        dns_server: if dns_server.is_empty() { "Unavailable".to_string() } else { dns_server },
        os_name: if os_name.is_empty() { "macOS".to_string() } else { os_name },
        os_version,
        os_build,
        architecture,
        kernel_version,
        total_storage_gb: total_kb / 1024.0 / 1024.0,
        free_storage_gb: avail_kb / 1024.0 / 1024.0,
        ram_gb: mem_bytes as f64 / 1024.0 / 1024.0 / 1024.0,
        cpu_cores,
    })
}

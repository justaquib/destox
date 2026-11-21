export type StorageInfo = {
  name: string;
  total_gb: number;
  free_gb: number;
  used_percent: number;
};

export type AppItem = {
  id: number;
  name: string;
  meta: string;
  size: string;
  sizeMb: number;
  icon: string;
  path: string;
  selected: boolean;
};

export type DeletedApp = {
  name: string;
  size_mb: number;
  deleted_at: string;
};

export type InstalledApp = {
  name: string;
  path: string;
  size_mb: number;
  icon: string | null;
  installed_at: number;
};

export type TrashItem = {
  name: string;
  path: string;
  size_bytes: number;
  is_dir: boolean;
  modified_at: string;
};

export type LargeFile = {
  name: string;
  path: string;
  size_bytes: number;
  modified_at: number;
  category: string;
  protected: boolean;
};

export type PermissionStatus = {
  name: string;
  description: string;
  granted: boolean;
};

export type SystemInfo = {
  user_name: string;
  device_name: string;
  hostname: string;
  ip_address: string;
  mac_address: string;
  default_gateway: string;
  dns_server: string;
  os_name: string;
  os_version: string;
  os_build: string;
  architecture: string;
  kernel_version: string;
  total_storage_gb: number;
  free_storage_gb: number;
  ram_gb: number;
  cpu_cores: number;
};

export type PortInfo = {
  port: number;
  protocol: string;
  process: string;
  pid: number;
};

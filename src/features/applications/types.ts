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
  iconClass: string;
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

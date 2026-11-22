import { invoke } from "@tauri-apps/api/core";
import type { AppItem, StorageInfo, DeletedApp, InstalledApp, TrashItem, LargeFile, PermissionStatus, SystemInfo, PortInfo, LargeFolder, ApplicationDetails } from "../features/applications/types";

export async function getStorageInfo(): Promise<StorageInfo> {
  return invoke<StorageInfo>("get_storage_info");
}

export async function getInstalledApps(): Promise<
  { name: string; path: string; size_mb: number; icon: string | null }[]
> {
  return invoke("get_installed_apps");
}

export async function getApplicationDetails(path: string): Promise<ApplicationDetails> {
  return invoke<ApplicationDetails>("get_app_details", { path });
}

export async function uninstallApps(paths: string[]): Promise<void> {
  return invoke("uninstall_apps", { paths });
}

export async function getRecentlyDeleted(): Promise<DeletedApp[]> {
  return invoke("get_recently_deleted");
}

export async function recordDeletedApps(apps: DeletedApp[]): Promise<void> {
  return invoke("record_deleted_apps", { apps });
}

export async function clearRecentlyDeleted(): Promise<void> {
  return invoke("clear_recently_deleted");
}

export async function getRecentlyInstalled(): Promise<InstalledApp[]> {
  return invoke("get_recently_installed");
}

export async function getTrashItems(): Promise<TrashItem[]> {
  return invoke("get_trash_items");
}

export async function deleteTrashItem(path: string): Promise<void> {
  return invoke("delete_trash_item", { path });
}

export async function recoverTrashItem(path: string): Promise<string> {
  return invoke("recover_trash_item", { path });
}

export async function getLargeFiles(minSizeMb?: number, scanHidden?: boolean): Promise<LargeFile[]> {
  return invoke("get_large_files", { minSizeMb, scanHidden });
}

export async function getLargeFolders(minSizeMb?: number, scanHidden?: boolean): Promise<LargeFolder[]> {
  return invoke("get_large_folders", { minSizeMb, scanHidden });
}

export async function revealInFolder(path: string): Promise<void> {
  return invoke("reveal_in_folder", { path });
}

export async function getFilePreview(path: string): Promise<string> {
  return invoke<string>("get_file_preview", { path });
}

export async function deleteLargeFile(path: string): Promise<void> {
  return invoke("delete_large_file", { path });
}

export async function getPermissions(): Promise<PermissionStatus[]> {
  return invoke("get_permissions");
}

export async function openPermissionSettings(): Promise<void> {
  return invoke("open_permission_settings");
}

export async function getSystemInfo(): Promise<SystemInfo> {
  return invoke("get_system_info");
}

export async function getAppVersion(): Promise<string> {
  return invoke("get_app_version");
}

export async function getPorts(): Promise<PortInfo[]> {
  return invoke("get_ports");
}

export async function killPort(pid: number): Promise<void> {
  return invoke("kill_port", { pid });
}

export type { AppItem, StorageInfo, DeletedApp, InstalledApp, TrashItem, LargeFile, PermissionStatus, SystemInfo, PortInfo, LargeFolder, ApplicationDetails };

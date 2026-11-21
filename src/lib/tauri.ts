import { invoke } from "@tauri-apps/api/core";
import type { AppItem, StorageInfo, DeletedApp, InstalledApp, TrashItem } from "../features/applications/types";

export async function getStorageInfo(): Promise<StorageInfo> {
  return invoke<StorageInfo>("get_storage_info");
}

export async function getInstalledApps(): Promise<
  { name: string; path: string; size_mb: number; icon: string | null }[]
> {
  return invoke("get_installed_apps");
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

export type { AppItem, StorageInfo, DeletedApp, InstalledApp, TrashItem };

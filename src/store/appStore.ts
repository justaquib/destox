import { create } from "zustand";
import {
  getStorageInfo,
  getInstalledApps,
  uninstallApps,
  getRecentlyInstalled,
  getTrashItems,
  deleteTrashItem,
  recoverTrashItem,
  getLargeFiles,
  revealInFolder,
} from "../lib/tauri";
import type { AppItem, StorageInfo, InstalledApp, TrashItem, LargeFile } from "../features/applications/types";

type Sort = "size" | "name";

interface AppState {
  apps: AppItem[];
  storage: StorageInfo | null;
  installed: InstalledApp[];
  trash: TrashItem[];
  largeFiles: LargeFile[];
  query: string;
  sort: Sort;
  message: string;
  confirming: boolean;
  loading: boolean;
  fetchAll: () => Promise<void>;
  setQuery: (query: string) => void;
  setSort: (sort: Sort) => void;
  toggleApp: (id: number) => void;
  setConfirming: (value: boolean) => void;
  uninstallSelected: () => Promise<void>;
  rescanTrash: () => Promise<void>;
  deleteTrash: (path: string) => Promise<void>;
  recoverTrash: (path: string) => Promise<void>;
  rescanInstalled: () => Promise<void>;
  rescanLargeFiles: () => Promise<void>;
  revealLargeFile: (path: string) => Promise<void>;
}

export const useAppStore = create<AppState>((set, get) => ({
  apps: [],
  storage: null,
  installed: [],
  trash: [],
  largeFiles: [],
  query: "",
  sort: "size",
  message: "",
  confirming: false,
  loading: true,

  fetchAll: async () => {
    set({ loading: true });
    const [storage, apps, installed, trash] = await Promise.all([
      getStorageInfo().catch(() => null),
      getInstalledApps().catch(() => []),
      getRecentlyInstalled().catch(() => []),
      getTrashItems().catch(() => []),
    ]);
    set({
      storage,
      apps: apps.map((app, index) => ({
        id: index + 1,
        name: app.name,
        meta: "Application",
        size:
          app.size_mb > 1024
            ? `${(app.size_mb / 1024).toFixed(2)} GB`
            : `${app.size_mb} MB`,
        sizeMb: app.size_mb,
        icon: app.icon ?? app.name.charAt(0).toUpperCase(),
        path: app.path,
        selected: false,
      })),
      installed,
      trash,
      loading: false,
    });
  },

  setQuery: (query) => set({ query }),
  setSort: (sort) => set({ sort }),
  toggleApp: (id) =>
    set((state) => ({
      apps: state.apps.map((app) =>
        app.id === id ? { ...app, selected: !app.selected } : app,
      ),
      message: "",
    })),
  setConfirming: (confirming) => set({ confirming }),

  uninstallSelected: async () => {
    const { apps } = get();
    const selected = apps.filter((app) => app.selected);
    const selectedSize =
      selected.reduce((t, a) => t + a.sizeMb, 0) > 1024
        ? `${(selected.reduce((t, a) => t + a.sizeMb, 0) / 1024).toFixed(2)} GB`
        : `${selected.reduce((t, a) => t + a.sizeMb, 0)} MB`;
    try {
      await uninstallApps(selected.map((app) => app.path));
      const trash = await getTrashItems().catch(() => get().trash);
      set((state) => ({
        apps: state.apps.filter((app) => !app.selected),
        trash,
        confirming: false,
        message: `${selected.length} applications removed permanently · ${selectedSize} freed`,
      }));
    } catch (error) {
      set({ confirming: false, message: `Uninstall failed: ${error}` });
    }
  },

  rescanTrash: async () => {
    const trash = await getTrashItems().catch(() => get().trash);
    set({ trash });
  },
  deleteTrash: async (path) => {
    await deleteTrashItem(path);
    const trash = await getTrashItems().catch(() => get().trash);
    set({ trash });
  },
  recoverTrash: async (path) => {
    await recoverTrashItem(path);
    const trash = await getTrashItems().catch(() => get().trash);
    set({ trash });
  },
  rescanInstalled: async () => {
    const installed = await getRecentlyInstalled().catch(() => get().installed);
    set({ installed });
  },
  rescanLargeFiles: async () => {
    const largeFiles = await getLargeFiles().catch(() => get().largeFiles);
    set({ largeFiles });
  },
  revealLargeFile: async (path) => {
    await revealInFolder(path);
  },
}));

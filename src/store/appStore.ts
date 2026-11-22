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
import type { AppItem, StorageInfo, InstalledApp, TrashItem, LargeFile, LargeScanProgress } from "../features/applications/types";

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
  largeScanProgress: LargeScanProgress | null;
  setLargeScanProgress: (progress: LargeScanProgress | null) => void;
  finishLargeScan: () => void;
  scanInBackground: boolean;
  setScanInBackground: (value: boolean) => void;
  fetchAll: () => Promise<void>;
  setQuery: (query: string) => void;
  setSort: (sort: Sort) => void;
  toggleApp: (id: number) => void;
  setConfirming: (value: boolean) => void;
  uninstallSelected: () => Promise<void>;
  uninstallRecentlyInstalled: (path: string) => Promise<void>;
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
  largeScanProgress: null,
  scanInBackground: false,

  setLargeScanProgress: (progress) => set((state) => {
    if (!progress) return { largeScanProgress: null };
    if (progress.stage !== "folders") return { largeScanProgress: progress };
    const priorCategorySizes = state.largeScanProgress?.category_sizes ?? {};
    return {
      largeScanProgress: {
        ...progress,
        category_sizes: { ...priorCategorySizes, ...progress.category_sizes },
      },
    };
  }),
  setScanInBackground: (scanInBackground) => set({ scanInBackground }),
  finishLargeScan: () => set((state) => ({
    largeScanProgress: state.largeScanProgress
      ? { ...state.largeScanProgress, complete: true }
      : null,
    scanInBackground: false,
  })),

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
        meta: app.path.endsWith(".app") ? "Application" : "CLI tool",
        icon: app.icon ?? (app.path.endsWith(".app") ? app.name.charAt(0).toUpperCase() : "T"),
        size:
          app.size_mb > 1024
            ? `${(app.size_mb / 1024).toFixed(2)} GB`
            : `${app.size_mb} MB`,
        sizeMb: app.size_mb,
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

  uninstallRecentlyInstalled: async (path) => {
    try {
      await uninstallApps([path]);
      const [trash, installed] = await Promise.all([
        getTrashItems().catch(() => get().trash),
        getRecentlyInstalled().catch(() => get().installed.filter((item) => item.path !== path)),
      ]);
      set((state) => ({
        apps: state.apps.filter((app) => app.path !== path),
        trash,
        installed,
        message: "Application uninstalled",
      }));
    } catch (error) {
      set({ message: `Uninstall failed: ${error}` });
      throw error;
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

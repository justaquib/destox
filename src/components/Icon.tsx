import {
  AppWindow,
  Network,
  Archive,
  File,
  FileText,
  Folder,
  Image,
  Video,
  ChevronRight,
  Cloud,
  Lock,
  List,
  Clock,
  Info,
  LayoutGrid,
  Search,
  Settings,
  Sparkles,
  Trash2,
  Terminal,
  Undo2,
} from "lucide-react";

export type IconName =
  | "archive"
  | "apps"
  | "chevron"
  | "document"
  | "file"
  | "folder"
  | "clock"
  | "grid"
  | "list"
  | "image"
  | "info"
  | "weather"
  | "lock"
  | "network"
  | "terminal"
  | "search"
  | "settings"
  | "sparkles"
  | "trash"
  | "undo"
  | "video";

const icons: Record<IconName, React.ComponentType<{ size?: number; strokeWidth?: number }>> = {
  archive: Archive,
  apps: AppWindow,
  chevron: ChevronRight,
  document: FileText,
  file: File,
  folder: Folder,
  clock: Clock,
  grid: LayoutGrid,
  list: List,
  image: Image,
  info: Info,
  weather: Cloud,
  lock: Lock,
  network: Network,
  terminal: Terminal,
  search: Search,
  settings: Settings,
  sparkles: Sparkles,
  trash: Trash2,
  video: Video,
  undo: Undo2,
};

export function Icon({
  name,
  size = 18,
  strokeWidth = 1.8,
}: {
  name: IconName;
  size?: number;
  strokeWidth?: number;
}) {
  const Component = icons[name];
  return <Component size={size} strokeWidth={strokeWidth} />;
}

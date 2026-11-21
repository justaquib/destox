mod commands;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            commands::storage::get_storage_info,
            commands::apps::get_installed_apps,
            commands::apps::get_recently_installed,
            commands::apps::uninstall_apps,
            commands::history::get_recently_deleted,
            commands::history::record_deleted_apps,
            commands::history::clear_recently_deleted,
            commands::trash::get_trash_items,
            commands::trash::delete_trash_item,
            commands::trash::recover_trash_item,
            commands::large_files::get_large_files,
            commands::large_files::reveal_in_folder,
            commands::large_files::delete_large_file,
            commands::permissions::get_permissions,
            commands::permissions::open_permission_settings,
            commands::ports::get_ports,
            commands::ports::kill_port,
            commands::system::get_system_info
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

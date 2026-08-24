# Start SLAM

```bash
npx agenticros skills install @agenticros/start-slam
# or: npx agenticros skills install chrismatthieu/start-slam
```

Capabilities: `start_slam`, `stop_slam`, `save_map`, `load_map`, `set_mapping_mode`, `set_localization_mode` — RTAB-Map services.

`save_map` backups the database (`rtabmap/backup` → `<database_path>.back`). `load_map` takes `{ database_path, clear? }`. This skill does not drive the base — use [`@agenticros/explore`](../explore/README.md) to cover a room.

Bringup: [docs/mapping.md](../../docs/mapping.md).

Repo: https://github.com/agenticros/agenticros-skill-start-slam

# Desktop Build Notes

## Commands
- `npm run desktop:dev`: launches Electron against a running `next dev` server on `http://localhost:3000`
- `npm run desktop:start`: builds the standalone backend and Electron shell, then runs the desktop app locally
- `npm run desktop:package`: builds the packaged desktop artifacts with Electron Builder

## Data Locations
- Web/Docker mode defaults to `./data` unless `AGENTHUB_DATA_DIR` is set
- Desktop mode sets `AGENTHUB_DATA_DIR` to the platform app-data directory via Electron

## Migration
- Existing repo-local data is not migrated automatically into packaged desktop builds
- To migrate manually, copy `./data/agenthub.db` and any needed subdirectories into the desktop app's data directory before first launch

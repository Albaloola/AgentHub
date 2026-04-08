// Import all adapters to trigger their self-registration
import "./hermes";
import "./openclaw";
import "./websocket-adapter";
import "./mock";

// Re-export the registry API
export {
  createAdapter,
  getAdapterMeta,
  getAllAdapterMeta,
  getRegisteredTypes,
  registerAdapter,
} from "./base";
export type { GatewayAdapter, AdapterMeta, AdapterConfigField } from "./base";

export type DevServerHandle = {
  port: number;
  url: string;
  stop: () => Promise<void>;
};

export async function connectToDevServer(devUrl: string): Promise<DevServerHandle> {
  const parsed = new URL(devUrl);

  return {
    port: Number(parsed.port || "3000"),
    url: parsed.origin,
    stop: async () => {},
  };
}

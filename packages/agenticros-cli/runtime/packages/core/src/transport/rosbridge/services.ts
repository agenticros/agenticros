import type { RosbridgeClient } from "./client.js";
import type { ServiceResponseMessage } from "./types.js";

/**
 * Call a ROS2 service via rosbridge.
 *
 * @param client - The rosbridge client instance
 * @param service - The service name (e.g., "/my_node/set_parameters")
 * @param args - The service request arguments
 * @param type - Optional service type
 * @param timeoutMs - Request timeout in milliseconds (default 30s)
 * @returns The service response
 */
export async function callService(
  client: RosbridgeClient,
  service: string,
  args?: Record<string, unknown>,
  type?: string,
  timeoutMs = 30_000,
): Promise<ServiceResponseMessage> {
  const id = client.nextId("service");

  const responsePromise = new Promise<ServiceResponseMessage>((resolve, reject) => {
    client.registerPending(
      id,
      (result) => resolve(result as ServiceResponseMessage),
      reject,
      timeoutMs,
    );
  });

  client.send({
    op: "call_service",
    id,
    service,
    args,
    type,
  });

  return responsePromise;
}

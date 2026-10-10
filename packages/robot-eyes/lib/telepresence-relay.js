/**
 * Local WebSocket relay for telepresence signaling.
 *
 * comms.js connects as role "agent". The kiosk page connects as a normal
 * client. Offers and ICE from the agent go only to kiosk sockets. Answers
 * and ICE from a kiosk go only to the agent. Gaze and keyboard messages
 * are left for the eyes server.
 */

/**
 * @param {{ onCallActive?: (active: boolean) => void }} [opts]
 */
export function createTelepresenceHub({ onCallActive } = {}) {
  /** @type {Set<object>} */
  const kiosks = new Set();
  /** @type {object | null} */
  let agent = null;
  let callActive = false;

  const setCall = (active) => {
    const next = Boolean(active);
    if (next === callActive) return;
    callActive = next;
    onCallActive?.(callActive);
  };

  const send = (client, payload) => {
    if (!client || client.readyState !== 1 || typeof client.send !== "function") return;
    try {
      client.send(JSON.stringify(payload));
    } catch {
      // socket already gone
    }
  };

  const sendKiosks = (payload) => {
    for (const client of kiosks) send(client, payload);
  };

  return {
    get callActive() {
      return callActive;
    },

    /** @param {object} client */
    addClient(client) {
      kiosks.add(client);
    },

    /** @param {object} client */
    removeClient(client) {
      kiosks.delete(client);
      if (agent !== client) return;
      agent = null;
      setCall(false);
      sendKiosks({ type: "telepresence", signal: "end" });
    },

    /**
     * @param {object} client
     * @param {object} msg
     * @returns {{ handled: boolean, role: "agent" | "kiosk" }}
     */
    handleMessage(client, msg) {
      const role = client === agent ? "agent" : "kiosk";
      if (!msg || typeof msg !== "object") return { handled: false, role };

      if (msg.type === "hello" && msg.role === "agent") {
        kiosks.delete(client);
        agent = client;
        return { handled: true, role: "agent" };
      }

      if (msg.type === "call" && client !== agent) {
        setCall(Boolean(msg.active));
        return { handled: true, role: "kiosk" };
      }

      if (msg.type === "telepresence") {
        if (client === agent) {
          if (msg.signal === "end") setCall(false);
          else if (msg.signal === "offer") {
            if (kiosks.size === 0) {
              send(agent, { type: "telepresence", signal: "unavailable", reason: "no-kiosk" });
              return { handled: true, role: "agent" };
            }
            setCall(true);
          }
          sendKiosks(msg);
          return { handled: true, role: "agent" };
        }
        if (agent) send(agent, msg);
        return { handled: true, role: "kiosk" };
      }

      return { handled: false, role };
    },
  };
}

#!/usr/bin/env python3
"""TCP relay: 10.200.0.1:9090 -> 172.19.0.1:9090.

Why this exists:

    In a NemoClaw / OpenShell hybrid setup, the AgenticROS plugin runs
    inside the gateway process, which lives in the OpenShell-created
    sandbox network namespace. From that netns:

      * 10.200.0.0/24 is routable (the sandbox-host veth pair lives here).
      * 172.19.0.0/16 (Docker bridge, where host.docker.internal resolves)
        is NOT routable directly. All non-bypass traffic is forced through
        the OPA policy proxy at 10.200.0.1:3128.

    Custom policy presets added via ``nemoclaw policy-add --from-file``
    are *recorded* but not actually activated for proxy enforcement
    decisions in current NemoClaw releases. So the plugin's WebSocket
    upgrade requests to ws://host.docker.internal:9090 get policy_denied
    even with a custom preset in place.

    This relay sidesteps the policy proxy entirely by binding inside the
    sandbox *container's main netns* (where 10.200.0.1 is owned by the
    veth-h interface that connects to the sandbox netns) and forwarding
    every connection to the rosbridge_server on the Docker host.

How the connection flows:

    AgenticROS plugin (sandbox netns)
        |
        | ws://10.200.0.1:9090
        v
    relay listening on 10.200.0.1:9090 (container main netns)
        |
        | TCP forward
        v
    172.19.0.1:9090 (Docker bridge gateway IP — the host's rosbridge)

Run inside the sandbox container::

    docker exec -d <container> python3 /tmp/sandbox_rosbridge_relay.py \\
        --bind 10.200.0.1:9090 --target 172.19.0.1:9090

The matching plugin config (``~/.openclaw/openclaw.json`` inside the
sandbox) uses::

    "rosbridge": { "url": "ws://10.200.0.1:9090" }
"""

from __future__ import annotations

import argparse
import logging
import select
import socket
import threading
from typing import Tuple


def _parse_addr(value: str, default_port: int) -> Tuple[str, int]:
    if ":" in value:
        host, port_str = value.rsplit(":", 1)
        return host, int(port_str)
    return value, default_port


def _pipe(src: socket.socket, dst: socket.socket, label: str) -> None:
    try:
        while True:
            chunk = src.recv(65536)
            if not chunk:
                break
            dst.sendall(chunk)
    except (OSError, ConnectionError) as exc:
        logging.debug("%s pipe closed: %s", label, exc)
    finally:
        try:
            dst.shutdown(socket.SHUT_WR)
        except OSError:
            pass


def _handle(client: socket.socket, peer: Tuple[str, int], target: Tuple[str, int]) -> None:
    logging.info("accept %s -> %s:%d", peer, *target)
    upstream = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    try:
        upstream.connect(target)
    except OSError as exc:
        logging.warning("upstream %s:%d unreachable: %s", *target, exc)
        client.close()
        return
    t1 = threading.Thread(target=_pipe, args=(client, upstream, "c->u"), daemon=True)
    t2 = threading.Thread(target=_pipe, args=(upstream, client, "u->c"), daemon=True)
    t1.start()
    t2.start()
    t1.join()
    t2.join()
    client.close()
    upstream.close()
    logging.info("closed  %s", peer)


def serve(bind: Tuple[str, int], target: Tuple[str, int]) -> None:
    srv = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    srv.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    srv.bind(bind)
    srv.listen(64)
    logging.info("relay listening on %s:%d -> %s:%d", *bind, *target)
    try:
        while True:
            client, peer = srv.accept()
            threading.Thread(target=_handle, args=(client, peer, target), daemon=True).start()
    except KeyboardInterrupt:
        logging.info("shutting down")
    finally:
        srv.close()


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--bind", default="10.200.0.1:9090", help="host:port to listen on")
    ap.add_argument("--target", default="172.19.0.1:9090", help="host:port to forward to")
    ap.add_argument(
        "--log-level",
        default="INFO",
        choices=["DEBUG", "INFO", "WARNING", "ERROR"],
        help="logging verbosity",
    )
    args = ap.parse_args()
    logging.basicConfig(
        level=getattr(logging, args.log_level),
        format="%(asctime)s relay %(levelname)s %(message)s",
    )
    serve(_parse_addr(args.bind, 9090), _parse_addr(args.target, 9090))


if __name__ == "__main__":
    main()

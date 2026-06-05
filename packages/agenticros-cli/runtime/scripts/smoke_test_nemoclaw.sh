#!/usr/bin/env bash
#
# Smoke-test the hybrid NemoClaw + AgenticROS bridge.
#
# Checks, in order:
#   1. NemoClaw sandbox container is up.
#   2. agenticros_rosbridge policy is loaded into the live gateway bundle
#      with the SSRF allowed_ips block (so host.docker.internal is reachable).
#   3. rosbridge_server is bound on the host (0.0.0.0:9090).
#   4. The plugin's actual TCP connection through the OPA proxy is ALLOWED
#      (not denied by engine:ssrf or engine:opa).
#   5. A real WebSocket request to /rosapi/topics through the proxy returns
#      a list of ROS 2 topics (i.e. the gateway can both reach rosbridge and
#      speak its protocol).
#   6. The NemoClaw dashboard HTTP endpoint serves a non-empty body.
#
# Exit code: 0 on all-pass, 1 on any failure. Prints a one-line PASS/FAIL per
# check + a final summary.
#
# Usage:   ./scripts/smoke_test_nemoclaw.sh

set -uo pipefail

GREEN=$'\033[32m'; RED=$'\033[31m'; YELLOW=$'\033[33m'; RESET=$'\033[0m'
PASS=0; FAIL=0
pass() { echo "${GREEN}PASS${RESET} $*"; PASS=$((PASS+1)); }
fail() { echo "${RED}FAIL${RESET} $*"; FAIL=$((FAIL+1)); }
warn() { echo "${YELLOW}WARN${RESET} $*"; }

CONTAINER=$(docker ps --format '{{.Names}}' 2>/dev/null | grep '^openshell-nemo-' | head -1 || true)
if [[ -z "${CONTAINER}" ]]; then
  fail "No openshell-nemo-* container running — start NemoClaw with 'nemoclaw nemo start'"
  exit 1
fi
pass "sandbox container: ${CONTAINER}"

# ----- 2. agenticros_rosbridge policy loaded with allowed_ips ---------------
OPENSHELL_BIN="${OPENSHELL_BIN:-$(command -v openshell || echo "$HOME/.local/bin/openshell")}"
if [[ ! -x "${OPENSHELL_BIN}" ]]; then
  warn "openshell CLI not found at ${OPENSHELL_BIN} — skipping policy bundle check"
else
  POLICY_BUNDLE=$("${OPENSHELL_BIN}" policy get --full nemo 2>/dev/null || true)
  if grep -q 'agenticros_rosbridge:' <<<"${POLICY_BUNDLE}"; then
    if grep -q 'allowed_ips:' <<<"${POLICY_BUNDLE}"; then
      pass "agenticros_rosbridge policy is loaded with allowed_ips (SSRF guard satisfied)"
    else
      fail "agenticros_rosbridge policy is loaded but missing allowed_ips — SSRF guard will deny"
    fi
  else
    fail "agenticros_rosbridge policy is NOT loaded — run: nemoclaw nemo policy-add --yes --from-file scripts/agenticros-rosbridge.policy.yaml"
  fi
fi

# ----- 3. rosbridge_server bound on host:9090 -------------------------------
if ss -ltn 2>/dev/null | awk '{print $4}' | grep -qE '(:9090|:::9090|0\.0\.0\.0:9090)$'; then
  pass "rosbridge_server is listening on host :9090"
else
  fail "nothing is listening on host :9090 — start the host stack: ./scripts/run_nemoclaw_host_stack.sh humble"
fi

# ----- 4. sandbox proxy decision for the plugin's binary --------------------
LOG_FILE=$(docker exec "${CONTAINER}" sh -c 'ls -t /var/log/openshell.*.log 2>/dev/null | head -1' 2>/dev/null | tr -d '\r')
if [[ -n "${LOG_FILE}" ]]; then
  LAST_DECISION=$(docker exec "${CONTAINER}" sh -c "grep -E 'host.docker.internal:9090|host.openshell.internal:9090' '${LOG_FILE}' | tail -1" 2>/dev/null)
  if [[ -z "${LAST_DECISION}" ]]; then
    warn "no recent proxy decisions for host.docker.internal:9090 in ${LOG_FILE} (gateway hasn't tried yet?)"
  elif grep -qE 'ALLOWED.*policy:agenticros_rosbridge' <<<"${LAST_DECISION}"; then
    pass "last proxy decision: ALLOWED via agenticros_rosbridge"
  elif grep -q 'engine:ssrf' <<<"${LAST_DECISION}"; then
    fail "last proxy decision: DENIED by SSRF guard — add allowed_ips to the policy. Saw: ${LAST_DECISION##*OCSF }"
  elif grep -q 'engine:opa' <<<"${LAST_DECISION}"; then
    fail "last proxy decision: DENIED by OPA — endpoint missing from agenticros_rosbridge. Saw: ${LAST_DECISION##*OCSF }"
  else
    warn "unrecognised proxy decision: ${LAST_DECISION##*OCSF }"
  fi
fi

# ----- 5. live WebSocket roundtrip to /rosapi/topics through the proxy ------
GW_PID=$(docker exec "${CONTAINER}" pgrep -f openclaw-gateway 2>/dev/null | head -1 | tr -d '\r')
WS_PATH=$(docker exec "${CONTAINER}" sh -c 'ls -d /sandbox/agenticros/node_modules/.pnpm/ws@*/node_modules/ws 2>/dev/null | head -1' | tr -d '\r')
if [[ -z "${GW_PID}" ]] || [[ -z "${WS_PATH}" ]]; then
  warn "skip WebSocket roundtrip — gateway pid=${GW_PID:-?} ws=${WS_PATH:-?}"
else
  TOPICS_JSON=$(docker exec "${CONTAINER}" sh -c "nsenter --target ${GW_PID} --net -- node --input-type=commonjs -e '
const http=require(\"http\");
const WebSocket=require(\"${WS_PATH}\");
const agent=new http.Agent({keepAlive:false});
agent.createConnection=(opts,cb)=>{
  const req=http.request({host:\"10.200.0.1\",port:3128,method:\"CONNECT\",path:opts.host+\":\"+opts.port,headers:{Host:opts.host+\":\"+opts.port}});
  req.on(\"connect\",(res,sock)=>{ if(res.statusCode!==200){cb(new Error(\"proxy \"+res.statusCode));return;} cb(null,sock); });
  req.on(\"error\",cb); req.end();
};
const ws=new WebSocket(\"ws://host.docker.internal:9090\",{agent});
ws.on(\"open\",()=>ws.send(JSON.stringify({op:\"call_service\",service:\"/rosapi/topics\",id:\"smoke\"})));
ws.on(\"message\",m=>{const o=JSON.parse(m.toString()); console.log(JSON.stringify({count:(o.values&&o.values.topics||[]).length, sample:(o.values&&o.values.topics||[]).slice(0,3)})); ws.close(); process.exit(0);});
ws.on(\"error\",e=>{console.error(\"ERR\",e.message); process.exit(1);});
setTimeout(()=>{console.error(\"timeout\"); process.exit(2);},6000);
' 2>&1" 2>/dev/null | tail -1)
  if grep -qE '^\{"count":[0-9]+' <<<"${TOPICS_JSON}"; then
    pass "WebSocket roundtrip: $(jq -r '"\(.count) topics, sample=\(.sample|join(", "))"' <<<"${TOPICS_JSON}" 2>/dev/null || echo "${TOPICS_JSON}")"
  else
    fail "WebSocket roundtrip failed: ${TOPICS_JSON:-<no output>}"
  fi
fi

# ----- 6. NemoClaw dashboard reachable + non-empty --------------------------
DASH_URL=$(nemoclaw nemo dashboard-url --quiet 2>/dev/null | head -1 || true)
DASH_BASE=${DASH_URL%%#*}
if [[ -z "${DASH_BASE}" ]]; then
  warn "dashboard URL not reported by nemoclaw (sandbox not Ready?)"
else
  DASH_BYTES=$(curl -fsS "${DASH_BASE}" 2>/dev/null | wc -c | tr -d ' ')
  if [[ -n "${DASH_BYTES}" ]] && [[ "${DASH_BYTES}" -gt 200 ]]; then
    pass "dashboard at ${DASH_BASE} returns ${DASH_BYTES}-byte body"
    echo "    URL with token: ${DASH_URL}"
  else
    fail "dashboard at ${DASH_BASE} returned ${DASH_BYTES:-0} bytes — gateway crashed?"
  fi
fi

echo
echo "Summary: ${GREEN}${PASS} passed${RESET}, ${RED}${FAIL} failed${RESET}"
[[ ${FAIL} -eq 0 ]]

/**
 * DDS graph discovery is asynchronous. A node that just joined the domain
 * sees topics trickle in, so the first snapshot has to wait until the count
 * stops changing. Once that has happened, later reads of
 * `getTopicNamesAndTypes()` are the live graph and do not need another wait.
 */

export interface TopicNameAndTypes {
  name: string;
  types: string[];
}

export interface StableTopicWaitOptions {
  /** Stop waiting at this timestamp (ms). Default: now + 6000. */
  deadlineMs?: number;
  /** Pause between polls. Default: 300. */
  intervalMs?: number;
  /**
   * Ignore stability until at least this many external topics are visible.
   * Avoids treating `/clock` + `/tf` + `/tf_static` as the whole graph.
   */
  minCount?: number;
  /** Consecutive unchanged polls required. Default: 2 (~900ms at the default interval). */
  requiredHits?: number;
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
}

const DEFAULT_DEADLINE_MS = 6000;
const DEFAULT_INTERVAL_MS = 300;
const DEFAULT_MIN_COUNT = 3;
const DEFAULT_REQUIRED_HITS = 2;

function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Poll `read` until the topic count is unchanged for `requiredHits` polls
 * and at least `minCount` topics are present, or until the deadline.
 * Returns the last raw snapshot (caller filters internal topics).
 */
export async function waitForStableTopics(
  read: () => TopicNameAndTypes[],
  options?: StableTopicWaitOptions,
): Promise<TopicNameAndTypes[]> {
  const now = options?.now ?? Date.now;
  const sleep = options?.sleep ?? defaultSleep;
  const intervalMs = options?.intervalMs ?? DEFAULT_INTERVAL_MS;
  const minCount = options?.minCount ?? DEFAULT_MIN_COUNT;
  const requiredHits = options?.requiredHits ?? DEFAULT_REQUIRED_HITS;
  const deadline = options?.deadlineMs ?? now() + DEFAULT_DEADLINE_MS;

  let raw: TopicNameAndTypes[] = [];
  let prevCount = -1;
  let stableHits = 0;

  while (now() < deadline) {
    raw = read();
    const count = raw.length;
    if (count === prevCount && count >= minCount) {
      stableHits++;
      if (stableHits >= requiredHits) break;
    } else {
      stableHits = 0;
      prevCount = count;
    }
    await sleep(intervalMs);
  }

  return raw;
}

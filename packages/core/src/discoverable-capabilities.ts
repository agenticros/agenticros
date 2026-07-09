/**
 * Discoverable marketplace capabilities — list verbs from skills.agenticros.com
 * that are not yet installed locally, so agents can propose installs.
 */

import type { AgenticROSConfig } from "./config.js";
import {
  listAllCapabilities,
  type Capability,
  type CapabilityField,
  type CapabilitySource,
} from "./capabilities.js";
import { skillsApiBase } from "./skill-refs.js";

export interface DiscoverableCapability extends Capability {
  /** Always true for marketplace-only entries. */
  discoverable: true;
  /** False when not present in the local registry. */
  installed: false;
  /** Marketplace install ref (owner/skill). */
  install_ref: string;
}

export interface ListedCapability extends Capability {
  discoverable?: boolean;
  installed?: boolean;
  install_ref?: string;
}

export interface ListCapabilitiesOptions {
  /** Include marketplace browse (network). Default true. */
  includeDiscoverable?: boolean;
  apiBase?: string;
  /** Max marketplace skills to scan. Default 50. */
  marketplaceLimit?: number;
  /** Soft-fail: on network error return installed-only. Default true. */
  softFail?: boolean;
}

interface MarketplaceSkillDoc {
  marketplaceRef?: string;
  ownerLogin?: string;
  skillSlug?: string;
  slug?: string;
  capabilities?: Array<Record<string, unknown>>;
  visibility?: string;
}

function installRefOf(s: MarketplaceSkillDoc): string | null {
  if (s.marketplaceRef && typeof s.marketplaceRef === "string") {
    return s.marketplaceRef.toLowerCase();
  }
  if (s.ownerLogin && s.skillSlug) {
    return `${s.ownerLogin}/${s.skillSlug}`.toLowerCase();
  }
  if (s.slug && s.slug.includes("/")) return s.slug.toLowerCase();
  return null;
}

function fieldMap(
  raw: unknown,
): Record<string, CapabilityField> | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const out: Record<string, CapabilityField> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof v === "string") {
      out[k] = { type: v };
    } else if (v && typeof v === "object") {
      const o = v as Record<string, unknown>;
      out[k] = {
        type: typeof o.type === "string" ? o.type : "unknown",
        description: typeof o.description === "string" ? o.description : undefined,
        optional: o.optional === true,
      };
    }
  }
  return Object.keys(out).length ? out : undefined;
}

function normalizeMarketplaceCap(
  raw: Record<string, unknown>,
  installRef: string,
  packageName: string,
): DiscoverableCapability | null {
  const id = typeof raw.id === "string" ? raw.id : null;
  const verb = typeof raw.verb === "string" ? raw.verb : null;
  const description =
    typeof raw.description === "string" ? raw.description : id ? `Marketplace capability ${id}` : null;
  if (!id || !verb || !description) return null;
  const source: CapabilitySource = {
    kind: "skill",
    skillId: installRef.split("/")[1] ?? installRef,
    package: packageName,
  };
  return {
    id,
    verb,
    description,
    inputs: fieldMap(raw.inputs),
    outputs: fieldMap(raw.outputs),
    interruptible: raw.interruptible === true ? true : raw.interruptible === false ? false : undefined,
    blocks_base: raw.blocks_base === true ? true : undefined,
    source,
    discoverable: true,
    installed: false,
    install_ref: installRef,
  };
}

export async function fetchMarketplaceSkills(
  opts: { apiBase?: string; limit?: number } = {},
): Promise<MarketplaceSkillDoc[]> {
  const base = skillsApiBase(opts.apiBase);
  const limit = opts.limit ?? 50;
  const u = new URL(`${base}/skills`);
  u.searchParams.set("limit", String(limit));
  u.searchParams.set("sort", "popular");
  const res = await fetch(u.toString(), { headers: { Accept: "application/json" } });
  if (!res.ok) {
    throw new Error(`Marketplace list ${res.status}`);
  }
  const body = (await res.json()) as { skills?: MarketplaceSkillDoc[] };
  return body.skills ?? [];
}

/**
 * Merge installed capabilities with discoverable marketplace capabilities
 * (ids not already present locally). Soft-fails offline.
 */
export async function listCapabilitiesWithDiscoverable(
  config: AgenticROSConfig,
  opts: ListCapabilitiesOptions = {},
): Promise<ListedCapability[]> {
  const installed = listAllCapabilities(config).map((c) => {
    const listed: ListedCapability = {
      ...c,
      installed: true,
      discoverable: false,
    };
    return listed;
  });
  if (opts.includeDiscoverable === false) {
    return installed;
  }

  const installedIds = new Set(installed.map((c) => c.id));
  try {
    const skills = await fetchMarketplaceSkills({
      apiBase: opts.apiBase,
      limit: opts.marketplaceLimit ?? 50,
    });
    const extra: DiscoverableCapability[] = [];
    const seenDiscoverable = new Set<string>();
    for (const s of skills) {
      if (s.visibility && s.visibility !== "public") continue;
      const ref = installRefOf(s);
      if (!ref) continue;
      const caps = Array.isArray(s.capabilities) ? s.capabilities : [];
      for (const raw of caps) {
        if (!raw || typeof raw !== "object") continue;
        const id = typeof (raw as { id?: unknown }).id === "string" ? (raw as { id: string }).id : null;
        if (!id || installedIds.has(id) || seenDiscoverable.has(id)) continue;
        const norm = normalizeMarketplaceCap(
          raw as Record<string, unknown>,
          ref,
          s.slug ?? ref,
        );
        if (!norm) continue;
        seenDiscoverable.add(id);
        extra.push(norm);
      }
    }
    return [...installed, ...extra];
  } catch (e) {
    if (opts.softFail === false) throw e;
    return installed;
  }
}

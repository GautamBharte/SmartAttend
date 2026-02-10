/**
 * Feature flags for controlling which tabs / features are visible.
 *
 * Set a flag to `true` to enable the feature, `false` to hide it.
 * In production, only the enabled features will be visible to users.
 *
 * "dashboard" is always enabled and cannot be disabled (it's the fallback).
 */
export const FEATURE_FLAGS = {
    /** Main dashboard overview — always on */
    dashboard: true,

    /** Attendance check-in / check-out & history */
    attendance: true,

    /** Leave request management */
    leave: false,

    /** Tour request management */
    tour: false,

    /** Admin panel (employee mgmt, reports, CSV upload, daily report) */
    admin: false,
} as const;

export type FeatureTab = keyof typeof FEATURE_FLAGS;

/** Returns true if a given tab is enabled via feature flags. */
export function isFeatureEnabled(tab: string): boolean {
    if (tab === 'dashboard') return true; // always on
    return FEATURE_FLAGS[tab as FeatureTab] ?? false;
}

/** List of all enabled tab IDs. */
export const ENABLED_TABS: string[] = Object.entries(FEATURE_FLAGS)
    .filter(([, enabled]) => enabled)
    .map(([tab]) => tab);

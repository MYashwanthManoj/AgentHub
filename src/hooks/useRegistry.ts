/**
 * useRegistry.ts
 *
 * Subscribes the UI to the registry cache in registryService and triggers a
 * one-time backend hydration (GET /registry/) on first mount. Uses
 * useSyncExternalStore so any component reading the registry re-renders when the
 * backend data replaces the static seed.
 */

import { useSyncExternalStore, useEffect } from 'react';
import {
  subscribeRegistry,
  getRegistrySnapshot,
  hydrateRegistry,
} from '../services/registryService';
import type { SellerAgent } from '../types';

// Module-level guard so hydration fires once even with multiple consumers.
let hydrationStarted = false;

export function useRegistry(): SellerAgent[] {
  const agents = useSyncExternalStore(
    subscribeRegistry,
    getRegistrySnapshot,
    getRegistrySnapshot
  );

  useEffect(() => {
    if (hydrationStarted) return;
    hydrationStarted = true;
    void hydrateRegistry();
  }, []);

  return agents;
}

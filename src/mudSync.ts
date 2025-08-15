
import { createStash } from "@latticexyz/stash/internal";
import type { SyncFilter } from "@latticexyz/store-sync";
import dustWorldConfig from "@dust/world/mud.config";
// TODO: Resolve the dependency on contracts/mud.config
// import contractsConfig from "contracts/mud.config";
import { syncToStash } from "@latticexyz/store-sync/internal";
import { redstone as redstoneChain } from "@latticexyz/common/chains";
import type { Chain } from "viem";
import { SyncStep } from "@latticexyz/store-sync";
import { SyncProgress, initialProgress } from "@latticexyz/store-sync/internal";
import { worldAddress } from "./viem";

// --- From redstone.ts ---
export const redstone = {
  ...redstoneChain,
  rpcUrls: {
    ...redstoneChain.rpcUrls,
    wiresaw: {
      http: ["https://wiresaw.redstonechain.com"],
      webSocket: ["wss://wiresaw.redstonechain.com"],
    },
  },
} satisfies Chain;

// --- From stash.ts ---
const selectedDustTables = {
  EntityObjectType: dustWorldConfig.tables.EntityObjectType,
};

export const tables = {
  ...selectedDustTables,
  // ...contractsConfig.namespaces[
  //   contractsConfig.namespace as keyof typeof contractsConfig.namespaces
  // ].tables,
};

export const stashConfig = {
  namespaces: {
    "": {
      tables: selectedDustTables,
    },
    // ...contractsConfig.namespaces,
  },
};

export const filters = [
  ...Object.values(tables).map((table) => ({
    tableId: table.tableId,
  })),
] satisfies SyncFilter[];

export const stash = createStash(stashConfig);

export function startSync() {
  return syncToStash({
    address: worldAddress,
    stash,
    filters,
    internal_clientOptions: { chain: redstone },
    indexerUrl: redstone.indexerUrl,
  });
}


// --- From syncStatus.ts ---
export type SyncStatus = {
  step: SyncStep;
  message: string;
  percentage: number;
  latestBlockNumber?: bigint;
  lastBlockNumberProcessed?: bigint;
  isLive: boolean;
};

export function getSyncStatus(): SyncStatus {
  console.log("Getting sync status...");
  const progress = stash.getRecord({ table: SyncProgress, key: {} }) ?? initialProgress;
  const status = {
    ...progress,
    step: progress.step as SyncStep,
    isLive: progress.step === SyncStep.LIVE,
  };
  console.log("Current sync status:", status);
  return status;
}

export function subscribeToSyncStatus(callback: (status: SyncStatus) => void): () => void {
  console.log("Subscribing to sync status...");
  const unsubscribe = (stash as any).subscribe(() => {
    console.log("Received sync status update from stash.");
    callback(getSyncStatus());
  });
  callback(getSyncStatus()); // Initial call
  return unsubscribe;
}

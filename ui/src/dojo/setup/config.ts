import { StarknetDomain } from "starknet";
import { DojoManifest } from "@/dojo/hooks/useDojoSystem";
import tournament_manifest_dev from "../../../../contracts/manifest_dev.json";
import tournament_manifest_slot from "../../../../contracts/manifest_slot.json";
import tournament_manifest_mainnet from "../../../../contracts/manifest_mainnet.json";
import tournament_manifest_sepolia from "../../../../contracts/manifest_sepolia.json";
import { NAMESPACE } from "@/lib/constants";
import { ChainId, CHAINS } from "@/dojo/setup/networks";
import { DojoAppConfig } from "@/context/dojo";

export const manifests: Record<ChainId, DojoManifest> = {
  [ChainId.KATANA_LOCAL]: tournament_manifest_dev as DojoManifest,
  [ChainId.WP_BUDOKAN]: tournament_manifest_slot as DojoManifest,
  [ChainId.SN_MAIN]: tournament_manifest_mainnet as DojoManifest,
  [ChainId.SN_SEPOLIA]: tournament_manifest_sepolia as DojoManifest,
};

export const isChainIdSupported = (chainId: ChainId): boolean => {
  return Object.keys(CHAINS).includes(chainId);
};

// starknet domain
export const makeStarknetDomain = (chainId: ChainId): StarknetDomain => ({
  name: "Budokan",
  version: "0.1.0",
  chainId: CHAINS[chainId].chainId,
  revision: "1",
});

//------------------------

export const makeDojoAppConfig = (chainId: ChainId): DojoAppConfig => {
  return {
    selectedChainId: chainId,
    manifest: manifests[chainId],
    nameSpace: NAMESPACE,
    starknetDomain: makeStarknetDomain(chainId),
  };
};

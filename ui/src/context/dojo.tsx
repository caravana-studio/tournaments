import {
  createContext,
  ReactNode,
  useContext,
  useMemo,
  useState,
  useEffect,
} from "react";
import { DojoProvider } from "@dojoengine/core";
import { setupWorld } from "@/generated/contracts.gen";
import { SDK, init } from "@dojoengine/sdk";
import { SchemaType } from "@/generated/models.gen";
import { DojoManifest } from "@/dojo/hooks/useDojoSystem";
import { DojoChainConfig, ChainId } from "@/dojo/setup/networks";
import { StarknetDomain } from "starknet";
import { useNetwork } from "@starknet-react/core";
import { CHAINS } from "@/dojo/setup/networks";
import { feltToString } from "@/lib/utils";
import { makeDojoAppConfig } from "@/dojo/setup/config";

interface DojoContextType {
  sdk: SDK<SchemaType>;
  manifest: DojoManifest;
  selectedChainConfig: DojoChainConfig;
  nameSpace: string;
  client: ReturnType<typeof setupWorld>;
}

export const DojoContext = createContext<DojoContextType | null>(null);

export interface DojoAppConfig {
  selectedChainId: ChainId;
  nameSpace: string;
  starknetDomain: StarknetDomain;
  manifest: DojoManifest;
}

export const DojoContextProvider = ({ children }: { children: ReactNode }) => {
  const [sdk, setSdk] = useState<SDK<SchemaType> | undefined>(undefined);
  const currentValue = useContext(DojoContext);
  const { chain } = useNetwork();

  if (currentValue) {
    throw new Error("DojoProvider can only be used once");
  }

  const chainId = useMemo(() => {
    return feltToString(chain?.id);
  }, [chain]);

  // Get the chain config for the current chain
  const selectedChainConfig = useMemo(() => {
    return CHAINS[chainId! as ChainId];
  }, [chainId]);

  const appConfig = useMemo(() => {
    return makeDojoAppConfig(chainId! as ChainId);
  }, [chainId]);

  // Reset SDK when chain changes
  useEffect(() => {
    setSdk(undefined);

    const manifest = appConfig.manifest;
    if (!manifest) {
      console.error(`No manifest found for chain ID: ${chainId}`);
      return;
    }

    init<SchemaType>({
      client: {
        toriiUrl: selectedChainConfig.toriiUrl!,
        relayUrl: selectedChainConfig.relayUrl ?? "",
        worldAddress: manifest.world.address ?? "",
      },
      domain: {
        name: "WORLD_NAME",
        version: "1.0",
        chainId: chainId || "KATANA",
        revision: "1",
      },
    })
      .then(setSdk)
      .catch((error) => {
        console.error(`Failed to initialize SDK for chain ${chainId}:`, error);
      });
  }, [selectedChainConfig, chainId]);

  const isLoading = sdk === undefined;

  const manifest = useMemo(() => {
    return appConfig.manifest;
  }, [appConfig.manifest]);

  // Create a new DojoProvider when the chain changes
  const dojoProvider = useMemo(() => {
    if (!manifest) return null;
    return new DojoProvider(manifest, selectedChainConfig.rpcUrl);
  }, [manifest, selectedChainConfig.rpcUrl]);

  // Don't render until SDK is loaded and provider is created
  if (isLoading || !dojoProvider) {
    return null;
  }

  return (
    <DojoContext.Provider
      value={{
        sdk,
        manifest,
        selectedChainConfig,
        nameSpace: appConfig.nameSpace,
        client: setupWorld(dojoProvider),
      }}
    >
      {children}
    </DojoContext.Provider>
  );
};

export const useDojo = () => {
  const context = useContext(DojoContext);

  if (!context) {
    throw new Error("The `useDojo` hook must be used within a `DojoProvider`");
  }

  return context;
};

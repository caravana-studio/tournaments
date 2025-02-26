import { StarknetDomain } from "starknet";
import { Connector } from "@starknet-react/core";
import {
  Chain,
  mainnet,
  sepolia,
  NativeCurrency,
} from "@starknet-react/chains";
import {
  LOCAL_KATANA,
  LOCAL_RELAY,
  KATANA_CLASS_HASH,
  KATANA_ETH_CONTRACT_ADDRESS,
} from "@dojoengine/core";
import { DojoManifest } from "@/dojo/hooks/useDojoSystem";
import tournament_manifest_dev from "../../../contracts/manifest_dev.json";
import tournament_manifest_slot from "../../../contracts/manifest_slot.json";
import tournament_manifest_mainnet from "../../../contracts/manifest_mainnet.json";
import tournament_manifest_sepolia from "../../../contracts/manifest_sepolia.json";
import { initializeController } from "@/dojo/setup/controllerSetup";
import { supportedConnectorIds } from "@/lib/connectors";
import { stringToFelt, cleanObject } from "@/lib/utils";
import { NAMESPACE } from "@/lib/constants";

export interface ContractInterfaces {
  [contractName: string]: string[];
}

export interface DojoAppConfig {
  nameSpace: string;
  contractInterfaces: ContractInterfaces;
  supportedChainIds: ChainId[];
  initialChainId: ChainId;
  starknetDomain: StarknetDomain;
  manifests: { [chain_id: string]: DojoManifest | undefined };
  controllerConnector?: Connector;
}

export enum ChainId {
  KATANA_LOCAL = "KATANA_LOCAL",
  WP_TOURNAMENTS = "WP_TOURNAMENTS",
  SN_MAIN = "SN_MAIN",
  SN_SEPOLIA = "SN_SEPOLIA",
}

// TODO: fix for running between katana and mainnet
const supportedChainIds: ChainId[] = [
  ChainId.KATANA_LOCAL,
  ChainId.WP_TOURNAMENTS,
  ChainId.SN_MAIN,
  ChainId.SN_SEPOLIA,
];

const validateChainConfig = (
  config: DojoChainConfig,
  chainId: ChainId
): void => {
  const required = ["rpcUrl", "chainId", "name"];
  const missing = required.filter(
    (key) => !config[key as keyof DojoChainConfig]
  );

  if (missing.length > 0) {
    throw new Error(
      `Missing required chain config for ${chainId}: ${missing.join(", ")}`
    );
  }
};

const getDefaultChainId = (): ChainId => {
  const envChainId = import.meta.env.VITE_CHAIN_ID as ChainId;

  if (envChainId && !isChainIdSupported(envChainId)) {
    throw new Error(`Unsupported chain ID in environment: ${envChainId}`);
  }

  return envChainId || ChainId.KATANA_LOCAL;
};

export const isChainIdSupported = (chainId: ChainId): boolean => {
  return Object.keys(dojoContextConfig).includes(chainId);
};

export const getDojoChainConfig = (
  chainId: ChainId
): DojoChainConfig | null => {
  if (!isChainIdSupported(chainId)) {
    return null;
  }
  let result = { ...dojoContextConfig[chainId] };
  //
  // derive starknet Chain
  if (!result.chain) {
    result.chain = {
      id: BigInt(stringToFelt(result.chainId!)),
      name: result.name,
      network: result.network ?? "katana",
      testnet: result.testnet ?? true,
      nativeCurrency: result.nativeCurrency,
      rpcUrls: {
        default: { http: [] },
        public: { http: [] },
      },
      explorers: result.explorers,
    } as Chain;
  }
  //
  // override env (default chain only)
  if (chainId == getDefaultChainId()) {
    result = {
      ...result,
      ...cleanObject(envChainConfig),
    };
  }
  //
  // use Cartridge RPCs
  if (result.rpcUrl) {
    result.chain!.rpcUrls.default.http = [result.rpcUrl];
    result.chain!.rpcUrls.public.http = [result.rpcUrl];
  }

  return result;
};

export const getStarknetProviderChains = (
  supportedChainIds: ChainId[]
): Chain[] => {
  return supportedChainIds.reduce<Chain[]>((acc, chainId) => {
    const dojoChainConfig = getDojoChainConfig(chainId);
    if (dojoChainConfig?.chain) {
      acc.push(dojoChainConfig.chain);
    }
    return acc;
  }, []);
};

const manifests: Record<ChainId, DojoManifest> = {
  [ChainId.KATANA_LOCAL]: tournament_manifest_dev as DojoManifest,
  [ChainId.WP_TOURNAMENTS]: tournament_manifest_slot as DojoManifest,
  [ChainId.SN_MAIN]: tournament_manifest_mainnet as DojoManifest,
  [ChainId.SN_SEPOLIA]: tournament_manifest_sepolia as DojoManifest,
};

let katanaContractInterfaces: ContractInterfaces = {
  tournament_mock: ["ITournamentMock"],
  erc20_mock: ["IERC20Mock"],
  erc721_mock: ["IERC721Mock"],
};

let mainnetContractInterfaces: ContractInterfaces = {
  tournament: ["ITournament"],
};

const CONTRACT_INTERFACES: Record<ChainId, ContractInterfaces> = {
  [ChainId.KATANA_LOCAL]: katanaContractInterfaces,
  [ChainId.WP_TOURNAMENTS]: katanaContractInterfaces,
  [ChainId.SN_MAIN]: mainnetContractInterfaces,
  [ChainId.SN_SEPOLIA]: katanaContractInterfaces,
};

//
// currencies
//
const ETH_KATANA: NativeCurrency = {
  address: KATANA_ETH_CONTRACT_ADDRESS,
  name: "Ether",
  symbol: "ETH",
  decimals: 18,
};

//
// explorers
//
type ChainExplorers = {
  [key: string]: string[];
};
const WORLD_EXPLORER: ChainExplorers = {
  worlds: ["https://worlds.dev"],
};

//
// chain config
//
export type DojoChainConfig = {
  chain?: Chain;
  chainId?: ChainId;
  name?: string;
  rpcUrl?: string;
  toriiUrl?: string;
  toriiTokensUrl?: string;
  relayUrl?: string;
  blastRpc?: string;
  blockExplorerUrl?: string;
  ekuboPriceAPI?: string;
  masterAddress?: string;
  masterPrivateKey?: string;
  accountClassHash?: string;
  ethAddress?: string;
  connectorIds?: string[];
  // starknet Chain
  network?: string;
  testnet?: boolean;
  nativeCurrency?: NativeCurrency;
  explorers?: ChainExplorers;
};

const localKatanaConfig: DojoChainConfig = {
  chain: undefined, // derive from this
  chainId: ChainId.KATANA_LOCAL,
  name: "Katana Local",
  rpcUrl: LOCAL_KATANA,
  toriiUrl: "http://localhost:8081", //LOCAL_TORII,
  toriiTokensUrl: "http://localhost:8081",
  relayUrl: LOCAL_RELAY,
  blastRpc: undefined,
  blockExplorerUrl: undefined,
  ekuboPriceAPI: undefined,
  // masterAddress: KATANA_PREFUNDED_ADDRESS,
  // masterPrivateKey: KATANA_PREFUNDED_PRIVATE_KEY,
  masterAddress:
    "0x127fd5f1fe78a71f8bcd1fec63e3fe2f0486b6ecd5c86a0466c3a21fa5cfcec",
  masterPrivateKey:
    "0xc5b2fcab997346f3ea1c00b002ecf6f382c5f9c9659a3894eb783c5320f912",
  accountClassHash: KATANA_CLASS_HASH,
  ethAddress: KATANA_ETH_CONTRACT_ADDRESS,
  connectorIds: [supportedConnectorIds.PREDEPLOYED],
  // starknet Chain
  nativeCurrency: ETH_KATANA,
  explorers: WORLD_EXPLORER,
} as const;

const slotKatanaConfig: DojoChainConfig = {
  chain: undefined, // derive from this
  chainId: ChainId.WP_TOURNAMENTS,
  name: "Katana Slot",
  rpcUrl: "https://api.cartridge.gg/x/tournaments/katana",
  toriiUrl: "https://api.cartridge.gg/x/tournaments/torii",
  toriiTokensUrl: "",
  relayUrl: undefined,
  blastRpc: undefined,
  blockExplorerUrl: undefined,
  ekuboPriceAPI: "https://mainnet-api.ekubo.org/price",
  // masterAddress: KATANA_PREFUNDED_ADDRESS,
  // masterPrivateKey: KATANA_PREFUNDED_PRIVATE_KEY,
  masterAddress:
    "0x5b6b8189bb580f0df1e6d6bec509ff0d6c9be7365d10627e0cf222ec1b47a71",
  masterPrivateKey:
    "0x33003003001800009900180300d206308b0070db00121318d17b5e6262150b",
  accountClassHash: KATANA_CLASS_HASH,
  ethAddress: KATANA_ETH_CONTRACT_ADDRESS,
  connectorIds: [supportedConnectorIds.CONTROLLER],
  // starknet Chain
  nativeCurrency: ETH_KATANA,
  explorers: WORLD_EXPLORER,
};

const snSepoliaConfig: DojoChainConfig = {
  chain: undefined, // derive from this
  chainId: ChainId.SN_SEPOLIA,
  name: "Starknet Sepolia",
  rpcUrl: "https://api.cartridge.gg/x/starknet/sepolia",
  toriiUrl: "https://api.cartridge.gg/x/darkshuffle-sepolia/torii",
  toriiTokensUrl: "",
  relayUrl: undefined,
  blastRpc: undefined,
  blockExplorerUrl: "https://sepolia.voyager.online/",
  ekuboPriceAPI: "https://sepolia-api.ekubo.org/price",
  // masterAddress: KATANA_PREFUNDED_ADDRESS,
  // masterPrivateKey: KATANA_PREFUNDED_PRIVATE_KEY,
  masterAddress: undefined,
  masterPrivateKey: undefined,
  accountClassHash: undefined,
  ethAddress: sepolia.nativeCurrency.address,
  connectorIds: [supportedConnectorIds.CONTROLLER],
};

const snMainnetConfig: DojoChainConfig = {
  chain: { ...mainnet },
  chainId: ChainId.SN_MAIN,
  name: "Mainnet",
  rpcUrl: "https://api.cartridge.gg/x/starknet/mainnet",
  toriiUrl: "https://api.cartridge.gg/x/budokan-mainnet/torii",
  toriiTokensUrl: "https://api.cartridge.gg/x/pg-mainnet-tokens/torii",
  relayUrl: undefined,
  blastRpc:
    "https://starknet-mainnet.blastapi.io/5ef61753-e7c1-4593-bc62-97fdf96f8de5",
  blockExplorerUrl: "https://voyager.online/",
  ekuboPriceAPI: "https://mainnet-api.ekubo.org/price",
  masterAddress: undefined,
  masterPrivateKey: undefined,
  accountClassHash: undefined,
  ethAddress: mainnet.nativeCurrency.address,
  connectorIds: [supportedConnectorIds.CONTROLLER],
} as const;

// environment overrides, will be applied over default chain only
export const envChainConfig: DojoChainConfig = {
  chain: undefined,
  chainId: undefined,
  name: undefined,
  rpcUrl: import.meta.env.VITE_NODE_URL || undefined,
  toriiUrl: import.meta.env.VITE_TORII || undefined,
  toriiTokensUrl: import.meta.env.VITE_TORII_TOKENS || undefined,
  relayUrl: import.meta.env.VITE_RELAY_URL || undefined,
  masterAddress: import.meta.env.VITE_MASTER_ADDRESS || undefined,
  masterPrivateKey: import.meta.env.VITE_MASTER_PRIVATE_KEY || undefined,
  accountClassHash: undefined,
  ethAddress: undefined,
  connectorIds: undefined,
};

export const dojoContextConfig: Record<ChainId, DojoChainConfig> = {
  [ChainId.KATANA_LOCAL]: localKatanaConfig,
  [ChainId.WP_TOURNAMENTS]: slotKatanaConfig,
  [ChainId.SN_MAIN]: snMainnetConfig,
  [ChainId.SN_SEPOLIA]: snSepoliaConfig,
};

//------------------------

export const makeDojoAppConfig = (): DojoAppConfig => {
  const initialChainId = getDefaultChainId();

  // Validate chain configuration before creating app config
  const chainConfig = dojoContextConfig[initialChainId];
  validateChainConfig(chainConfig, initialChainId);

  // Initialize controller with error handling
  const controller =
    initialChainId !== ChainId.KATANA_LOCAL
      ? (() => {
          try {
            return initializeController(
              manifests[initialChainId],
              chainConfig.rpcUrl!,
              initialChainId
            );
          } catch (error) {
            console.error(
              `Failed to initialize controller for chain ${initialChainId}:`,
              error
            );
            return undefined;
          }
        })()
      : undefined;

  return {
    manifests,
    supportedChainIds,
    initialChainId,
    nameSpace: NAMESPACE,
    contractInterfaces: CONTRACT_INTERFACES[initialChainId],
    starknetDomain: {
      name: "Tournament",
      version: "0.1.0",
      chainId: initialChainId,
      revision: "1",
    },
    controllerConnector: controller,
  };
};

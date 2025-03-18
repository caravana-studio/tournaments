export interface TableData {
  id: number;
  name: string;
  email: string;
}

export type Token = {
  address: string;
  name: string;
  symbol: string;
  token_type: string;
  is_registered: boolean;
};

export type TokenPrizes = Record<
  string,
  {
    type: "erc20" | "erc721";
    address: string;
    value: bigint[] | bigint;
  }
>;

export type PositionPrizes = Record<
  string,
  Record<
    string,
    {
      type: "erc20" | "erc721";
      payout_position: string;
      address: string;
      value: bigint[] | bigint;
    }
  >
>;

export interface NewPrize {
  tokenAddress: string;
  tokenType: "ERC20" | "ERC721" | "";
  amount?: number;
  value?: number;
  tokenId?: number;
  position?: number;
}

import { TournamentFormData } from "@/containers/CreateTournament";
import { bigintToHex, stringToFelt } from "@/lib/utils";
import {
  addAddressPadding,
  CairoOption,
  CairoOptionVariant,
  CairoCustomEnum,
  BigNumberish,
} from "starknet";
import {
  Prize,
  Tournament,
  Token,
  EntryFee,
  PrizeClaim,
} from "@/generated/models.gen";
import { PositionPrizes, TokenPrizes } from "@/lib/types";
import { TokenPrices } from "@/hooks/useEkuboPrices";

const SECONDS_IN_DAY = 86400;
const SECONDS_IN_HOUR = 3600;

export const processTournamentData = (
  formData: TournamentFormData,
  address: string,
  tournamentCount: number
): Tournament => {
  const startTimestamp = Math.floor(
    formData.startTime.getTime() / 1000 -
      formData.startTime.getTimezoneOffset() * 60
  );

  const currentTime = Number(BigInt(new Date().getTime()) / 1000n + 60n);

  // End time is start time + duration in days
  const endTimestamp = startTimestamp + formData.duration * SECONDS_IN_DAY;

  // Process entry requirement based on type and requirement
  let entryRequirement;
  if (formData.enableGating && formData.gatingOptions?.type) {
    switch (formData.gatingOptions.type) {
      case "token":
        entryRequirement = new CairoCustomEnum({
          token: formData.gatingOptions.token,
          tournament: undefined,
          allowlist: undefined,
        });
        break;
      case "tournament":
        entryRequirement = new CairoCustomEnum({
          token: undefined,
          tournament: {
            winners:
              formData.gatingOptions.tournament?.requirement === "won"
                ? formData.gatingOptions.tournament.tournaments.map((t) => t.id)
                : [],
            participants:
              formData.gatingOptions.tournament?.requirement === "participated"
                ? formData.gatingOptions.tournament.tournaments.map((t) => t.id)
                : [],
          },
          allowlist: undefined,
        });
        break;
      case "addresses":
        entryRequirement = new CairoCustomEnum({
          token: undefined,
          tournament: undefined,
          allowlist: formData.gatingOptions.addresses,
        });
        break;
    }
  }

  return {
    id: tournamentCount + 1,
    created_at: 0,
    created_by: addAddressPadding(address),
    creator_token_id: 0,
    metadata: {
      name: addAddressPadding(bigintToHex(stringToFelt(formData.name))),
      description: formData.description,
    },
    schedule: {
      registration:
        formData.type === "fixed"
          ? new CairoOption(CairoOptionVariant.Some, {
              start: currentTime,
              end: startTimestamp,
            })
          : new CairoOption(CairoOptionVariant.None),
      game: {
        start: startTimestamp,
        end: endTimestamp,
      },
      submission_duration: Number(formData.submissionPeriod) * SECONDS_IN_HOUR,
    },
    game_config: {
      address: addAddressPadding(formData.game),
      settings_id: 0,
      prize_spots: formData.leaderboardSize,
    },
    entry_fee: formData.enableEntryFees
      ? new CairoOption(CairoOptionVariant.Some, {
          token_address: formData.entryFees?.tokenAddress!,
          amount: addAddressPadding(
            bigintToHex(formData.entryFees?.amount! * 10 ** 18)
          ),
          distribution: formData.entryFees?.prizeDistribution?.map(
            (prize) => prize.percentage
          )!,
          tournament_creator_share: new CairoOption(
            CairoOptionVariant.Some,
            formData.entryFees?.creatorFeePercentage
          ),
          game_creator_share: new CairoOption(
            CairoOptionVariant.Some,
            formData.entryFees?.gameFeePercentage
          ),
        })
      : new CairoOption(CairoOptionVariant.None),
    entry_requirement: formData.enableGating
      ? new CairoOption(CairoOptionVariant.Some, entryRequirement)
      : new CairoOption(CairoOptionVariant.None),
  };
};

export const processPrizes = (
  formData: TournamentFormData,
  tournamentCount: number,
  prizeCount: number
): Prize[] => {
  if (!formData.enableBonusPrizes || !formData.bonusPrizes?.length) {
    return [];
  }

  return formData.bonusPrizes.map((prize, _) => ({
    id: prizeCount + 1,
    tournament_id: tournamentCount + 1,
    token_address: prize.tokenAddress,
    token_type:
      prize.type === "ERC20"
        ? new CairoCustomEnum({
            erc20: {
              amount: addAddressPadding(bigintToHex(prize.amount! * 10 ** 18)),
            },
            erc721: undefined,
          })
        : new CairoCustomEnum({
            erc20: undefined,
            erc721: {
              id: addAddressPadding(bigintToHex(prize.tokenId!)),
            },
          }),
    payout_position: prize.position,
    claimed: false,
  }));
};

export const getSubmittableScores = (leaderboardSize: number) => {
  return Array.from({ length: leaderboardSize }, (_, index) => index + 1);
};

export const extractEntryFeePrizes = (
  tournamentId: BigNumberish,
  entryFee: CairoOption<EntryFee>,
  entryCount: BigNumberish
): Prize[] => {
  if (!entryFee?.isSome()) {
    return [];
  }

  const totalFeeAmount = BigInt(entryFee.Some?.amount!) * BigInt(entryCount);

  if (totalFeeAmount === 0n) {
    return [];
  }

  const gameCreatorShare = entryFee.Some?.game_creator_share?.isSome()
    ? [
        {
          id: 0,
          tournament_id: tournamentId,
          payout_position: 0,
          token_address: entryFee.Some?.token_address!,
          token_type: new CairoCustomEnum({
            erc20: {
              amount: addAddressPadding(
                bigintToHex(
                  (totalFeeAmount *
                    BigInt(entryFee?.Some.game_creator_share?.Some!)) /
                    100n
                )
              ),
            },
            erc721: undefined,
          }),
          type: "entry_fee_game_creator",
        } as Prize,
      ]
    : [];

  const tournamentCreatorShare =
    entryFee.Some?.tournament_creator_share?.isSome()
      ? [
          {
            id: 0,
            tournament_id: tournamentId,
            payout_position: 0,
            token_address: entryFee.Some?.token_address!,
            token_type: new CairoCustomEnum({
              erc20: {
                amount: addAddressPadding(
                  bigintToHex(
                    (totalFeeAmount *
                      BigInt(entryFee?.Some.tournament_creator_share?.Some!)) /
                      100n
                  )
                ),
              },
              erc721: undefined,
            }),
            type: "entry_fee_tournament_creator",
          } as Prize,
        ]
      : [];

  const distrbutionPrizes =
    entryFee.Some?.distribution?.map((distribution, index) => {
      const amount = (totalFeeAmount * BigInt(distribution)) / 100n;

      return {
        id: 0,
        tournament_id: tournamentId,
        payout_position: index + 1,
        token_address: entryFee.Some?.token_address!,
        token_type: new CairoCustomEnum({
          erc20: {
            amount: addAddressPadding(bigintToHex(amount)),
          },
          erc721: undefined,
        }),
        type: "entry_fee",
      } as Prize;
    }) || [];

  return [...gameCreatorShare, ...tournamentCreatorShare, ...distrbutionPrizes];
};

export const getClaimablePrizes = (
  prizes: any[],
  claimedPrizes: PrizeClaim[],
  totalSubmissions: number
) => {
  const creatorPrizeTypes = new Set([
    "entry_fee_game_creator",
    "entry_fee_tournament_creator",
  ]);

  const creatorPrizes = prizes.filter((prize) =>
    creatorPrizeTypes.has(prize.type)
  );
  const prizesFromSubmissions = prizes.filter(
    (prize) =>
      !creatorPrizeTypes.has(prize.type) &&
      prize.payout_position <= totalSubmissions
  );
  const claimedEntryFeePositions = claimedPrizes.map((prize) =>
    prize.prize_type?.activeVariant() === "EntryFees"
      ? prize.prize_type.variant.EntryFees.Position
      : null
  );
  const claimedSponsoredPrizeKeys = claimedPrizes.map((prize) =>
    prize.prize_type?.activeVariant() === "Sponsored"
      ? prize.prize_type.variant.Sponsored
      : null
  );
  const allPrizes = [...creatorPrizes, ...prizesFromSubmissions];
  const unclaimedPrizes = allPrizes.filter((prize) => {
    if (prize.type === "entry_fee_game_creator") {
      return !claimedPrizes.some(
        (claimedPrize) =>
          claimedPrize.prize_type?.activeVariant() === "EntryFees" &&
          claimedPrize.prize_type?.variant.EntryFees.GameCreator
      );
    } else if (prize.type === "entry_fee_tournament_creator") {
      return !claimedPrizes.some(
        (claimedPrize) =>
          claimedPrize.prize_type?.activeVariant() === "EntryFees" &&
          claimedPrize.prize_type?.variant.EntryFees.TournamentCreator
      );
    } else if (prize.type === "entry_fee") {
      return !claimedEntryFeePositions.includes(prize.payout_position);
    } else {
      return !claimedSponsoredPrizeKeys.includes(prize.id);
    }
  });
  const unclaimedPrizeTypes = unclaimedPrizes.map((prize) => {
    if (prize.type === "entry_fee_game_creator") {
      return new CairoCustomEnum({
        EntryFees: new CairoCustomEnum({
          TournamentCreator: undefined,
          GameCreator: {},
          Position: undefined,
        }),
        Sponsored: undefined,
      });
    } else if (prize.type === "entry_fee_tournament_creator") {
      return new CairoCustomEnum({
        EntryFees: new CairoCustomEnum({
          TournamentCreator: {},
          GameCreator: undefined,
          Position: undefined,
        }),
        Sponsored: undefined,
      });
    } else if (prize.type === "entry_fee") {
      return new CairoCustomEnum({
        EntryFees: new CairoCustomEnum({
          TournamentCreator: undefined,
          GameCreator: undefined,
          Position: prize.payout_position,
        }),
        Sponsored: undefined,
      });
    } else {
      return new CairoCustomEnum({
        EntryFees: undefined,
        Sponsored: prize.id,
      });
    }
  });
  return {
    claimablePrizes: unclaimedPrizes,
    claimablePrizeTypes: unclaimedPrizeTypes,
  };
};

export const groupPrizesByPositions = (prizes: Prize[], tokens: Token[]) => {
  return prizes
    .filter((prize) => prize.payout_position !== 0)
    .sort((a, b) => Number(a.payout_position) - Number(b.payout_position))
    .reduce((acc, prize) => {
      const position = prize.payout_position.toString();
      const tokenModel = tokens.find((t) => t.address === prize.token_address);

      if (!tokenModel?.symbol) {
        console.warn(`No token model found for address ${prize.token_address}`);
        return acc;
      }

      const tokenSymbol = tokenModel.symbol;

      if (!acc[position]) {
        acc[position] = {};
      }

      if (!acc[position][tokenSymbol]) {
        acc[position][tokenSymbol] = {
          type: prize.token_type.activeVariant() as "erc20" | "erc721",
          payout_position: position,
          address: prize.token_address,
          value: prize.token_type.activeVariant() === "erc721" ? [] : 0n,
        };
      }

      if (prize.token_type.activeVariant() === "erc721") {
        (acc[position][tokenSymbol].value as bigint[]).push(
          BigInt(prize.token_type.variant.erc721.id!)
        );
      } else if (prize.token_type.activeVariant() === "erc20") {
        const currentAmount = acc[position][tokenSymbol].value as bigint;
        const newAmount = BigInt(prize.token_type.variant.erc20.amount);
        acc[position][tokenSymbol].value = currentAmount + newAmount;
      }

      return acc;
    }, {} as PositionPrizes);
};

export const groupPrizesByTokens = (prizes: Prize[], tokens: Token[]) => {
  return prizes.reduce((acc, prize) => {
    const tokenModel = tokens.find((t) => t.address === prize.token_address);
    const tokenSymbol = tokenModel?.symbol;

    if (!tokenSymbol) {
      console.warn(`No token model found for address ${prize.token_address}`);
      return acc;
    }

    if (!acc[tokenSymbol]) {
      acc[tokenSymbol] = {
        type: prize.token_type.activeVariant() as "erc20" | "erc721",
        address: prize.token_address,
        value: prize.token_type.activeVariant() === "erc721" ? [] : 0n,
      };
    }

    if (prize.token_type.activeVariant() === "erc721") {
      // For ERC721, push the token ID to the array
      (acc[tokenSymbol].value as bigint[]).push(
        BigInt(prize.token_type.variant.erc721.id!)
      );
    } else if (prize.token_type.activeVariant() === "erc20") {
      // For ERC20, sum up the values
      const currentAmount = acc[tokenSymbol].value as bigint;
      const newAmount = BigInt(prize.token_type.variant.erc20.amount);
      acc[tokenSymbol].value = currentAmount + newAmount;
    }

    return acc;
  }, {} as TokenPrizes);
};

export const getErc20TokenSymbols = (
  groupedPrizes: Record<
    string,
    { type: "erc20" | "erc721"; value: bigint | bigint[] }
  >
) => {
  return Object.entries(groupedPrizes)
    .filter(([_, prize]) => prize.type === "erc20")
    .map(([symbol, _]) => symbol);
};

export const calculatePrizeValue = (
  prize: {
    type: "erc20" | "erc721";
    value: bigint[] | bigint;
  },
  symbol: string,
  prices: Record<string, number | undefined>
): number => {
  if (prize.type !== "erc20") return 0;

  const price = prices[symbol] || 1;
  const amount = Number(prize.value);
  return Number(price * amount) / 10 ** 18;
};

export const calculateTotalValue = (
  groupedPrizes: TokenPrizes,
  prices: TokenPrices
) => {
  return Object.entries(groupedPrizes)
    .filter(([_, prize]) => prize.type === "erc20")
    .reduce((total, [symbol, prize]) => {
      const price = prices[symbol] || 1;
      const amount = Number(prize.value);
      return total + Number(price * amount) / 10 ** 18;
    }, 0);
};

export const countTotalNFTs = (groupedPrizes: TokenPrizes) => {
  return Object.entries(groupedPrizes)
    .filter(([_, prize]) => prize.type === "erc721")
    .reduce((total, [_, prize]) => {
      return total + (prize.value as bigint[]).length;
    }, 0);
};

export const processTournamentFromSql = (tournament: any): Tournament => {
  let entryRequirement;
  if (tournament["entry_requirement"] === "Some") {
    switch (tournament["entry_requirement.Some"]) {
      case "token":
        entryRequirement = new CairoCustomEnum({
          token: tournament["entry_requirement.Some.token"],
          tournament: undefined,
          allowlist: undefined,
        });
        break;
      case "tournament":
        entryRequirement = new CairoCustomEnum({
          token: undefined,
          tournament: {
            winners:
              tournament["entry_requirement.Some.tournament"] === "winners"
                ? tournament["entry_requirement.Some.tournament.winners"]
                : [],
            participants:
              tournament["entry_requirement.Some.tournament"] === "participants"
                ? tournament["entry_requirement.Some.tournament.participants"]
                : [],
          },
          allowlist: undefined,
        });
        break;
      case "allowlist":
        entryRequirement = new CairoCustomEnum({
          token: undefined,
          tournament: undefined,
          allowlist: tournament["entry_requirement.Some.allowlist"],
        });
        break;
    }
  }

  return {
    id: tournament.id,
    created_at: tournament.created_at,
    created_by: tournament.created_by,
    creator_token_id: tournament.creator_token_id,
    metadata: {
      name: tournament["metadata.name"],
      description: tournament["metadata.description"],
    },
    schedule: {
      registration:
        tournament["schedule.registration"] === "Some"
          ? new CairoOption(CairoOptionVariant.Some, {
              start: tournament["schedule.registration.Some.start"],
              end: tournament["schedule.registration.Some.end"],
            })
          : new CairoOption(CairoOptionVariant.None),
      game: {
        start: tournament["schedule.game.start"],
        end: tournament["schedule.game.end"],
      },
      submission_duration: tournament["schedule.submission_duration"],
    },
    game_config: {
      address: tournament["game_config.address"],
      settings_id: tournament["game_config.settings_id"],
      prize_spots: tournament["game_config.prize_spots"],
    },
    entry_fee:
      tournament["entry_fee"] === "Some"
        ? new CairoOption(CairoOptionVariant.Some, {
            token_address: tournament["entry_fee.Some.token_address"],
            amount: tournament["entry_fee.Some.amount"],
            distribution: JSON.parse(tournament["entry_fee.Some.distribution"]),
            tournament_creator_share:
              tournament["entry_fee.Some.tournament_creator_share"] === "Some"
                ? new CairoOption(
                    CairoOptionVariant.Some,
                    tournament["entry_fee.Some.tournament_creator_share.Some"]
                  )
                : new CairoOption(CairoOptionVariant.None),
            game_creator_share:
              tournament["entry_fee.Some.game_creator_share"] === "Some"
                ? new CairoOption(
                    CairoOptionVariant.Some,
                    tournament["entry_fee.Some.game_creator_share.Some"]
                  )
                : new CairoOption(CairoOptionVariant.None),
          })
        : new CairoOption(CairoOptionVariant.None),
    entry_requirement:
      tournament["entry_requirement"] === "Some"
        ? new CairoOption(CairoOptionVariant.Some, entryRequirement)
        : new CairoOption(CairoOptionVariant.None),
  };
};

export const processPrizesFromSql = (
  prizes: any,
  tournamentId: BigNumberish
): Prize[] => {
  return prizes
    ? prizes
        .split("|")
        .map((prizeStr: string) => {
          const prize = JSON.parse(prizeStr);
          return {
            id: prize.prizeId,
            tournament_id: tournamentId,
            payout_position: prize.position,
            token_address: prize.tokenAddress,
            token_type:
              prize.tokenType === "erc20"
                ? new CairoCustomEnum({
                    erc20: {
                      amount: prize.amount,
                    },
                    erc721: undefined,
                  })
                : new CairoCustomEnum({
                    erc20: undefined,
                    erc721: {
                      id: prize.amount,
                    },
                  }),
          };
        })
        .sort(
          (a: Prize, b: Prize) =>
            Number(a.payout_position) - Number(b.payout_position)
        )
    : null;
};

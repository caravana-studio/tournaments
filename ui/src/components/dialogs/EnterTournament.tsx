import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { useSystemCalls } from "@/dojo/hooks/useSystemCalls";
import { useAccount } from "@starknet-react/core";
import { Tournament, Token, EntryCount } from "@/generated/models.gen";
import {
  stringToFelt,
  feltToString,
  indexAddress,
  bigintToHex,
  formatNumber,
  displayAddress,
} from "@/lib/utils";
import { addAddressPadding, BigNumberish } from "starknet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useConnectToSelectedChain } from "@/dojo/hooks/useChain";
import { useGetUsernames } from "@/hooks/useController";
import { CHECK, X, COIN, FAT_ARROW_RIGHT, USER } from "@/components/Icons";
import {
  useGetAccountTokenIds,
  useGetTournamentRegistrants,
  useGetTournamentLeaderboards,
  useGetTournamentQualificationEntries,
} from "@/dojo/hooks/useSqlQueries";
import { useDojo } from "@/context/dojo";
import { processQualificationProof } from "@/lib/utils/formatting";
import { getTokenLogoUrl } from "@/lib/tokensMeta";

interface EnterTournamentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hasEntryFee?: boolean;
  entryFeePrice?: number;
  tournamentModel: Tournament;
  entryCountModel: EntryCount;
  // gameCount: BigNumberish;
  tokens: Token[];
  tournamentsData: Tournament[];
}

// Update the proof type to make tournamentId and position optional
type Proof = {
  tournamentId?: string;
  tokenId?: string;
  position?: number;
};

// Update the entriesLeftByTournament type to include either tournamentId or token
type EntriesLeftCount = {
  tournamentId?: string;
  token?: string;
  address?: string;
  entriesLeft: number;
};

export function EnterTournamentDialog({
  open,
  onOpenChange,
  hasEntryFee,
  entryFeePrice,
  tournamentModel,
  entryCountModel,
  // gameCount,
  tokens,
  tournamentsData,
}: EnterTournamentDialogProps) {
  const { nameSpace } = useDojo();
  const { address } = useAccount();
  const { connect } = useConnectToSelectedChain();
  const { approveAndEnterTournament, getBalanceGeneral } = useSystemCalls();
  const [playerName, setPlayerName] = useState("");
  const [balance, setBalance] = useState<BigNumberish>(0);

  const handleEnterTournament = () => {
    if (!playerName.trim()) return;

    const qualificationProof = processQualificationProof(
      requirementVariant ?? "",
      proof
    );

    approveAndEnterTournament(
      tournamentModel?.entry_fee,
      tournamentModel?.id,
      feltToString(tournamentModel?.metadata.name),
      // (Number(entryCountModel?.count) ?? 0) + 1,
      stringToFelt(playerName.trim()),
      addAddressPadding(address!),
      qualificationProof
      // gameCount
    );

    setPlayerName("");
  };

  const ownerAddresses = useMemo(() => {
    return [address ?? "0x0"];
  }, [address]);

  const { usernames } = useGetUsernames(ownerAddresses);

  const accountUsername = usernames?.get(indexAddress(address ?? ""));

  useEffect(() => {
    if (!open) {
      setPlayerName("");
    } else if (accountUsername) {
      setPlayerName(accountUsername);
    }
  }, [open]);

  const entryToken = tournamentModel?.entry_fee?.Some?.token_address;
  const entryAmount = tournamentModel?.entry_fee?.Some?.amount;

  const getBalance = async () => {
    const balance = await getBalanceGeneral(entryToken ?? "");
    setBalance(balance);
  };

  useEffect(() => {
    if (entryToken && address) {
      getBalance();
    }
  }, [entryToken, address, getBalance]);

  const hasBalance = BigInt(balance) >= BigInt(entryAmount ?? 0n);

  const hasEntryRequirement = tournamentModel?.entry_requirement.isSome();

  const entryLimit = tournamentModel?.entry_requirement.Some?.entry_limit?.Some;

  const requirementVariant =
    tournamentModel?.entry_requirement.Some?.entry_requirement_type?.activeVariant();

  const requiredTokenAddress =
    tournamentModel?.entry_requirement.Some?.entry_requirement_type?.variant
      ?.token;

  const token = tokens.find((token) => token.address === requiredTokenAddress);

  const tournamentRequirementVariant =
    tournamentModel?.entry_requirement.Some?.entry_requirement_type?.variant?.tournament?.activeVariant();

  const requiredTokenAddresses = requiredTokenAddress
    ? [indexAddress(requiredTokenAddress ?? "")]
    : [];

  const allowlistAddresses =
    tournamentModel?.entry_requirement.Some?.entry_requirement_type?.variant
      ?.allowlist;

  const { data: ownedTokens } = useGetAccountTokenIds(
    indexAddress(address ?? ""),
    requiredTokenAddresses,
    requiredTokenAddresses.length > 0
  );

  const ownedTokenIds = useMemo(() => {
    return ownedTokens
      ?.map((token) => {
        const parts = token.token_id?.split(":");
        return parts?.[1] ?? null;
      })
      .filter(Boolean);
  }, [ownedTokens]);

  const requiredTournamentGameAddresses = tournamentsData.map((tournament) =>
    indexAddress(tournament.game_config?.address ?? "")
  );

  const { data: ownedGames } = useGetAccountTokenIds(
    indexAddress(address ?? ""),
    requiredTournamentGameAddresses,
    requiredTournamentGameAddresses.length > 0
  );

  const ownedGameIds = useMemo(() => {
    return ownedGames
      ?.map((game) => {
        const parts = game.token_id?.split(":");
        return parts?.[1] ?? null;
      })
      .filter(Boolean);
  }, [ownedGames]);

  const { data: registrations } = useGetTournamentRegistrants({
    namespace: nameSpace ?? "",
    gameIds: ownedGameIds ?? [],
    active: requirementVariant === "tournament",
  });

  const { data: leaderboards } = useGetTournamentLeaderboards({
    namespace: nameSpace ?? "",
    tournamentIds: tournamentsData.map((tournament) => tournament.id),
    active: requirementVariant === "tournament",
  });

  const currentTime = BigInt(new Date().getTime()) / 1000n;

  const requiredTournamentRegistrations = useMemo(() => {
    if (!registrations || !tournamentsData) {
      return [];
    }

    // Create a Set of tournament IDs from tournamentsData for faster lookups
    const tournamentIdSet = new Set(
      tournamentsData.map((tournament) => tournament.id)
    );

    // Filter registrations that have a tournament ID in the set
    return registrations.filter((registration) =>
      tournamentIdSet.has(registration.tournament_id.toString())
    );
  }, [registrations, tournamentsData]);

  const hasParticipatedInTournamentMap = useMemo(() => {
    if (!requiredTournamentRegistrations) return {};

    return requiredTournamentRegistrations.reduce((acc, registration) => {
      const registrationTournamentId = registration.tournament_id;
      const registeredTournament = tournamentsData.find(
        (tournament) => tournament.id === registrationTournamentId
      );
      const registeredTournamentFinalizedTime =
        BigInt(registeredTournament?.schedule.game.end ?? 0n) +
        BigInt(registeredTournament?.schedule.submission_duration ?? 0n);
      const hasRegisteredTournamentFinalized =
        registeredTournamentFinalizedTime < currentTime;

      // Only add token ID if tournament has finalized
      if (hasRegisteredTournamentFinalized) {
        // Initialize array if it doesn't exist
        if (!acc[registration.tournament_id]) {
          acc[registration.tournament_id] = [];
        }

        // Add this token ID to the array
        acc[registration.tournament_id].push(registration.game_token_id);
      }
      return acc;
    }, {} as Record<string, string[]>);
  }, [requiredTournamentRegistrations, tournamentsData, currentTime]);

  const parseTokenIds = (tokenIdsString: string): string[] => {
    try {
      // Parse the JSON string into a JavaScript array
      const parsedArray = JSON.parse(tokenIdsString);

      // Ensure the result is an array
      if (Array.isArray(parsedArray)) {
        return parsedArray.map((tokenId) =>
          addAddressPadding(bigintToHex(BigInt(tokenId)))
        );
      } else {
        console.warn("Token IDs not in expected array format:", tokenIdsString);
        return [];
      }
    } catch (error) {
      console.error("Error parsing token IDs:", error);
      return [];
    }
  };

  const hasWonTournamentMap = useMemo(() => {
    if (!leaderboards || !ownedGameIds) return {};

    return leaderboards.reduce((acc, leaderboard) => {
      const leaderboardTournamentId = leaderboard.tournament_id;
      const leaderboardTournament = tournamentsData.find(
        (tournament) => tournament.id === leaderboardTournamentId
      );
      const leaderboardTournamentFinalizedTime =
        BigInt(leaderboardTournament?.schedule.game.end ?? 0n) +
        BigInt(leaderboardTournament?.schedule.submission_duration ?? 0n);
      const hasLeaderboardTournamentFinalized =
        leaderboardTournamentFinalizedTime < currentTime;

      if (hasLeaderboardTournamentFinalized) {
        // Parse the token_ids string into an array
        const leaderboardTokenIds = parseTokenIds(leaderboard.token_ids);

        // Initialize array if it doesn't exist
        if (!acc[leaderboard.tournament_id]) {
          acc[leaderboard.tournament_id] = [];
        }

        // Find all owned token IDs that appear in the leaderboard and their positions
        for (let i = 0; i < leaderboardTokenIds.length; i++) {
          const leaderboardTokenId = leaderboardTokenIds[i];
          if (ownedGameIds.includes(leaderboardTokenId)) {
            acc[leaderboard.tournament_id].push({
              tokenId: leaderboardTokenId,
              position: i + 1, // Convert to 1-based position for display
            });
          }
        }
      }

      return acc;
    }, {} as Record<string, Array<{ tokenId: string; position: number }>>);
  }, [leaderboards, ownedGameIds, tournamentsData, currentTime]);

  // need to get the number of entries for each of the qualification methods of the qualifying type
  // TODO: add for token and allowlist

  const qualificationMethods = useMemo(() => {
    const methods = [];

    if (!hasEntryRequirement) return [];

    if (requirementVariant === "token") {
      for (const tokenId of ownedTokenIds) {
        methods.push({
          type: "token",
          tokenId: tokenId,
        });
      }
    }

    if (requirementVariant === "tournament") {
      if (tournamentRequirementVariant === "winners") {
        for (const tournament of tournamentsData) {
          const tournamentId = tournament.id.toString();
          const wonInfoArray = hasWonTournamentMap[tournamentId];

          if (wonInfoArray && wonInfoArray.length > 0) {
            // Add a qualification method for each winning token
            for (const wonInfo of wonInfoArray) {
              methods.push({
                type: "tournament",
                tournamentId: tournamentId,
                gameId: wonInfo.tokenId,
                position: wonInfo.position,
              });
            }
          }
        }
      } else {
        for (const tournament of tournamentsData) {
          const tournamentId = tournament.id.toString();
          const gameIds = hasParticipatedInTournamentMap[tournamentId];

          if (gameIds && gameIds.length > 0) {
            // Add a qualification method for each participated token
            for (const gameId of gameIds) {
              methods.push({
                type: "tournament",
                tournamentId: tournamentId,
                gameId: gameId,
                position: 1,
              });
            }
          }
        }
      }
    }

    if (requirementVariant === "allowlist") {
      methods.push({
        type: "allowlist",
        address: address,
      });
    }

    return methods;
  }, [
    hasEntryRequirement,
    tournamentModel,
    tournamentRequirementVariant,
    hasWonTournamentMap,
    hasParticipatedInTournamentMap,
    ownedTokenIds,
    tournamentsData,
    entryCountModel?.count,
  ]);

  const { data: qualificationEntries } = useGetTournamentQualificationEntries({
    namespace: nameSpace ?? "",
    tournamentId: addAddressPadding(bigintToHex(tournamentModel?.id ?? 0n)),
    qualifications: qualificationMethods,
    active: qualificationMethods.length > 0,
  });

  const { meetsEntryRequirements, proof, entriesLeftByTournament } = useMemo<{
    meetsEntryRequirements: boolean;
    proof: Proof;
    entriesLeftByTournament: EntriesLeftCount[];
  }>(() => {
    let canEnter = false;
    let proof: Proof = { tokenId: "" };
    let entriesLeftByTournament: EntriesLeftCount[] = [];

    // If no entry requirement, user can always enter
    if (!hasEntryRequirement) {
      return {
        meetsEntryRequirements: true,
        proof,
        entriesLeftByTournament: [{ entriesLeft: Infinity }],
      };
    }

    // Handle token-based entry requirements
    if (requirementVariant === "token") {
      // If no owned tokens, can't enter
      if (!ownedTokenIds || ownedTokenIds.length === 0) {
        return {
          meetsEntryRequirements: false,
          proof,
          entriesLeftByTournament: [],
        };
      }

      // Track best token proof
      let bestTokenProof = { tokenId: "" };
      let maxTokenEntriesLeft = 0;
      let totalTokenEntriesLeft = 0;

      // Check each owned token
      for (const tokenId of ownedTokenIds) {
        // Get current entry count for this token
        const currentEntryCount =
          qualificationEntries?.find(
            (entry) => entry["qualification.token.token_id"] === tokenId
          )?.entry_count ?? 0;

        // Calculate remaining entries
        const remaining = (Number(entryLimit) ?? 0) - currentEntryCount;

        // If this token has entries left
        if (remaining > 0) {
          canEnter = true;
          totalTokenEntriesLeft += remaining;

          // If this is the best token so far
          if (remaining > maxTokenEntriesLeft) {
            bestTokenProof = {
              tokenId,
            };
            maxTokenEntriesLeft = remaining;
          }
        }
      }

      // If we found valid tokens with entries left
      if (canEnter) {
        proof = bestTokenProof;
        entriesLeftByTournament = [
          {
            token: requiredTokenAddresses[0],
            entriesLeft: totalTokenEntriesLeft,
          },
        ];
      }

      return {
        meetsEntryRequirements: canEnter,
        proof,
        entriesLeftByTournament,
      };
    }

    // Handle tournament-based entry requirements
    if (requirementVariant === "tournament") {
      if (!tournamentsData || tournamentsData.length === 0) {
        return {
          meetsEntryRequirements: false,
          proof,
          entriesLeftByTournament: [],
        };
      }

      // Track best proof across all tournaments
      let bestProof = { tournamentId: "", tokenId: "", position: 0 };
      let maxEntriesLeft = 0;

      // Check if the user meets at least one tournament requirement
      for (const tournament of tournamentsData) {
        const tournamentId = tournament.id.toString();
        let tournamentCanEnter = false;
        let tournamentTotalEntriesLeft = 0;
        let tournamentBestProof = {
          tournamentId: "",
          tokenId: "",
          position: 0,
        };
        let tournamentBestProofEntriesLeft = 0;

        // If requirement is for winners, check hasWonTournamentMap
        if (tournamentRequirementVariant === "winners") {
          const wonInfoArray = hasWonTournamentMap[tournamentId] || [];

          // Check each winning token
          for (const wonInfo of wonInfoArray) {
            // get the current entry count from the qualification data
            const currentEntryCount =
              qualificationEntries?.find(
                (entry) =>
                  entry["qualification.tournament.tournament_id"] ===
                    tournamentId &&
                  entry["qualification.tournament.position"] ===
                    wonInfo.position &&
                  entry["qualification.tournament.token_id"] === wonInfo.tokenId
              )?.entry_count ?? 0;

            const remaining = (Number(entryLimit) ?? 0) - currentEntryCount;

            // If this token has entries left
            if (remaining > 0) {
              tournamentCanEnter = true;
              // Add to total entries left for this tournament
              tournamentTotalEntriesLeft += remaining;

              // If this is the best proof for this tournament so far
              if (remaining > tournamentBestProofEntriesLeft) {
                tournamentBestProof = {
                  tournamentId,
                  tokenId: wonInfo.tokenId,
                  position: wonInfo.position,
                };
                tournamentBestProofEntriesLeft = remaining;
              }
            }
          }
        }
        // If requirement is for participants, check hasParticipatedInTournamentMap
        else if (tournamentRequirementVariant === "participants") {
          const gameIds = hasParticipatedInTournamentMap[tournamentId] || [];

          // Check each participated token
          for (const gameId of gameIds) {
            // get the current entry count from the qualification data
            const currentEntryCount =
              qualificationEntries?.find(
                (entry) =>
                  entry["qualification.tournament.tournament_id"] ===
                    tournamentId &&
                  entry["qualification.tournament.position"] === 1 &&
                  entry["qualification.tournament.token_id"] === gameId
              )?.entry_count ?? 0;

            const remaining = (Number(entryLimit) ?? 0) - currentEntryCount;

            // If this token has entries left
            if (remaining > 0) {
              tournamentCanEnter = true;
              // Add to total entries left for this tournament
              tournamentTotalEntriesLeft += remaining;

              // If this is the best proof for this tournament so far
              if (remaining > tournamentBestProofEntriesLeft) {
                tournamentBestProof = {
                  tournamentId,
                  tokenId: gameId,
                  position: 1,
                };
                tournamentBestProofEntriesLeft = remaining;
              }
            }
          }
        }

        // If this tournament has valid entries
        if (tournamentCanEnter) {
          // Add to our entries left array with the total entries left
          entriesLeftByTournament.push({
            tournamentId,
            entriesLeft: tournamentTotalEntriesLeft,
          });

          // Update overall can enter status
          canEnter = true;

          // Update best proof if this tournament has more entries left for a single token
          if (tournamentBestProofEntriesLeft > maxEntriesLeft) {
            bestProof = tournamentBestProof;
            maxEntriesLeft = tournamentBestProofEntriesLeft;
          }
        }
      }

      // Set the best proof we found
      if (canEnter) {
        proof = bestProof;
      }
    }

    // Handle allowlist-based entry requirements
    if (requirementVariant === "allowlist") {
      // If no address, can't enter
      if (!address) {
        return {
          meetsEntryRequirements: false,
          proof: {},
          entriesLeftByTournament: [],
        };
      }

      // Check if the user's address is in the allowlist
      const isInAllowlist = allowlistAddresses?.some(
        (allowedAddress: string) =>
          allowedAddress.toLowerCase() === address.toLowerCase()
      );

      if (!isInAllowlist) {
        return {
          meetsEntryRequirements: false,
          proof: { tokenId: "" },
          entriesLeftByTournament: [],
        };
      }

      // Get current entry count for this address from qualificationEntries
      const currentEntryCount = qualificationEntries[0]?.entry_count ?? 0;

      // Calculate remaining entries
      const remaining = (Number(entryLimit) ?? 0) - currentEntryCount;

      // If this address has entries left
      if (remaining > 0) {
        canEnter = true;
        entriesLeftByTournament = [
          {
            address,
            entriesLeft: remaining,
          },
        ];
      }

      return {
        meetsEntryRequirements: canEnter,
        proof: { tokenId: "" }, // Empty proof for allowlist
        entriesLeftByTournament,
      };
    }

    return {
      meetsEntryRequirements: canEnter,
      proof,
      entriesLeftByTournament,
    };
  }, [
    tournamentsData,
    tournamentRequirementVariant,
    hasWonTournamentMap,
    hasParticipatedInTournamentMap,
    hasEntryRequirement,
    qualificationEntries,
    ownedTokenIds,
    entryLimit,
    requirementVariant,
    address,
    allowlistAddresses,
  ]);

  // display the entry fee distribution

  const creatorShare = Number(
    tournamentModel?.entry_fee.Some?.tournament_creator_share.Some ?? 0n
  );
  const gameShare = Number(
    tournamentModel?.entry_fee.Some?.game_creator_share.Some ?? 0n
  );
  const prizePoolShare = 100 - creatorShare - gameShare;
  const creatorAmount =
    (Number(BigInt(tournamentModel?.entry_fee.Some?.amount ?? 0)) *
      (creatorShare / 100)) /
    10 ** 18;

  const gameAmount =
    (Number(BigInt(tournamentModel?.entry_fee.Some?.amount ?? 0)) *
      (gameShare / 100)) /
    10 ** 18;

  const prizePoolAmount =
    (Number(BigInt(tournamentModel?.entry_fee.Some?.amount ?? 0)) *
      (prizePoolShare / 100)) /
    10 ** 18;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-xl">Enter Tournament</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          {hasEntryFee && (
            <div className="flex flex-col gap-2">
              <span className="text-lg font-brand">Entry Fee</span>
              <div className="flex flex-col items-center">
                <div className="flex flex-row items-center justify-center gap-2">
                  <div className="flex flex-row items-center gap-1">
                    <span>{formatNumber(Number(entryAmount) / 10 ** 18)}</span>
                    <img
                      src={getTokenLogoUrl(entryToken ?? "")}
                      alt={entryToken ?? ""}
                      className="w-6 h-6"
                    />

                    <span>
                      {
                        tokens.find((token) => token.address === entryToken)
                          ?.symbol
                      }
                    </span>
                  </div>
                  <span className="text-neutral">
                    ~$
                    {(
                      Number(
                        BigInt(tournamentModel?.entry_fee.Some?.amount!) /
                          10n ** 18n
                      ) * Number(entryFeePrice)
                    ).toFixed(2)}
                  </span>
                  {address &&
                    (hasBalance ? (
                      <div className="flex flex-row items-center gap-2">
                        <span className="w-6 h-6">
                          <CHECK />
                        </span>
                        <span className="text-sm">Enough Balance</span>
                      </div>
                    ) : (
                      <div className="flex flex-row items-center gap-2">
                        <span className="w-6 h-6">
                          <X />
                        </span>
                        <span className="text-sm">Not Enough Balance</span>
                      </div>
                    ))}
                </div>
                <span className="w-10 rotate-90">
                  <FAT_ARROW_RIGHT />
                </span>
                <div className="flex flex-row items-center gap-2 w-full">
                  <div
                    className={`flex flex-col items-center gap-1 border border-brand-muted rounded-md p-2 w-1/3 ${
                      creatorAmount > 0 ? "" : "opacity-50"
                    }`}
                  >
                    <span className="text-sm sm:text-base">
                      {creatorShare}%
                    </span>
                    <span className="text-sm sm:text-base">Creator Fee</span>
                    <div className="flex flex-row items-center">
                      <span className="text-xs sm:text-sm">
                        +{formatNumber(creatorAmount)}
                      </span>
                      <img
                        src={getTokenLogoUrl(entryToken ?? "")}
                        alt={entryToken ?? ""}
                        className="w-5"
                      />
                      <span className="hidden sm:block text-xs sm:text-sm text-neutral">
                        ~${formatNumber(creatorAmount * (entryFeePrice ?? 0))}
                      </span>
                    </div>
                  </div>
                  <div
                    className={`flex flex-col items-center gap-1 border border-brand-muted rounded-md p-2 w-1/3 ${
                      gameAmount > 0 ? "" : "opacity-50"
                    }`}
                  >
                    <span className="text-sm sm:text-base">{gameShare}%</span>
                    <span className="text-sm sm:text-base">Game Fee</span>
                    <div className="flex flex-row items-center">
                      <span className="text-xs sm:text-sm">
                        +{formatNumber(gameAmount)}
                      </span>
                      <img
                        src={getTokenLogoUrl(entryToken ?? "")}
                        alt={entryToken ?? ""}
                        className="w-5"
                      />
                      <span className="hidden sm:block text-xs sm:text-sm text-neutral">
                        ~${formatNumber(gameAmount * (entryFeePrice ?? 0))}
                      </span>
                    </div>
                  </div>
                  <div
                    className={`flex flex-col items-center gap-1 border border-brand-muted rounded-md p-2 w-1/3 ${
                      prizePoolAmount > 0 ? "" : "opacity-50"
                    }`}
                  >
                    <span className="text-sm sm:text-base">
                      {prizePoolShare}%
                    </span>
                    <span className="text-sm sm:text-base">Prize Pool</span>
                    <div className="flex flex-row items-center">
                      <span className="text-xs sm:text-sm">
                        +{formatNumber(prizePoolAmount)}
                      </span>
                      <img
                        src={getTokenLogoUrl(entryToken ?? "")}
                        alt={entryToken ?? ""}
                        className="w-5"
                      />
                      <span className="hidden sm:block text-xs sm:text-sm text-neutral">
                        ~${formatNumber(prizePoolAmount * (entryFeePrice ?? 0))}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {hasEntryRequirement && (
            <div className="flex flex-col gap-2">
              <span className="text-lg font-brand">Entry Requirements</span>
              <span className="px-2">
                {requirementVariant === "token" ? (
                  "You must hold the NFT"
                ) : requirementVariant === "tournament" ? (
                  <div className="flex flex-row items-center gap-2">
                    {`You must have ${
                      tournamentRequirementVariant === "winners"
                        ? "won"
                        : "participated in"
                    }:`}
                  </div>
                ) : (
                  "Must be part of the allowlist"
                )}
              </span>
              {requirementVariant === "token" ? (
                <div className="flex flex-row items-center gap-2 px-4">
                  <span className="w-8">
                    <COIN />
                  </span>
                  <span>{token?.name}</span>
                  <span className="text-neutral">{token?.symbol}</span>
                  {address ? (
                    meetsEntryRequirements ? (
                      <div className="flex flex-row items-center gap-2">
                        <span className="w-5">
                          <CHECK />
                        </span>
                        <span>
                          {`${
                            entriesLeftByTournament.find(
                              (entry) =>
                                entry.token === requiredTokenAddresses[0]
                            )?.entriesLeft
                          } ${
                            entriesLeftByTournament.find(
                              (entry) =>
                                entry.token === requiredTokenAddresses[0]
                            )?.entriesLeft === 1
                              ? "entry"
                              : "entries"
                          } left`}
                        </span>
                      </div>
                    ) : (
                      <span className="w-5">
                        <X />
                      </span>
                    )
                  ) : (
                    <span className="text-warning">Connect Account</span>
                  )}
                </div>
              ) : requirementVariant === "tournament" ? (
                <div className="flex flex-col gap-2 px-4">
                  {tournamentsData.map((tournament) => (
                    <div
                      key={tournament.id}
                      className="flex flex-row items-center justify-between border border-brand-muted rounded-md p-2"
                    >
                      <span>{feltToString(tournament.metadata.name)}</span>
                      {address ? (
                        tournamentRequirementVariant === "winners" ? (
                          !!hasWonTournamentMap[tournament.id.toString()] ? (
                            <div className="flex flex-row items-center gap-2">
                              <span className="w-5">
                                <CHECK />
                              </span>
                              {entriesLeftByTournament.find(
                                (entry) =>
                                  entry.tournamentId ===
                                  tournament.id.toString()
                              )?.entriesLeft ?? 0 > 0 ? (
                                <span>
                                  {`${
                                    entriesLeftByTournament.find(
                                      (entry) =>
                                        entry.tournamentId ===
                                        tournament.id.toString()
                                    )?.entriesLeft
                                  } ${
                                    entriesLeftByTournament.find(
                                      (entry) =>
                                        entry.tournamentId ===
                                        tournament.id.toString()
                                    )?.entriesLeft === 1
                                      ? "entry"
                                      : "entries"
                                  } left`}
                                </span>
                              ) : (
                                <span>No entries left</span>
                              )}
                            </div>
                          ) : (
                            <span className="w-5">
                              <X />
                            </span>
                          )
                        ) : !!hasParticipatedInTournamentMap[
                            tournament.id.toString()
                          ] ? (
                          <div className="flex flex-row items-center gap-2">
                            <span className="w-5">
                              <CHECK />
                            </span>
                            {entriesLeftByTournament.find(
                              (entry) =>
                                entry.tournamentId === tournament.id.toString()
                            )?.entriesLeft ?? 0 > 0 ? (
                              <span>
                                {`${
                                  entriesLeftByTournament.find(
                                    (entry) =>
                                      entry.tournamentId ===
                                      tournament.id.toString()
                                  )?.entriesLeft
                                } ${
                                  entriesLeftByTournament.find(
                                    (entry) =>
                                      entry.tournamentId ===
                                      tournament.id.toString()
                                  )?.entriesLeft === 1
                                    ? "entry"
                                    : "entries"
                                } left`}
                              </span>
                            ) : (
                              <span>No entries left</span>
                            )}
                          </div>
                        ) : (
                          <span className="w-5">
                            <X />
                          </span>
                        )
                      ) : (
                        <span className="text-neutral">Connect Account</span>
                      )}
                    </div>
                  ))}
                </div>
              ) : address ? (
                <div className="flex flex-row items-center gap-2 px-4">
                  <span className="w-8">
                    <USER />
                  </span>
                  <span>{displayAddress(address)}</span>
                  {meetsEntryRequirements ? (
                    <div className="flex flex-row items-center gap-2">
                      <span className="w-5">
                        <CHECK />
                      </span>
                      <span>
                        {`${
                          entriesLeftByTournament.find(
                            (entry) => entry.address === address
                          )?.entriesLeft
                        } entries left`}
                      </span>
                    </div>
                  ) : (
                    <div className="flex flex-row items-center gap-2">
                      <span className="w-5">
                        <X />
                      </span>
                      <span>No entries</span>
                    </div>
                  )}
                </div>
              ) : (
                <span className="text-neutral">Connect Account</span>
              )}
            </div>
          )}
          <div className="flex flex-col gap-2">
            <Label htmlFor="playerName" className="text-lg font-brand">
              Player Name
            </Label>
            <div className="flex flex-col gap-4">
              {accountUsername && (
                <div className="flex flex-row justify-center gap-2">
                  <span className="text-brand-muted">Default:</span>
                  <span className="text-brand">{accountUsername}</span>
                </div>
              )}
              <Input
                id="playerName"
                placeholder="Enter your player name"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                className="w-full"
              />
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          {address ? (
            <DialogClose asChild>
              <Button
                disabled={!hasBalance || !meetsEntryRequirements}
                onClick={handleEnterTournament}
              >
                Enter Tournament
              </Button>
            </DialogClose>
          ) : (
            <Button onClick={() => connect()}>Connect Wallet</Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

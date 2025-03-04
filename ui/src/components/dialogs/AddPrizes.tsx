import { useEffect, useMemo, useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import TokenDialog from "@/components/dialogs/Token";
import AmountInput from "@/components/createTournament/inputs/Amount";
import {
  bigintToHex,
  calculateDistribution,
  getOrdinalSuffix,
} from "@/lib/utils";
import { NewPrize } from "@/lib/types";
import { Prize, Token } from "@/generated/models.gen";
import { useSystemCalls } from "@/dojo/hooks/useSystemCalls";
import { addAddressPadding, BigNumberish } from "starknet";
import { TOURNAMENT_VERSION_KEY } from "@/lib/constants";
import { CairoCustomEnum } from "starknet";
import { useGetMetricsQuery } from "@/dojo/hooks/useSdkQueries";
import { getTokenLogoUrl } from "@/lib/tokensMeta";
import { ALERT, CHECK, X } from "@/components/Icons";
import { useAccount } from "@starknet-react/core";
import { useConnectToSelectedChain } from "@/dojo/hooks/useChain";

export function AddPrizesDialog({
  open,
  onOpenChange,
  tournamentId,
  tournamentName,
  leaderboardSize,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tournamentId: BigNumberish;
  tournamentName: string;
  leaderboardSize: number;
}) {
  const { address } = useAccount();
  const { connect } = useConnectToSelectedChain();
  const { approveAndAddPrizes, getBalanceGeneral } = useSystemCalls();
  const [selectedToken, setSelectedToken] = useState<Token | null>(null);
  const [newPrize, setNewPrize] = useState<NewPrize>({
    tokenAddress: "",
    tokenType: "",
  });
  const [currentPrizes, setCurrentPrizes] = useState<NewPrize[]>([]);
  const [distributionWeight, setDistributionWeight] = useState(1);
  const [prizeDistributions, setPrizeDistributions] = useState<
    { position: number; percentage: number }[]
  >([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [onConfirmation, setOnConfirmation] = useState(false);
  const [_tokenBalances, setTokenBalances] = useState<Record<string, bigint>>(
    {}
  );
  const [isLoadingBalances, setIsLoadingBalances] = useState(false);
  const [hasInsufficientBalance, setHasInsufficientBalance] = useState(false);

  const { entity: metricsEntity } = useGetMetricsQuery(
    addAddressPadding(TOURNAMENT_VERSION_KEY)
  );

  const totalDistributionPercentage = useMemo(() => {
    return (
      prizeDistributions.reduce((sum, pos) => sum + (pos.percentage || 0), 0) ||
      0
    );
  }, [prizeDistributions]);

  const isValidPrize = () => {
    if (!newPrize.tokenAddress) return false;

    if (newPrize.tokenType === "ERC20") {
      return !!newPrize.amount && totalDistributionPercentage === 100;
    }

    if (newPrize.tokenType === "ERC721") {
      return !!newPrize.tokenId && !!newPrize.position;
    }

    return false;
  };

  const isERC20 = newPrize.tokenType === "ERC20";

  useEffect(() => {
    if (open && leaderboardSize) {
      // Initialize distributions when dialog opens
      const distributions = calculateDistribution(
        leaderboardSize,
        distributionWeight
      );
      setPrizeDistributions(
        distributions.map((percentage, index) => ({
          position: index + 1,
          percentage,
        }))
      );
    }
  }, [open, leaderboardSize]);

  useEffect(() => {
    if (!open) {
      setOnConfirmation(false);
    }
  }, [open]);

  const handleDialogClose = (isOpen: boolean) => {
    if (!isOpen) {
      setOnConfirmation(false);
      onOpenChange(false);
    } else {
      onOpenChange(true);
    }
  };

  const prizeCount = metricsEntity?.PrizeMetrics?.total_prizes ?? 0;

  const handleAddPrizes = async () => {
    if (
      newPrize.tokenType === "ERC20" &&
      newPrize.amount &&
      totalDistributionPercentage === 100
    ) {
      setCurrentPrizes([
        ...currentPrizes,
        ...prizeDistributions.map((prize) => ({
          tokenType: "ERC20" as const,
          tokenAddress: newPrize.tokenAddress,
          amount: ((newPrize.amount ?? 0) * prize.percentage) / 100,
          position: prize.position,
        })),
      ]);
    } else if (
      newPrize.tokenType === "ERC721" &&
      newPrize.tokenId &&
      newPrize.position
    ) {
      setCurrentPrizes([
        ...currentPrizes,
        {
          tokenType: "ERC721",
          tokenAddress: newPrize.tokenAddress,
          tokenId: newPrize.tokenId,
          position: newPrize.position,
        },
      ]);
    }
    setNewPrize({ tokenAddress: "", tokenType: "" });
    setSelectedToken(null);
  };

  const submitPrizes = async () => {
    setIsSubmitting(true);
    try {
      let prizesToAdd: Prize[] = [];

      prizesToAdd = currentPrizes.map((prize, index) => ({
        id: Number(prizeCount) + index + 1,
        tournament_id: tournamentId,
        token_address: prize.tokenAddress,
        token_type:
          prize.tokenType === "ERC20"
            ? new CairoCustomEnum({
                erc20: {
                  amount: addAddressPadding(
                    bigintToHex(prize.amount! * 10 ** 18)
                  ),
                },
                erc721: undefined,
              })
            : new CairoCustomEnum({
                erc20: undefined,
                erc721: {
                  id: addAddressPadding(bigintToHex(prize.tokenId!)),
                },
              }),
        payout_position: prize.position ?? 0n,
        claimed: false,
      }));

      await approveAndAddPrizes(
        tournamentId,
        tournamentName,
        prizesToAdd,
        true
      );

      setCurrentPrizes([]);
      setSelectedToken(null);
      setOnConfirmation(false);
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to add prizes:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const aggregatedPrizes = currentPrizes.reduce((acc, prize) => {
    const key = `${prize.position}-${prize.tokenAddress}-${prize.tokenType}`;

    if (!acc[key]) {
      acc[key] = {
        ...prize,
        amount: prize.tokenType === "ERC20" ? prize.amount : undefined,
        tokenIds: prize.tokenType === "ERC721" ? [prize.tokenId] : [],
        count: 1,
      };
    } else {
      if (prize.tokenType === "ERC20") {
        acc[key].amount = (acc[key].amount || 0) + (prize.amount || 0);
      } else if (prize.tokenType === "ERC721") {
        acc[key].tokenIds = [...(acc[key].tokenIds || []), prize.tokenId];
      }
      acc[key].count += 1;
    }

    return acc;
  }, {} as Record<string, any>);

  // Convert to array for rendering
  const aggregatedPrizesArray = Object.values(aggregatedPrizes);

  // Calculate total value in USD for ERC20 tokens
  const totalValue = aggregatedPrizesArray.reduce((sum, prize: any) => {
    if (prize.tokenType === "ERC20" && prize.amount) {
      return sum + prize.amount;
    }
    return sum;
  }, 0);

  // Count total NFTs
  const totalNFTs = aggregatedPrizesArray.reduce((sum, prize: any) => {
    if (prize.tokenType === "ERC721" && prize.tokenIds) {
      return sum + prize.tokenIds.length;
    }
    return sum;
  }, 0);

  const checkAllBalances = useCallback(async () => {
    if (!address) return;

    setIsLoadingBalances(true);

    try {
      // Get unique token addresses
      const uniqueTokens = Array.from(
        new Set(currentPrizes.map((prize) => prize.tokenAddress))
      );

      // Fetch balances for each token
      const balances: Record<string, bigint> = {};

      for (const tokenAddress of uniqueTokens) {
        const balance = await getBalanceGeneral(tokenAddress);
        balances[tokenAddress] = balance;
      }

      setTokenBalances(balances);

      // Check if any token has insufficient balance
      let insufficient = false;

      for (const prize of aggregatedPrizesArray) {
        if (prize.tokenType === "ERC20") {
          // For ERC20, check if balance >= amount
          const tokenBalance = BigInt(balances[prize.tokenAddress] || "0");
          const requiredAmount = BigInt(Math.floor(prize.amount * 10 ** 18)); // Convert to wei

          if (tokenBalance < requiredAmount) {
            insufficient = true;
            break;
          }
        } else if (prize.tokenType === "ERC721") {
          // For ERC721, we would need to check ownership of each token ID
          // This would require additional API calls to check NFT ownership
          // For simplicity, we'll assume the check is done elsewhere or skip it
          break;
        }
      }

      setHasInsufficientBalance(insufficient);
    } catch (error) {
      console.error("Error checking balances:", error);
      setHasInsufficientBalance(true);
    } finally {
      setIsLoadingBalances(false);
    }
  }, [address, currentPrizes, aggregatedPrizesArray]);

  useEffect(() => {
    if (onConfirmation && address) {
      checkAllBalances();
    }
  }, [onConfirmation, address]);

  if (onConfirmation) {
    return (
      <Dialog open={open} onOpenChange={handleDialogClose}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Confirm Prizes</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-4 overflow-y-auto">
            <div className="bg-muted/50 p-4 rounded-lg">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Prize Summary</h3>
                <div className="flex flex-col items-end">
                  {totalValue > 0 && (
                    <span className="font-bold text-lg">
                      Total: ${totalValue.toFixed(2)}
                    </span>
                  )}
                  {totalNFTs > 0 && (
                    <span className="text-sm text-muted-foreground">
                      {totalNFTs} NFT{totalNFTs !== 1 ? "s" : ""}
                    </span>
                  )}
                </div>
              </div>
              {/* Balance status */}
              {isLoadingBalances ? (
                <div className="mt-2 text-sm">Checking balances...</div>
              ) : hasInsufficientBalance ? (
                <div className="mt-2 font-medium flex flex-row items-center gap-2">
                  <span className="w-6">
                    <ALERT />
                  </span>
                  <span>Insufficient balance for some tokens</span>
                </div>
              ) : (
                <div className="mt-2 font-medium flex flex-row items-center gap-2">
                  <span className="w-6">
                    <CHECK />
                  </span>
                  <span>Sufficient balance for all tokens</span>
                </div>
              )}
            </div>

            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
              {aggregatedPrizesArray.map((prize: any, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 border rounded-md"
                >
                  <div className="flex items-center gap-2">
                    <img
                      src={getTokenLogoUrl(prize.tokenAddress)}
                      className="w-6 h-6"
                      alt="Token logo"
                    />
                    <span className="font-medium">{selectedToken?.symbol}</span>
                    <span>
                      {`${prize.position}${getOrdinalSuffix(prize.position)}`}
                    </span>
                    {prize.count > 1 && (
                      <span className="text-sm text-muted-foreground">
                        ({prize.count} prizes)
                      </span>
                    )}
                  </div>
                  <div>
                    {prize.tokenType === "ERC20" ? (
                      <span className="font-semibold">${prize.amount}</span>
                    ) : (
                      <div className="flex flex-col items-end">
                        {prize.tokenIds.map((id: number, idx: number) => (
                          <span key={idx} className="font-semibold">
                            #{id}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter>
            <div className="flex justify-between w-full">
              <Button
                variant="outline"
                onClick={() => setOnConfirmation(false)}
              >
                Back to Edit
              </Button>
              <Button
                onClick={submitPrizes}
                disabled={isSubmitting || hasInsufficientBalance}
              >
                {isSubmitting ? "Processing..." : "Confirm & Submit"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleDialogClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Add Prizes to Tournament</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-6 py-4 overflow-y-auto pr-2">
          {/* Token Selection */}
          <div className="flex items-center gap-4">
            <TokenDialog
              selectedToken={selectedToken}
              onSelect={(token) => {
                setSelectedToken(token);
                setNewPrize((prev) => ({
                  ...prev,
                  tokenAddress: token.address,
                  tokenType:
                    token.token_type.activeVariant() === "erc20"
                      ? "ERC20"
                      : "ERC721",
                  // Reset other values when token changes
                  amount: undefined,
                  tokenId: undefined,
                  position: undefined,
                }));
              }}
            />
          </div>

          {newPrize.tokenAddress && (
            <>
              {/* Amount/Token ID Input */}
              <div className="flex items-center gap-4">
                <span className="min-w-[100px]">
                  {isERC20 ? "Amount" : "Token ID"}
                </span>
                {isERC20 ? (
                  <AmountInput
                    value={newPrize.amount || 0}
                    onChange={(value) =>
                      setNewPrize((prev) => ({
                        ...prev,
                        amount: value,
                      }))
                    }
                  />
                ) : (
                  <div className="flex items-center gap-4">
                    <Input
                      type="number"
                      placeholder="Token ID"
                      value={newPrize.tokenId || ""}
                      onChange={(e) =>
                        setNewPrize((prev) => ({
                          ...prev,
                          tokenId: Number(e.target.value),
                        }))
                      }
                      className="w-[150px]"
                    />
                    <Input
                      type="number"
                      placeholder="Position"
                      min={1}
                      max={leaderboardSize}
                      value={newPrize.position || ""}
                      onChange={(e) =>
                        setNewPrize((prev) => ({
                          ...prev,
                          position: Number(e.target.value),
                        }))
                      }
                      className="w-[100px]"
                    />
                  </div>
                )}
              </div>

              {/* Distribution Settings (for ERC20 only) */}
              {isERC20 && (
                <>
                  <div className="space-y-2">
                    <span className="min-w-[100px]">Distribution</span>
                    <div className="flex flex-row items-center gap-4">
                      <Slider
                        min={0}
                        max={5}
                        step={0.1}
                        value={[distributionWeight]}
                        onValueChange={([value]) => {
                          setDistributionWeight(value);
                          const distributions = calculateDistribution(
                            leaderboardSize,
                            value
                          );
                          setPrizeDistributions(
                            distributions.map((percentage, index) => ({
                              position: index + 1,
                              percentage,
                            }))
                          );
                        }}
                        className="w-[200px] h-10"
                      />
                      <span className="w-12 text-center">
                        {distributionWeight.toFixed(1)}
                      </span>
                      <div className="flex flex-row gap-2 items-center justify-between text-sm text-muted-foreground">
                        <span>Total: {totalDistributionPercentage}%</span>
                        {totalDistributionPercentage !== 100 && (
                          <span className="text-destructive">
                            Total must equal 100%
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="w-full overflow-hidden">
                    <div className="flex flex-row gap-4 overflow-x-auto pb-2">
                      {Array.from({
                        length: leaderboardSize,
                      }).map((_, index) => (
                        <div
                          key={index}
                          className="flex flex-col gap-2 flex-shrink-0"
                        >
                          <span>Position {index + 1}</span>
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              className="w-[60px]"
                              onChange={(e) => {
                                const value = Number(e.target.value);
                                const newDistributions = [
                                  ...prizeDistributions,
                                ];
                                newDistributions[index] = {
                                  position: index + 1,
                                  percentage: value,
                                };
                                setPrizeDistributions(newDistributions);
                              }}
                              value={
                                prizeDistributions[index]?.percentage || ""
                              }
                            />
                            <span>%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </div>

        <DialogFooter className="flex flex-row justify-between w-full overflow-hidden">
          <div className="w-1/2 overflow-hidden">
            <div className="flex flex-row gap-2 overflow-x-auto pb-2">
              {currentPrizes.map((prize, index) => (
                <div
                  key={index}
                  className="flex items-center gap-4 p-2 bg-background/50 border border-primary-dark/50 rounded flex-shrink-0 whitespace-nowrap"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-neutral-500 uppercase">
                      {prize.position}
                    </span>
                    <img
                      src={getTokenLogoUrl(prize.tokenAddress)}
                      className="w-6 h-6"
                      alt="Token logo"
                    />
                    <span className="text-sm text-neutral-500 uppercase">
                      {selectedToken?.symbol}
                    </span>
                  </div>
                  {prize.tokenType === "ERC20" ? (
                    <span>${prize.amount}</span>
                  ) : (
                    <span>#{prize.tokenId}</span>
                  )}
                  <span
                    className="w-6 h-6 text-primary-dark cursor-pointer"
                    onClick={() => {
                      const newPrizes = [...currentPrizes];
                      newPrizes.splice(index, 1);
                      setCurrentPrizes(newPrizes);
                    }}
                  >
                    <X />
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div className="w-1/2 flex justify-end items-center gap-2">
            <Button
              type="button"
              disabled={!isValidPrize() || isSubmitting}
              onClick={handleAddPrizes}
            >
              {isSubmitting ? "Adding..." : "Add Prize"}
            </Button>
            {currentPrizes.length > 0 &&
              (address ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOnConfirmation(true)}
                >
                  Review & Submit
                </Button>
              ) : (
                <Button onClick={() => connect()}>Connect Wallet</Button>
              ))}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

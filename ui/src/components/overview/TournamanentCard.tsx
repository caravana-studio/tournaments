import { Card } from "@/components/ui/card";
import { feltToString, formatTime } from "@/lib/utils";
import TokenGameIcon from "@/components/icons/TokenGameIcon";
import { SOLID_CLOCK, USER } from "@/components/Icons";
import { useNavigate } from "react-router-dom";
import { Tournament, Token, Prize } from "@/generated/models.gen";
import { useDojoStore } from "@/dojo/hooks/useDojoStore";
import { useDojo } from "@/context/dojo";
import {
  groupPrizesByTokens,
  getErc20TokenSymbols,
  calculateTotalValue,
  countTotalNFTs,
  extractEntryFeePrizes,
} from "@/lib/utils/formatting";
import { useEkuboPrices } from "@/hooks/useEkuboPrices";
import { TabType } from "@/components/overview/TournamentTabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import useUIStore from "@/hooks/useUIStore";
import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";

interface TournamentCardProps {
  tournament: Tournament;
  index: number;
  status: TabType;
  prizes: Prize[] | null;
  entryCount: number;
}

export const TournamentCard = ({
  tournament,
  index,
  status,
  prizes,
  entryCount,
}: TournamentCardProps) => {
  const { nameSpace } = useDojo();
  const navigate = useNavigate();
  const state = useDojoStore((state) => state);
  const { gameData } = useUIStore();
  const [allPricesFound, setAllPricesFound] = useState(false);

  // token entities
  const tokenModels = state.getEntitiesByModel(nameSpace, "Token");
  const tokens = tokenModels.map(
    (model) => model.models[nameSpace].Token
  ) as Token[];

  const entryFeeToken = tournament?.entry_fee.Some?.token_address;
  const entryFeeTokenSymbol = tokens.find(
    (t) => t.address === entryFeeToken
  )?.symbol;

  const { distributionPrizes } = extractEntryFeePrizes(
    tournament?.id,
    tournament?.entry_fee,
    entryCount
  );

  const allPrizes = [...distributionPrizes, ...(prizes ?? [])];

  const groupedPrizes = groupPrizesByTokens(allPrizes, tokens);

  const erc20TokenSymbols = getErc20TokenSymbols(groupedPrizes);
  const { prices, isLoading: pricesLoading } = useEkuboPrices({
    tokens: [
      ...erc20TokenSymbols,
      ...(entryFeeTokenSymbol ? [entryFeeTokenSymbol] : []),
    ],
  });

  const totalPrizesValueUSD = calculateTotalValue(
    groupedPrizes,
    prices,
    allPricesFound
  );

  useEffect(() => {
    const allPricesExist = Object.keys(groupedPrizes ?? []).every(
      (symbol) => prices[symbol] !== undefined
    );

    setAllPricesFound(allPricesExist);
  }, [prices, prizes]);

  const totalPrizeNFTs = countTotalNFTs(groupedPrizes);

  const startDate = new Date(Number(tournament.schedule.game.start) * 1000);
  const endDate = new Date(Number(tournament.schedule.game.end) * 1000);
  const duration =
    Number(tournament.schedule.game.end) -
    Number(tournament.schedule.game.start);
  const currentDate = new Date();
  const startsInSeconds = (startDate.getTime() - currentDate.getTime()) / 1000;
  const startsIn = formatTime(startsInSeconds);
  const endsInSeconds = (endDate.getTime() - currentDate.getTime()) / 1000;
  const endsIn = formatTime(endsInSeconds);
  const registrationType =
    tournament?.schedule.registration.isSome() && Number(startsInSeconds) <= 0
      ? "Closed"
      : Number(endsInSeconds) <= 0
      ? "Closed"
      : "Open";

  const gameAddress = tournament.game_config.address;
  const gameName = gameData.find(
    (game) => game.contract_address === gameAddress
  )?.name;

  const hasEntryFee = tournament?.entry_fee.isSome();

  const entryFee = tournament?.entry_fee.isSome()
    ? (
        Number(BigInt(tournament?.entry_fee.Some?.amount!) / 10n ** 18n) *
        Number(prices[entryFeeTokenSymbol ?? ""])
      ).toFixed(2)
    : "Free";

  const renderDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return (
        <div className="flex flex-row items-center gap-0.5">
          <span>{days}</span>
          <span>D</span>
        </div>
      );
    } else if (hours > 0) {
      return (
        <div className="flex flex-row items-center gap-0.5">
          <span>{hours}</span>
          <span>H</span>
        </div>
      );
    } else if (minutes > 0) {
      return (
        <div className="flex flex-row items-center gap-0.5">
          <span>{minutes}</span>
          <span>min{minutes > 1 ? "s" : ""}</span>
        </div>
      );
    } else {
      return (
        <div className="flex flex-row items-center gap-0.5">
          <span>{seconds}</span>
          <span>sec{seconds > 1 ? "s" : ""}</span>
        </div>
      );
    }
  };

  const isRestricted = tournament?.entry_requirement.isSome();
  const hasEntryLimit =
    tournament?.entry_requirement?.Some?.entry_limit.isSome();
  const entryLimit = tournament?.entry_requirement?.Some?.entry_limit?.Some;
  const requirementVariant =
    tournament?.entry_requirement.Some?.entry_requirement_type?.activeVariant();
  const tournamentRequirementVariant =
    tournament?.entry_requirement.Some?.entry_requirement_type?.variant?.tournament?.activeVariant();

  const renderTimeClass = (time: number) => {
    if (time > 3600) {
      return "text-success";
    } else {
      return "text-warning";
    }
  };

  return (
    <Card
      variant="outline"
      interactive={true}
      onClick={() => {
        navigate(`/tournament/${Number(tournament.id).toString()}`);
      }}
      className="h-32 sm:h-48 animate-in fade-in zoom-in duration-300 ease-out"
    >
      <div className="flex flex-col justify-between h-full">
        <div className="flex flex-col gap-2">
          <div className="flex flex-row justify-betweentext-lg 2xl:text-xl h-6">
            <p className="truncate w-2/3 font-brand">
              {feltToString(tournament?.metadata?.name!)}
            </p>
            <div className="flex flex-row gap-2 w-1/3 justify-end">
              <div className="flex flex-row items-center">
                <span className="w-6">
                  <SOLID_CLOCK />
                </span>
                <span className="text-sm tracking-tight">
                  {renderDuration(duration)}
                </span>
              </div>
              <div className="flex flex-row items-center">
                <span className="w-7">
                  <USER />
                </span>
                <span>{entryCount}</span>
              </div>
            </div>
          </div>
          <div className="hidden sm:block w-full h-0.5 bg-brand/25" />
        </div>
        <div className="flex flex-row items-center">
          <div className="flex flex-row sm:flex-wrap items-center gap-2 w-3/4">
            {/* Registration Type */}
            <Tooltip delayDuration={50}>
              <TooltipTrigger asChild>
                <div>
                  <Badge variant="outline" className="text-xs p-1 rounded-md">
                    {registrationType}
                  </Badge>
                </div>
              </TooltipTrigger>
              <TooltipContent side="top" align="center">
                <p>{registrationType} Registration</p>
              </TooltipContent>
            </Tooltip>

            {/* Prize Spots */}
            <Tooltip delayDuration={50}>
              <TooltipTrigger asChild>
                <div>
                  <Badge variant="outline" className="text-xs p-1 rounded-md">
                    {Number(tournament.game_config.prize_spots)} Winners
                  </Badge>
                </div>
              </TooltipTrigger>
              <TooltipContent side="top" align="center">
                <p>{Number(tournament.game_config.prize_spots)} Winners</p>
              </TooltipContent>
            </Tooltip>

            {/* Restricte Access */}
            {isRestricted && (
              <Tooltip delayDuration={50}>
                <TooltipTrigger asChild>
                  <div>
                    <Badge variant="outline" className="text-xs p-1 rounded-md">
                      Restricted
                    </Badge>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top" align="center">
                  <p>
                    {requirementVariant === "allowlist"
                      ? "Allowlist"
                      : requirementVariant === "token"
                      ? "Token"
                      : requirementVariant === "tournament"
                      ? `Tournament ${tournamentRequirementVariant}`
                      : "Unknown"}
                  </p>
                </TooltipContent>
              </Tooltip>
            )}

            {/* Limited Entry */}
            {hasEntryLimit && (
              <Tooltip delayDuration={50}>
                <TooltipTrigger asChild>
                  <div>
                    <Badge variant="outline" className="text-xs p-1 rounded-md">
                      {`${Number(entryLimit)} entry${
                        Number(entryLimit) === 1 ? "" : "s"
                      }`}
                    </Badge>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top" align="center">
                  <p>
                    {Number(entryLimit)} entry
                    {Number(entryLimit) === 1 ? "" : "s"} per qualification
                  </p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>

          <div className="flex flex-row w-1/4 justify-end sm:px-2">
            <Tooltip delayDuration={50}>
              <TooltipTrigger asChild>
                <div className="flex items-center justify-center">
                  <TokenGameIcon key={index} game={gameAddress} size={"md"} />
                </div>
              </TooltipTrigger>
              <TooltipContent side="top" align="center" sideOffset={-10}>
                {gameName ? feltToString(gameName) : "Unknown"}
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
        <div className="flex flex-row items-center justify-center gap-5 w-full mx-auto">
          {/* Time Status */}
          {status === "upcoming" ? (
            <div className="flex flex-row items-center gap-2">
              <span className="text-brand-muted">Starts In:</span>
              <span className={renderTimeClass(startsInSeconds)}>
                {startsIn}
              </span>
            </div>
          ) : status === "live" ? (
            <div className="flex flex-row items-center gap-2">
              <span className="text-brand-muted">Ends In:</span>
              <span className={renderTimeClass(endsInSeconds)}>{endsIn}</span>
            </div>
          ) : (
            <></>
          )}
          <div className="flex flex-row items-center gap-2">
            <span className="text-brand-muted">Fee:</span>
            {pricesLoading ? (
              <Skeleton className="h-6 w-16 bg-brand/20" />
            ) : (
              <span>{hasEntryFee ? `$${entryFee}` : "FREE"}</span>
            )}
          </div>
          <div className="flex flex-row items-center gap-2">
            <span className="text-brand-muted">Pot:</span>
            {pricesLoading ? (
              <Skeleton className="h-6 w-16 bg-brand/20" />
            ) : totalPrizesValueUSD > 0 || totalPrizeNFTs > 0 ? (
              <div className="flex flex-row items-center gap-2">
                {totalPrizesValueUSD > 0 && (
                  <span>${totalPrizesValueUSD.toFixed(2)}</span>
                )}
                {totalPrizeNFTs > 0 && (
                  <span>
                    {totalPrizeNFTs} NFT{totalPrizeNFTs === 1 ? "" : "s"}
                  </span>
                )}
              </div>
            ) : (
              <span>No Prizes</span>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};

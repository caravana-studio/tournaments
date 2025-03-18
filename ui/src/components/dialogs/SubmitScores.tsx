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
import { Leaderboard, Tournament } from "@/generated/models.gen";
import { feltToString, getOrdinalSuffix, indexAddress } from "@/lib/utils";
import { useConnectToSelectedChain } from "@/dojo/hooks/useChain";
import { useGetTournamentLeaderboard } from "@/dojo/hooks/useSqlQueries";
import { getSubmittableScores } from "@/lib/utils/formatting";

interface SubmitScoresDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tournamentModel: Tournament;
  nameSpace: string;
  gameNamespace: string;
  gameScoreModel: string;
  gameScoreAttribute: string;
  gameAddress: string;
  leaderboard: Leaderboard;
}

export function SubmitScoresDialog({
  open,
  onOpenChange,
  tournamentModel,
  nameSpace,
  gameNamespace,
  gameScoreModel,
  gameScoreAttribute,
  gameAddress,
  leaderboard,
}: SubmitScoresDialogProps) {
  const { address } = useAccount();
  const { connect } = useConnectToSelectedChain();
  const { submitScores } = useSystemCalls();

  const leaderboardSize = Number(tournamentModel?.game_config.prize_spots);

  const { data: currentLeaderboard, loading } = useGetTournamentLeaderboard({
    namespace: nameSpace,
    tournamentId: tournamentModel?.id,
    gameNamespace: gameNamespace,
    gameScoreModel: gameScoreModel,
    gameScoreAttribute: gameScoreAttribute,
    gameAddress: indexAddress(gameAddress?.toString() ?? "0x0"),
    limit: leaderboardSize,
    offset: 0,
  });

  const submittableScores = getSubmittableScores(
    currentLeaderboard,
    leaderboard
  );

  const handleSubmitScores = () => {
    submitScores(
      tournamentModel?.id,
      feltToString(tournamentModel?.metadata.name),
      submittableScores
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Submit Scores</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          <span className="text-center">
            Submitting {submittableScores.length} scores
          </span>
          <div className="space-y-2 px-5 py-2 max-h-[300px] overflow-y-auto">
            {!loading ? (
              currentLeaderboard?.map((score, index) => (
                <div className="flex flex-row items-center gap-5" key={index}>
                  <span className="font-brand w-10">
                    {index + 1}
                    {getOrdinalSuffix(index + 1)}
                  </span>
                  <span>{feltToString(score.player_name)}</span>
                  <p
                    className="flex-1 h-[2px] bg-repeat-x"
                    style={{
                      backgroundImage:
                        "radial-gradient(circle, currentColor 1px, transparent 1px)",
                      backgroundSize: "8px 8px",
                      backgroundPosition: "0 center",
                    }}
                  ></p>
                  <span className="font-brand">{score.score}</span>
                </div>
              ))
            ) : (
              <div className="flex flex-row items-center gap-5">
                <span>Loading Scores...</span>
              </div>
            )}
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          {address ? (
            <DialogClose asChild>
              <Button disabled={!address} onClick={handleSubmitScores}>
                Submit
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

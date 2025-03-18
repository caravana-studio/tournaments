import { getGames } from "@/assets/games";
import { Button } from "@/components/ui/button";
import useUIStore from "@/hooks/useUIStore";
import TokenGameIcon from "@/components/icons/TokenGameIcon";

const GameFilters = () => {
  const { gameFilters, setGameFilters, gameData } = useUIStore();
  return (
    <div className="hidden sm:flex flex-col gap-4 w-1/5">
      {Object.entries(getGames()).map(([key, game]) => {
        const isDisabled = !gameData.find(
          (game) => game.contract_address === key
        );
        return (
          <div key={key} className="relative w-full max-w-80">
            <Button
              size={"xl"}
              variant="outline"
              className={`text-lg px-2 xl:px-4 xl:text-xl 2xl:text-2xl font-brand w-full ${
                gameFilters.includes(key) ? "bg-brand/25" : ""
              }`}
              onClick={() => {
                if (gameFilters.includes(key)) {
                  // Remove the key if it exists
                  setGameFilters(
                    gameFilters.filter((filter) => filter !== key)
                  );
                } else {
                  // Add the key if it doesn't exist
                  setGameFilters([...gameFilters, key]);
                }
              }}
              disabled={isDisabled}
            >
              <TokenGameIcon game={key} />
              <span className="truncate">{game.name}</span>
            </Button>
            {isDisabled && (
              <div className="absolute top-1 right-2 flex items-center justify-center rounded-md">
                <span className="text-sm font-brand uppercase">
                  Coming Soon
                </span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default GameFilters;

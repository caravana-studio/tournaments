import React from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormDescription,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { StepProps } from "@/containers/CreateTournament";
import TokenGameIcon from "@/components/icons/TokenGameIcon";
import { getGames } from "@/assets/games";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { INFO } from "@/components/Icons";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import SettingsSection from "@/components/createTournament/settings/SettingsSection";
import useUIStore from "@/hooks/useUIStore";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const Details = ({ form }: StepProps) => {
  const { gameData } = useUIStore();
  const PREDEFINED_SIZES = [1, 3, 10, 20] as const;

  React.useEffect(() => {
    const subscription = form.watch((_value, { name }) => {
      if (name === "game") {
        form.setValue("settings", "0");
      }
    });

    return () => subscription.unsubscribe();
  }, [form]);

  const games = getGames();

  return (
    <div className="flex flex-col p-4 gap-5">
      <div className="flex flex-col">
        <span className="font-astronaut text-3xl font-bold">Details</span>
        <div className="w-full h-0.5 bg-retro-green/25" />
      </div>
      <div className="flex flex-row gap-5 px-4">
        <div className="flex flex-col gap-5 w-3/5">
          <FormField
            control={form.control}
            name="game"
            render={({ field }) => (
              <FormItem>
                <div className="flex flex-row items-center gap-5">
                  <FormLabel className="font-astronaut text-2xl">
                    Game
                  </FormLabel>
                  <FormDescription>
                    Choose the game to be played
                  </FormDescription>
                </div>
                <FormControl>
                  <div className="flex flex-row gap-5 overflow-x-auto">
                    {Object.entries(games).map(([key, game]) => (
                      <Card
                        key={key}
                        variant={field.value === key ? "default" : "outline"}
                        className={`flex flex-col justify-between h-[100px] w-[100px] flex-shrink-0 p-2 hover:cursor-pointer ${
                          field.value === key && "bg-retro-green-dark"
                        }`}
                        onClick={() => field.onChange(key)}
                        // disabled={
                        //   !gameData.find(
                        //     (game) => game.contract_address === key
                        //   )
                        // }
                      >
                        <TokenGameIcon size="md" game={key} />
                        <Tooltip delayDuration={50}>
                          <TooltipTrigger asChild>
                            <p className="font-astronaut text-center truncate w-full">
                              {game.name}
                            </p>
                          </TooltipTrigger>
                          <TooltipContent className="border-retro-green bg-black text-neutral-500">
                            {game.name}
                          </TooltipContent>
                        </Tooltip>
                      </Card>
                    ))}
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="w-full h-0.5 bg-retro-green/25" />
          <FormField
            control={form.control}
            name="settings"
            render={({ field }) => (
              <SettingsSection form={form} field={field} />
            )}
          />
        </div>
        <div className="flex flex-col gap-5 w-2/5">
          <FormField
            control={form.control}
            name="name"
            render={({ field: { value, onChange, ...fieldProps } }) => (
              <FormItem>
                <FormLabel className="font-astronaut text-2xl">Name</FormLabel>
                <FormControl>
                  <Input
                    className="h-10"
                    placeholder="Tournament name"
                    {...fieldProps}
                    value={typeof value === "string" ? value : ""}
                    onChange={(e) => onChange(e.target.value)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="font-astronaut text-2xl">
                  Description
                </FormLabel>
                <FormControl>
                  <Textarea
                    className="min-h-[50px]"
                    placeholder="Tournament description"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="w-full h-0.5 bg-retro-green/25" />
          <FormField
            control={form.control}
            name="leaderboardSize"
            render={({ field }) => (
              <FormItem>
                <div className="flex flex-row items-center gap-5 relative overflow-visible">
                  <FormLabel className="font-astronaut text-2xl">
                    Leaderboard Size
                  </FormLabel>
                  <FormDescription>Size of the leaderboard</FormDescription>
                  <HoverCard>
                    <HoverCardTrigger asChild>
                      <span className="absolute -top-4 right-0 w-6 h-6 cursor-pointer">
                        <INFO />
                      </span>
                    </HoverCardTrigger>
                    <HoverCardContent className="w-80 p-4 text-sm z-50">
                      <div className="space-y-2">
                        <h4 className="font-medium">Leaderboard Size</h4>
                        <p className="text-muted-foreground">
                          Determines how many top players will be displayed on
                          the tournament leaderboard.
                        </p>
                        <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                          <li>Top 1: Only the winner is shown</li>
                          <li>
                            Top 3: Shows gold, silver, and bronze positions
                          </li>
                          <li>
                            Top 10/20: Extended rankings for larger tournaments
                          </li>
                          <li>Custom: Set any size between 1-100 players</li>
                        </ul>
                      </div>
                    </HoverCardContent>
                  </HoverCard>
                </div>
                <FormControl>
                  <div className="space-y-4">
                    <div className="flex flex-row items-center justify-between w-full">
                      <div className="flex flex-row items-center gap-2">
                        {PREDEFINED_SIZES.map((size) => (
                          <Button
                            key={size}
                            variant={
                              field.value === size ? "default" : "outline"
                            }
                            className={cn(
                              field.value === size && "bg-retro-green-dark"
                            )}
                            type="button"
                            onClick={() => field.onChange(size)}
                          >
                            Top {size}
                          </Button>
                        ))}
                      </div>
                      <span className="text-2xl">{field.value}</span>
                    </div>

                    <div className="space-y-2">
                      <Slider
                        min={1}
                        max={100}
                        step={1}
                        value={[field.value]}
                        onValueChange={(value) => field.onChange(value[0])}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>1</span>
                        <span>100</span>
                      </div>
                    </div>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>
    </div>
  );
};

export default Details;

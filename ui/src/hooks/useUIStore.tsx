import { create } from "zustand";
import { GameMetadata } from "@/generated/models.gen";
import { TabType } from "@/components/overview/TournamentTabs";

type State = {
  gameFilters: string[];
  setGameFilters: (value: string[]) => void;
  gameData: GameMetadata[];
  setGameData: (value: GameMetadata[]) => void;
  selectedTab: TabType;
  setSelectedTab: (value: TabType) => void;
};

const useUIStore = create<State>((set) => ({
  gameFilters: [],
  setGameFilters: (value: string[]) => set({ gameFilters: value }),
  gameData: [],
  setGameData: (value: GameMetadata[]) => set({ gameData: value }),
  selectedTab: "upcoming",
  setSelectedTab: (value: TabType) => set({ selectedTab: value }),
}));

export default useUIStore;

import type { FunctionComponent, ImgHTMLAttributes } from "react";
import lootSurvivor from "./loot-survivor.png";
import darkShuffle from "./dark-shuffle.svg";
import zkube from "./zkube.png";
import dopeWars from "./dope-wars.png";
import jokersOfNeon from "./jokers-of-neon.png";
import { ChainId } from "@/dojo/config";
import { useDojo } from "@/context/dojo";

export interface Game {
  name: string;
  Icon: FunctionComponent<ImgHTMLAttributes<HTMLImageElement>>;
}

export const getGames = (): Record<string, Game> => {
  const { selectedChainConfig } = useDojo();
  const isSepolia = selectedChainConfig.chainId === ChainId.SN_SEPOLIA;
  const isLocalKatana = selectedChainConfig.chainId === ChainId.KATANA_LOCAL;
  const isMainnet = selectedChainConfig.chainId === ChainId.SN_MAIN;
  if (isLocalKatana) {
    return {
      "0x00ae98ffbbba09d92e6b6456e3d40b746176599ceac91b2855cee42b290c59eb": { // TODO: change to the correct game system address 
          name: "Jokers of Neon",
          Icon: function JokersOfNeonIcon(
            props: ImgHTMLAttributes<HTMLImageElement>
          ) {
            return <img src={jokersOfNeon} {...props} />;
          },
        },
      };
  } else if (isSepolia) {
    return {
      "0x0711a2ed50ba5442259950cf741b81f66f17b9b751e44d0368a87926a3233e3e": {
        name: "Dark Shuffle",
        Icon: function DarkShuffleIcon(
          props: ImgHTMLAttributes<HTMLImageElement>
        ) {
          return <img src={darkShuffle} {...props} />;
        },
      },
    };
  } else if (isMainnet) {
    return {
      "0x02ffe2edea10d1622b9cc65ce18b441755f322253e24e6cd862518ab037009f5": {
        name: "Dark Shuffle",
        Icon: function DarkShuffleIcon(
          props: ImgHTMLAttributes<HTMLImageElement>
        ) {
          return <img src={darkShuffle} {...props} />;
        },
      },
      "0x072e1affe9a2d0a1852238073bc2f81e059ad7ab500e788046ac2f0b89b0c94a": {
        name: "Loot Survivor",
        Icon: function LootSurvivorIcon(
          props: ImgHTMLAttributes<HTMLImageElement>
        ) {
          return <img src={lootSurvivor} {...props} />;
        },
      },
      "0x075bd3616302ebec162c920492e4d042155fd0d199f1ed44edcb2eec120feb3d": {
        name: "Jokers of Neon",
        Icon: function JokersOfNeonIcon(
          props: ImgHTMLAttributes<HTMLImageElement>
        ) {
          return <img src={jokersOfNeon} {...props} />;
        },
      },
    };
  } else {
    return {
      "0x072e1affe9a2d0a1852238073bc2f81e059ad7ab500e788046ac2f0b89b0c94a": {
        name: "Loot Survivor",
        Icon: function LootSurvivorIcon(
          props: ImgHTMLAttributes<HTMLImageElement>
        ) {
          return <img src={lootSurvivor} {...props} />;
        },
      },
      "0x075bd3616602ebec162c920492e4d032155fd0d199f1ed44edcb2eec120feb3d": {
        name: "Dark Shuffle",
        Icon: function DarkShuffleIcon(
          props: ImgHTMLAttributes<HTMLImageElement>
        ) {
          return <img src={darkShuffle} {...props} />;
        },
      },
      "0x075bd3616602ebec142c920492e4d042155fd0d199f1ed44edcb2eec120feb3d": {
        name: "zKube",
        Icon: function ZkubeIcon(props: ImgHTMLAttributes<HTMLImageElement>) {
          return <img src={zkube} {...props} />;
        },
      },
      "0x075bd3616652ebec162c920492e4d042155fd0d199f1ed44edcb2eec120feb3d": {
        name: "Dope Wars",
        Icon: function DopeWarsIcon(
          props: ImgHTMLAttributes<HTMLImageElement>
        ) {
          return <img src={dopeWars} {...props} />;
        },
      },
      "0x075bd3616302ebec162c920492e4d042155fd0d199f1ed44edcb2eec120feb3d": {
        name: "Jokers of Neon",
        Icon: function JokersOfNeonIcon(
          props: ImgHTMLAttributes<HTMLImageElement>
        ) {
          return <img src={jokersOfNeon} {...props} />;
        },
      },
    };
  }
};

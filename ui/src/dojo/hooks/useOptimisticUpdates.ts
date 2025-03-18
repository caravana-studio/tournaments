import { BigNumberish } from "starknet";
import { getEntityIdFromKeys } from "@dojoengine/utils";
import { useDojoStore } from "@/dojo/hooks/useDojoStore";
import { v4 as uuidv4 } from "uuid";
import { useDojo } from "@/context/dojo";
import { Tournament, Prize, PrizeType } from "@/generated/models.gen";

const applyModelUpdate = <T extends { [key: string]: any }>(
  draft: any,
  entityId: string,
  nameSpace: string,
  modelName: string,
  data: T
) => {
  if (!draft.entities[entityId]) {
    // Case 1: Entity doesn't exist
    draft.entities[entityId] = {
      entityId,
      models: {
        [nameSpace]: {
          [modelName]: data,
        },
      },
    };
  } else if (!draft.entities[entityId]?.models?.[nameSpace]?.[modelName]) {
    // Case 2: Model doesn't exist in entity
    draft.entities[entityId].models[nameSpace] = {
      ...draft.entities[entityId].models[nameSpace],
      [modelName]: data,
    };
  } else {
    // Case 3: Model exists, update it
    draft.entities[entityId].models[nameSpace][modelName] = {
      ...draft.entities[entityId].models[nameSpace][modelName],
      ...data,
    };
  }
};

export const useOptimisticUpdates = () => {
  const state = useDojoStore((state) => state);
  const { nameSpace } = useDojo();

  const applyTournamentEntryUpdate = (
    tournamentId: BigNumberish,
    newEntryCount: BigNumberish,
    gameCount: BigNumberish
  ) => {
    const entriesEntityId = getEntityIdFromKeys([BigInt(tournamentId)]);
    const entriesGameTokenEntityId = getEntityIdFromKeys([
      BigInt(tournamentId),
      BigInt(gameCount),
    ]);

    const transactionId = uuidv4();

    state.applyOptimisticUpdate(transactionId, (draft) => {
      applyModelUpdate(draft, entriesEntityId, nameSpace, "EntryCount", {
        tournament_id: tournamentId,
        count: newEntryCount,
      });
      applyModelUpdate(
        draft,
        entriesGameTokenEntityId,
        nameSpace,
        "Registration",
        {
          tournament_id: tournamentId,
          game_token_id: 0,
          entry_number: newEntryCount,
          has_submitted: false,
        }
      );
    });

    const waitForEntityChanges = async () => {
      const entriesPromise = await state.waitForEntityChange(
        entriesEntityId,
        (entity) => {
          return (
            entity?.models?.[nameSpace]?.EntryCount?.count == newEntryCount
          );
        }
      );

      // TODO: fix the getting game count query
      // const addressPromise = await state.waitForEntityChange(
      //   entriesGameTokenEntityId,
      //   (entity) => {
      //     return (
      //       entity?.models?.[nameSpace]?.Registration?.entry_number ==
      //       newEntryAddressCount
      //     );
      //   }
      // );

      return await Promise.all([entriesPromise]);
    };

    return {
      transactionId,
      wait: () => waitForEntityChanges(),
      revert: () => state.revertOptimisticUpdate(transactionId),
      confirm: () => state.confirmTransaction(transactionId),
    };
  };

  const applyTournamentPrizesUpdate = (prizes: Prize[]) => {
    const transactionId = uuidv4();

    state.applyOptimisticUpdate(transactionId, (draft) => {
      for (const prize of prizes) {
        const entityId = getEntityIdFromKeys([BigInt(prize.id)]);
        applyModelUpdate(draft, entityId, nameSpace, "Prize", prize);
      }
    });

    const waitForPrizeEntityChange = async () => {
      const prizePromises = prizes.map((prize) => {
        const entityId = getEntityIdFromKeys([BigInt(prize.id)]);
        return state.waitForEntityChange(entityId, (entity) => {
          return (entity?.models?.[nameSpace]?.Prize as Prize)?.id == prize.id;
        });
      });

      return await Promise.all(prizePromises);
    };

    return {
      transactionId,
      wait: () => waitForPrizeEntityChange(),
      revert: () => state.revertOptimisticUpdate(transactionId),
      confirm: () => state.confirmTransaction(transactionId),
    };
  };

  const applyTournamentCreateAndAddPrizesUpdate = (
    tournament: Tournament,
    prizes: Prize[]
  ) => {
    const entityId = getEntityIdFromKeys([BigInt(tournament.id)]);
    const transactionId = uuidv4();

    state.applyOptimisticUpdate(transactionId, (draft) => {
      applyModelUpdate(draft, entityId, nameSpace, "Tournament", tournament);
      for (const prize of prizes) {
        const entityPrizeId = getEntityIdFromKeys([
          BigInt(tournament.id),
          BigInt(prize.id),
        ]);
        applyModelUpdate(draft, entityPrizeId, nameSpace, "Prize", prize);
      }
    });

    const waitForEntityChanges = async () => {
      const tournamentPromise = state.waitForEntityChange(
        entityId,
        (entity) => {
          return (
            (entity?.models?.[nameSpace]?.Tournament as Tournament)?.id ===
            tournament.id
          );
        }
      );

      const prizePromises = prizes.map((prize) => {
        const prizesEntityId = getEntityIdFromKeys([
          BigInt(tournament.id),
          BigInt(prize.id),
        ]);
        return state.waitForEntityChange(prizesEntityId, (entity) => {
          return (entity?.models?.[nameSpace]?.Prize as Prize)?.id == prize.id;
        });
      });

      return await Promise.all([tournamentPromise, ...prizePromises]);
    };

    return {
      transactionId,
      wait: () => waitForEntityChanges(),
      revert: () => state.revertOptimisticUpdate(transactionId),
      confirm: () => state.confirmTransaction(transactionId),
    };
  };

  const applyTournamentClaimPrizesUpdate = (
    tournamentId: BigNumberish,
    prizes: PrizeType[]
  ) => {
    const entityId = getEntityIdFromKeys([BigInt(tournamentId)]);
    const transactionId = uuidv4();

    state.applyOptimisticUpdate(transactionId, (draft) => {
      for (const prize of prizes) {
        applyModelUpdate(draft, entityId, nameSpace, "PrizeClaim", {
          tournament_id: tournamentId,
          prize_type: prize,
          claimed: true,
        });
      }
    });

    const waitForEntityChanges = async () => {
      return await state.waitForEntityChange(entityId, (_entity) => {
        return true;
      });
    };

    return {
      transactionId,
      wait: () => waitForEntityChanges(),
      revert: () => state.revertOptimisticUpdate(transactionId),
      confirm: () => state.confirmTransaction(transactionId),
    };
  };

  return {
    applyTournamentEntryUpdate,
    applyTournamentPrizesUpdate,
    applyTournamentClaimPrizesUpdate,
    applyTournamentCreateAndAddPrizesUpdate,
  };
};

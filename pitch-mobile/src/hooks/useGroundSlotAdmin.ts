/**
 * One interface over the manager and owner slot endpoints.
 *
 * Managers and owners get the same "manage slots" screen but reach it through
 * different, separately-authorized routes (`/manager/grounds/...` vs
 * `/owner/grounds/...`). Hooks can't be called conditionally, so both sets are
 * mounted and the inactive one is disabled by passing an empty id.
 */
import { useGround } from "@/hooks/useGrounds";
import {
  useManagerSlots,
  useUpdateManagerSlot,
} from "@/hooks/useManagerBookings";
import { useApplyManagerSlots } from "@/hooks/useManagerMutations";
import {
  useApplyOwnerSlots,
  useOwnerGround,
  useOwnerSlots,
  useUpdateOwnerSlot,
} from "@/hooks/useOwner";
import type { Ground } from "@/api/types";

export type SlotAdminRole = "manager" | "owner";

export function useGroundSlotAdmin(
  groundId: string,
  role: SlotAdminRole,
  previewDate: string,
) {
  const isOwner = role === "owner";
  const managerId = isOwner ? "" : groundId;
  const ownerId = isOwner ? groundId : "";

  const managerGround = useGround(managerId);
  const ownerGround = useOwnerGround(ownerId);

  const managerSlots = useManagerSlots(managerId, previewDate);
  const ownerSlots = useOwnerSlots(ownerId, previewDate);

  const updateManagerSlot = useUpdateManagerSlot(groundId);
  const updateOwnerSlot = useUpdateOwnerSlot(groundId);

  const applyManagerSlots = useApplyManagerSlots(groundId);
  const applyOwnerSlots = useApplyOwnerSlots(groundId);

  const groundQuery = isOwner ? ownerGround : managerGround;

  return {
    ground: groundQuery.data as Ground | undefined,
    isGroundLoading: groundQuery.isLoading,
    slots: (isOwner ? ownerSlots.data : managerSlots.data) ?? [],
    updateSlot: isOwner ? updateOwnerSlot : updateManagerSlot,
    applySlots: isOwner ? applyOwnerSlots : applyManagerSlots,
  };
}

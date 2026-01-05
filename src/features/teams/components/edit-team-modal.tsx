"use client";

import { ResponsiveModal } from "@/components/responsive-modal";
import { EditTeamFormWrapper } from "./edit-team-form-wrapper";
import { useEditTeamModal } from "../hooks/use-edit-team-modal";

export const EditTeamModal = () => {
  const { teamId, close } = useEditTeamModal();
  const isOpen = Boolean(teamId);

  return (
    <ResponsiveModal open={isOpen} onOpenChange={(open) => !open && close()}>
      {teamId && <EditTeamFormWrapper teamId={teamId} onCancel={close} />}
    </ResponsiveModal>
  );
};


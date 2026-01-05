"use client";

import { ResponsiveModal } from "@/components/responsive-modal";
import { CreateTeamFormWrapper } from "./create-team-form-wrapper";
import { useCreateTeamModal } from "../hooks/use-create-team-modal";

export const CreateTeamModal = () => {
    const { isOpen, setIsOpen, close } = useCreateTeamModal();

    return (
        <ResponsiveModal open={isOpen} onOpenChange={setIsOpen}>
            <CreateTeamFormWrapper onCancel={close} />
        </ResponsiveModal>
    );
};


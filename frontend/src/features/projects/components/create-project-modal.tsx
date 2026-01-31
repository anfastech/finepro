"use client";

import { ResponsiveModal } from "@/components/responsive-modal";

import { CreateProjectForm } from "./create-project-form";
import { useCreateProjectModel } from "../hooks/use-create-project-modal";

export const CreateProjectModel = () => {
    const { isOpen, setIsOpen, close } = useCreateProjectModel();

    return (
        <ResponsiveModal open={isOpen} onOpenChange={setIsOpen}>
            <CreateProjectForm onCancel={close} />
        </ResponsiveModal>
    );
};
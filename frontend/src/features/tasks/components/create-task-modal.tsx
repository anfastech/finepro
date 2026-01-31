"use client";

import { ResponsiveModal } from "@/components/responsive-modal";

import { CreateTaskFormWrapper } from "./create-task-form-wrapper";

import { useCreateTaskModel } from "../hooks/use-create-task-modal";

export const CreateTaskModal = () => {
    const { isOpen, setIsOpen, close } = useCreateTaskModel();

    return (
        <ResponsiveModal open={isOpen} onOpenChange={setIsOpen}>
            <CreateTaskFormWrapper onCancel={close} />
        </ResponsiveModal>
    );
};
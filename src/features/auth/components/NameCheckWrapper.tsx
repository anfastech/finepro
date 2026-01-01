"use client";

import { useEffect, useState } from "react";
import { useCurrent } from "../api/use-current";
import { NamePromptModal } from "./NamePromptModal";

export const NameCheckWrapper = () => {
    const { data: user, isLoading } = useCurrent();
    const [showModal, setShowModal] = useState(false);

    useEffect(() => {
        // Only check after user data is loaded
        if (!isLoading && user) {
            // Check if user doesn't have a name
            if (!user.name || user.name.trim() === "") {
                setShowModal(true);
            }
        }
    }, [user, isLoading]);

    return <NamePromptModal open={showModal} onOpenChange={setShowModal} />;
};


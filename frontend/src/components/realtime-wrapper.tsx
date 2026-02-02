"use client";

import { ReactNode } from "react";
import { RealtimeProvider } from "@/contexts/realtime-context";
import { useWorkspaceId } from "@/features/workspaces/hooks/use-workspace-id";

interface RealtimeWrapperProps {
    children: ReactNode;
}

export function RealtimeWrapper({ children }: RealtimeWrapperProps) {
    const workspaceId = useWorkspaceId();
    console.log("[RealtimeWrapper] workspaceId:", workspaceId);

    return (
        <RealtimeProvider workspaceId={workspaceId}>
            {children}
        </RealtimeProvider>
    );
}

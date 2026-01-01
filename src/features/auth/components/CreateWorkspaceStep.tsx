"use client";

import { CreateWorkspaceForm } from "@/features/workspaces/components/create-workspace-form";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

interface CreateWorkspaceStepProps {
    onComplete: () => void;
}

export const CreateWorkspaceStep = ({ onComplete }: CreateWorkspaceStepProps) => {

    return (
        <Card className="w-full bg-white rounded-lg shadow-lg border-none">
            <CardHeader className="flex flex-col items-center justify-center text-center p-6 md:p-7 pb-4">
                <CardTitle className="text-xl md:text-2xl font-bold text-gray-900">
                    Create Your First Workspace
                </CardTitle>
                <CardDescription className="text-sm md:text-base text-gray-600 mt-2">
                    Get started by creating a workspace for your projects and tasks
                </CardDescription>
            </CardHeader>
            <CardContent>
                <CreateWorkspaceForm onCancel={undefined} />
            </CardContent>
        </Card>
    );
};


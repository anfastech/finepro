import { redirect } from "next/navigation";
import { getCurrent } from "@/features/auth/queries";
import { getWorkspaces } from "@/features/workspaces/queries";
import { OnboardingFlow } from "@/features/auth/components/OnboardingFlow";

const OnboardingPage = async () => {
    const user = await getCurrent();

    if (!user) {
        redirect("/signin");
    }

    // Check if user has already completed onboarding
    // If they have a name and workspace, redirect to dashboard
    const hasName = user?.name && user.name.trim() !== "";
    const workspaces = await getWorkspaces();
    const hasWorkspace = workspaces.documents.length > 0;

    if (hasName && hasWorkspace) {
        // User has completed onboarding, redirect to dashboard
        redirect("/");
    }

    return (
        <div className="w-full">
            <OnboardingFlow />
        </div>
    );
};

export default OnboardingPage;


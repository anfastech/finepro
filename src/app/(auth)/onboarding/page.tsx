import { redirect } from "next/navigation";
import { getCurrent } from "@/features/auth/queries";
import { OnboardingFlow } from "@/features/auth/components/OnboardingFlow";

const OnboardingPage = async () => {
    const user = await getCurrent();

    if (!user) {
        redirect("/signin");
    }

    return (
        <div className="w-full">
            <OnboardingFlow />
        </div>
    );
};

export default OnboardingPage;


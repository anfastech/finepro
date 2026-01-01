"use client";

import { useState, useEffect } from "react";
import { CreatePasswordStep } from "./CreatePasswordStep";
import { CompleteProfileStep } from "./CompleteProfileStep";
import { CreateWorkspaceStep } from "./CreateWorkspaceStep";
import { useCurrent } from "../api/use-current";

type OnboardingStep = "password" | "profile" | "workspace";

export const OnboardingFlow = () => {
    const { data: user } = useCurrent();

    // Determine which step to start with
    // If user already has a password, skip password step
    // If user has a name, skip profile step
    // Always show workspace step if no workspaces exist
    const needsPassword = true; // OAuth users need to set password
    const needsProfile = !user?.name || user.name.trim() === "";
    const needsWorkspace = true; // Always need at least one workspace

    const [step, setStep] = useState<OnboardingStep>("password");

    // Update step when user data loads
    useEffect(() => {
        const getInitialStep = (): OnboardingStep => {
            if (needsPassword) return "password";
            if (needsProfile) return "profile";
            return "workspace";
        };
        setStep(getInitialStep());
    }, [user, needsProfile, needsPassword]);

    const handlePasswordComplete = () => {
        if (needsProfile) {
            setStep("profile");
        } else {
            setStep("workspace");
        }
    };

    const handleProfileComplete = () => {
        setStep("workspace");
    };

    const handleWorkspaceComplete = () => {
        // Redirect will be handled by CreateWorkspaceStep
    };

    const getStepNumber = (stepName: OnboardingStep): number => {
        const steps: OnboardingStep[] = [];
        if (needsPassword) steps.push("password");
        if (needsProfile) steps.push("profile");
        if (needsWorkspace) steps.push("workspace");
        return steps.indexOf(stepName) + 1;
    };

    const getTotalSteps = (): number => {
        let count = 0;
        if (needsPassword) count++;
        if (needsProfile) count++;
        if (needsWorkspace) count++;
        return count;
    };

    const currentStepNumber = getStepNumber(step);
    const totalSteps = getTotalSteps();

    return (
        <div className="w-full max-w-[487px] mx-auto">
            {/* Progress Indicator */}
            <div className="mb-6 md:mb-8">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-xs md:text-sm font-medium text-gray-600">
                        Step {currentStepNumber} of {totalSteps}
                    </span>
                    <span className="text-xs md:text-sm text-gray-500">
                        {Math.round((currentStepNumber / totalSteps) * 100)}% Complete
                    </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${(currentStepNumber / totalSteps) * 100}%` } as React.CSSProperties}
                    />
                </div>
            </div>

            {/* Step Content */}
            {step === "password" && needsPassword && (
                <CreatePasswordStep onComplete={handlePasswordComplete} />
            )}
            {step === "profile" && needsProfile && (
                <CompleteProfileStep onComplete={handleProfileComplete} />
            )}
            {step === "workspace" && needsWorkspace && (
                <CreateWorkspaceStep onComplete={handleWorkspaceComplete} />
            )}
        </div>
    );
};


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
    // Sequence: password -> profile -> workspace
    const [step, setStep] = useState<OnboardingStep>("password");

    useEffect(() => {
        if (user) {
            const hasPassword = user.user_metadata?.has_password;
            const hasName = user.user_metadata?.full_name && user.user_metadata.full_name.trim() !== "";

            if (!hasPassword) {
                setStep("password");
            } else if (!hasName) {
                setStep("profile");
            } else {
                setStep("workspace");
            }
        }
    }, [user]);

    const handlePasswordComplete = () => {
        setStep("profile");
    };

    const handleProfileComplete = () => {
        setStep("workspace");
    };

    const handleWorkspaceComplete = () => {
        // Redirect will be handled by CreateWorkspaceStep
    };

    const currentStepNumber = step === "password" ? 1 : step === "profile" ? 2 : 3;
    const totalSteps = 3;

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
            {step === "password" && (
                <CreatePasswordStep onComplete={handlePasswordComplete} />
            )}
            {step === "profile" && (
                <CompleteProfileStep onComplete={handleProfileComplete} />
            )}
            {step === "workspace" && (
                <CreateWorkspaceStep onComplete={handleWorkspaceComplete} />
            )}
        </div>
    );
};


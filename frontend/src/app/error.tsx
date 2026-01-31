"use client";

import Link from "next/link";
import { AlertTriangle, ArrowLeftIcon } from "lucide-react";

import { Button } from "@/components/ui/button";

const ErrorPage = () => {
    return (
        <div className="h-screen flex flex-col items-center justify-center gap-y-4">
            <AlertTriangle className="size-6 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
                Something went wrong.
            </p>
            <Button variant="secondary" size="sm" asChild>
                <Link href="/">
                    <ArrowLeftIcon className="size-4 mr-2" />
                    Back to Home
                </Link>
            </Button>
        </div>
    )
}

export default ErrorPage;
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useUpdateName } from "../api/use-update-name";
import { updateNameSchema } from "../schemas";

interface CompleteProfileStepProps {
    onComplete: () => void;
}

export const CompleteProfileStep = ({ onComplete }: CompleteProfileStepProps) => {
    const { mutate: updateName, isPending } = useUpdateName();

    const form = useForm<z.infer<typeof updateNameSchema>>({
        resolver: zodResolver(updateNameSchema),
        defaultValues: {
            name: "",
        },
    });

    const onSubmit = (data: z.infer<typeof updateNameSchema>) => {
        updateName(
            { json: data },
            {
                onSuccess: () => {
                    form.reset();
                    onComplete();
                },
            }
        );
    };

    return (
        <Card className="w-full bg-white rounded-lg shadow-lg border-none">
            <CardHeader className="flex flex-col items-center justify-center text-center p-6 md:p-7 pb-4">
                <CardTitle className="text-xl md:text-2xl font-bold text-gray-900">
                    Complete Your Profile
                </CardTitle>
                <CardDescription className="text-sm md:text-base text-gray-600 mt-2">
                    Tell us your name to personalize your experience
                </CardDescription>
            </CardHeader>
            <CardContent className="p-6 md:p-7 pt-4">
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Name</FormLabel>
                                    <FormControl>
                                        <Input
                                            placeholder="Enter your name"
                                            {...field}
                                            disabled={isPending}
                                            autoFocus
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <Button
                            type="submit"
                            disabled={isPending}
                            size="lg"
                            className="w-full bg-blue-500 hover:bg-blue-600 text-white text-sm md:text-base"
                        >
                            {isPending ? "Saving..." : "Continue"}
                        </Button>
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
};


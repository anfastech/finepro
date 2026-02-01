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
import { useChangePassword } from "../api/use-change-password";
import { useUpdateName } from "../api/use-update-name";
import { changePasswordSchema, updateNameSchema } from "../schemas";

interface CompleteProfileStepProps {
    onComplete: () => void;
}

export const CompleteProfileStep = ({ onComplete }: CompleteProfileStepProps) => {
    const { mutate: changePassword, isPending } = useChangePassword();
    const { mutate: updateName, isPending: isUpdateName } = useUpdateName();

    const form = useForm<z.infer<typeof updateNameSchema>>({
        resolver: zodResolver(updateNameSchema),
        defaultValues: {
            name: "",
        },
    });

    const onSubmit = (data: z.infer<typeof updateNameSchema>) => {
        updateName(
            { 
                name: data.name || ""
            },
            {
                onSuccess: () => {
                    form.reset();
                    onComplete();
                },
            }
        );
    };

    return (
        <Card className="w-full bg-white rounded-lg shadow-lg border-none mx-auto">
            <CardHeader className="flex flex-col items-center justify-center text-center p-6 md:p-7 pb-4">
                <CardTitle className="text-xl md:text-2xl font-bold text-gray-900">
                    Complete Your Profile
                </CardTitle>
                <CardDescription className="text-center text-sm md:text-base text-gray-600 mt-2">
                    Tell us your name to personalize your experience
                </CardDescription>
            </CardHeader>
            <CardContent className="p-6 md:p-7 pt-4">
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            name="name"
                            control={form.control}
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Name</FormLabel>
                                    <FormControl>
                                        <Input
                                            {...field}
                                            type="text"
                                            placeholder="Enter your name"
                                            disabled={isPending}
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
                            {isPending ? "Saving..." : "Save Changes"}
                        </Button>
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
};
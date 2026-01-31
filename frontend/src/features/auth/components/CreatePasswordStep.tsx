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
import { useSetPassword } from "../api/use-set-password";
import { setPasswordSchema } from "../schemas";

interface CreatePasswordStepProps {
    onComplete: () => void;
}

export const CreatePasswordStep = ({ onComplete }: CreatePasswordStepProps) => {
    const { mutate: setPassword, isPending } = useSetPassword();

    const form = useForm<z.infer<typeof setPasswordSchema>>({
        resolver: zodResolver(setPasswordSchema),
        defaultValues: {
            password: "",
            confirmPassword: "",
        },
    });

    const onSubmit = (data: z.infer<typeof setPasswordSchema>) => {
        setPassword(
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
                    Create Your Password
                </CardTitle>
                <CardDescription className="text-sm md:text-base text-gray-600 mt-2">
                    Set a secure password for your account
                </CardDescription>
            </CardHeader>
            <CardContent className="p-6 md:p-7 pt-4">
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="password"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Password</FormLabel>
                                    <FormControl>
                                        <Input
                                            type="password"
                                            placeholder="Enter password (min 8 characters)"
                                            {...field}
                                            disabled={isPending}
                                            autoFocus
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="confirmPassword"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Confirm Password</FormLabel>
                                    <FormControl>
                                        <Input
                                            type="password"
                                            placeholder="Confirm password"
                                            {...field}
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
                            {isPending ? "Setting Password..." : "Continue"}
                        </Button>
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
};


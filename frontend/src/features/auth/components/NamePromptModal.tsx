"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
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
import { useUpdateName } from "../api/use-update-name";
import { updateNameSchema } from "../schemas";

interface NamePromptModalProps {
    open: boolean;
    onOpenChange?: (open: boolean) => void;
}

export const NamePromptModal = ({ open, onOpenChange }: NamePromptModalProps) => {
    const { mutate: updateName, isPending } = useUpdateName();

    const form = useForm<z.infer<typeof updateNameSchema>>({
        resolver: zodResolver(updateNameSchema),
        defaultValues: {
            name: "",
        },
    });

    const onSubmit = (data: z.infer<typeof updateNameSchema>) => {
        updateName(
            { name: data.name },
            {
                onSuccess: () => {
                    form.reset();
                    onOpenChange?.(false);
                },
            }
        );
    };

    return (
        <Dialog 
            open={open} 
            onOpenChange={(isOpen) => {
                // Prevent closing if name is required and form is being submitted
                if (!isPending) {
                    onOpenChange?.(isOpen);
                }
            }}
        >
            <DialogContent showCloseButton={false} className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Welcome! Please enter your name</DialogTitle>
                    <DialogDescription>
                        We need your name to personalize your experience.
                    </DialogDescription>
                </DialogHeader>
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
                        <DialogFooter>
                            <Button
                                type="submit"
                                disabled={isPending}
                                className="w-full"
                            >
                                {isPending ? "Saving..." : "Continue"}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
};


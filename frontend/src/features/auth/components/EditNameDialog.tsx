"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useEffect } from "react";

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

interface EditNameDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    currentName?: string;
}

export const EditNameDialog = ({ open, onOpenChange, currentName = "" }: EditNameDialogProps) => {
    const { mutate: updateName, isPending } = useUpdateName();

    const form = useForm<z.infer<typeof updateNameSchema>>({
        resolver: zodResolver(updateNameSchema),
        defaultValues: {
            name: currentName,
        },
    });

    // Update form when currentName changes
    useEffect(() => {
        form.reset({ name: currentName });
    }, [currentName, form]);

    const onSubmit = (data: z.infer<typeof updateNameSchema>) => {
        updateName(
            { name: data.name },
            {
                onSuccess: () => {
                    onOpenChange(false);
                },
            }
        );
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Edit Name</DialogTitle>
                    <DialogDescription>
                        Update your display name.
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
                                type="button"
                                variant="outline"
                                onClick={() => onOpenChange(false)}
                                disabled={isPending}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={isPending}
                            >
                                {isPending ? "Saving..." : "Save"}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
};


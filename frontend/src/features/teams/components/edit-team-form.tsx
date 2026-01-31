"use client";

import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRef } from "react";
import { ArrowLeftIcon } from "lucide-react";

import { useWorkspaceId } from "@/features/workspaces/hooks/use-workspace-id";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DottedSeparator } from "@/components/dotted-separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { updateTeamSchema } from "../schemas";
import { useUpdateTeam } from "../api/use-update-team";
import { useDeleteTeam } from "../api/use-delete-team";
import { Team } from "../types";
import useConfirm from "@/hooks/use-confirm";

interface EditTeamFormProps {
  onCancel?: () => void;
  initialValues: Team;
  memberOptions: { id: string; name: string; avatarColor?: { bg: string; text: string } }[];
}

export const EditTeamForm = ({
  onCancel,
  initialValues,
  memberOptions,
}: EditTeamFormProps) => {
  const workspaceId = useWorkspaceId();
  const { mutate, isPending } = useUpdateTeam();
  const { mutate: deleteTeam, isPending: isDeleting } = useDeleteTeam();
  const inputRef = useRef<HTMLInputElement>(null);

  const [DeleteDialog, confirmDelete] = useConfirm(
    "Delete Team",
    "This action can't be undone and will remove all associated data.",
    "destructive"
  );

  const handleDelete = async () => {
    const ok = await confirmDelete();
    if (!ok) return;

    deleteTeam(
      {
        param: { teamId: initialValues.$id },
      },
      {
        onSuccess: () => {
          onCancel?.();
        },
      }
    );
  };

  const form = useForm<z.infer<typeof updateTeamSchema>>({
    resolver: zodResolver(updateTeamSchema),
    defaultValues: {
      name: initialValues.name,
      description: initialValues.description || "",
      image: initialValues.imageUrl || "",
      color: initialValues.color || "",
    },
  });

  const onSubmit = (values: z.infer<typeof updateTeamSchema>) => {
    const finalValues = {
      ...values,
      image: values.image instanceof File ? values.image : values.image || "",
    };

    mutate(
      {
        form: finalValues,
        param: { teamId: initialValues.$id },
      },
      {
        onSuccess: () => {
          onCancel?.();
        },
      }
    );
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      form.setValue("image", file);
    }
  };

  const imageFile = form.watch("image");
  const previewUrl =
    imageFile instanceof File
      ? URL.createObjectURL(imageFile)
      : typeof imageFile === "string" && imageFile
      ? imageFile
      : initialValues.imageUrl;

  return (
    <>
      <DeleteDialog />
      <Card className="w-full h-full border-none shadow-none">
        <CardHeader className="flex flex-row items-center gap-x-4 p-7 space-y-0">
          <Button size="sm" variant="secondary" onClick={onCancel}>
            <ArrowLeftIcon className="size-4 mr-2" />
            Back
          </Button>
          <CardTitle className="text-xl font-bold">{initialValues.name}</CardTitle>
        </CardHeader>
        <div className="px-7">
          <DottedSeparator />
        </div>
        <CardContent className="p-7">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <div className="flex flex-col gap-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Team Name</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Enter team name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder="Enter team description (optional)"
                          rows={3}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="image"
                  render={({ field }) => (
                    <div className="flex flex-col gap-y-2">
                      <FormLabel>Team Icon</FormLabel>
                      <div className="flex items-center gap-4">
                        <Avatar className="size-16">
                          {previewUrl ? (
                            <AvatarImage src={previewUrl} alt="Team icon" />
                          ) : (
                            <AvatarFallback className="bg-blue-500 text-white text-lg">
                              {form.watch("name")?.charAt(0).toUpperCase() || "T"}
                            </AvatarFallback>
                          )}
                        </Avatar>
                        <div className="flex flex-col">
                          <p className="text-sm">Team Icon</p>
                          <p className="text-sm text-muted-foreground">
                            JPG, PNG, SVG or JPEG, max 1MB
                          </p>
                          <Input
                            type="file"
                            accept=".jpg, .png, .svg, .jpeg"
                            className="hidden"
                            ref={inputRef}
                            disabled={isPending}
                            onChange={handleImageChange}
                          />
                          {field.value ? (
                            <Button
                              type="button"
                              disabled={isPending}
                              variant="destructive"
                              size="sm"
                              className="w-fit mt-2"
                              onClick={() => {
                                field.onChange("");
                                if (inputRef.current) {
                                  inputRef.current.value = "";
                                }
                              }}
                            >
                              Remove Image
                            </Button>
                          ) : (
                            <Button
                              type="button"
                              disabled={isPending}
                              variant="secondary"
                              size="sm"
                              className="w-fit mt-2"
                              onClick={() => inputRef.current?.click()}
                            >
                              Upload Image
                            </Button>
                          )}
                        </div>
                      </div>
                      <FormMessage />
                    </div>
                  )}
                />
                <FormField
                  control={form.control}
                  name="color"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Team Color (optional)</FormLabel>
                      <FormControl>
                        <Input
                          type="color"
                          {...field}
                          placeholder="#000000"
                          className="h-12 w-24"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <DottedSeparator className="py-7" />
              <div className="flex items-center justify-between">
                <Button
                  type="button"
                  size="lg"
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={isPending || isDeleting}
                >
                  Delete Team
                </Button>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="lg"
                    variant="secondary"
                    onClick={onCancel}
                    disabled={isPending}
                    className={cn(!onCancel && "invisible")}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" size="lg" disabled={isPending}>
                    Save Changes
                  </Button>
                </div>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </>
  );
};


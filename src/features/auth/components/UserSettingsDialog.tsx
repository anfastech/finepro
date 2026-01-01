"use client";

import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EditNameDialog } from "./EditNameDialog";
import { ChangePasswordDialog } from "./ChangePasswordDialog";

interface UserSettingsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    currentName?: string;
}

export const UserSettingsDialog = ({ open, onOpenChange, currentName = "" }: UserSettingsDialogProps) => {
    const [activeTab, setActiveTab] = useState("profile");
    const [editNameOpen, setEditNameOpen] = useState(false);
    const [changePasswordOpen, setChangePasswordOpen] = useState(false);

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>User Settings</DialogTitle>
                        <DialogDescription>
                            Manage your profile and account security settings.
                        </DialogDescription>
                    </DialogHeader>
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="profile">Profile</TabsTrigger>
                            <TabsTrigger value="security">Security</TabsTrigger>
                        </TabsList>
                        <TabsContent value="profile" className="space-y-4 mt-4">
                            <div className="space-y-2">
                                <h3 className="text-sm font-medium">Display Name</h3>
                                <p className="text-sm text-muted-foreground">
                                    Update your display name shown across the application.
                                </p>
                                <button
                                    onClick={() => {
                                        setEditNameOpen(true);
                                        onOpenChange(false);
                                    }}
                                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                                >
                                    Edit Name
                                </button>
                            </div>
                        </TabsContent>
                        <TabsContent value="security" className="space-y-4 mt-4">
                            <div className="space-y-2">
                                <h3 className="text-sm font-medium">Password</h3>
                                <p className="text-sm text-muted-foreground">
                                    Change your account password for better security.
                                </p>
                                <button
                                    onClick={() => {
                                        setChangePasswordOpen(true);
                                        onOpenChange(false);
                                    }}
                                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                                >
                                    Change Password
                                </button>
                            </div>
                        </TabsContent>
                    </Tabs>
                </DialogContent>
            </Dialog>
            <EditNameDialog
                open={editNameOpen}
                onOpenChange={(isOpen) => {
                    setEditNameOpen(isOpen);
                    if (!isOpen) {
                        onOpenChange(true);
                    }
                }}
                currentName={currentName}
            />
            <ChangePasswordDialog
                open={changePasswordOpen}
                onOpenChange={(isOpen) => {
                    setChangePasswordOpen(isOpen);
                    if (!isOpen) {
                        onOpenChange(true);
                    }
                }}
            />
        </>
    );
};


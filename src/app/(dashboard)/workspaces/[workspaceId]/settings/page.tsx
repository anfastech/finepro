import { redirect } from "next/navigation";

import { getCurrent } from "@/features/auth/queries";

import { WorkspaceIdSettingsClient } from "./client";

const WorkspaceSettingsPage = async () => {
    const user = await getCurrent();
    if (!user) redirect("/signin");

    return <WorkspaceIdSettingsClient />;
}

export default WorkspaceSettingsPage;
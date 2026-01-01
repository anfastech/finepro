import { redirect } from "next/navigation";

import { getCurrent } from "@/features/auth/queries";
import { getWorkspaces } from "@/features/workspaces/queries";

export default async function Home() {
  const user = await getCurrent();
  if (!user) redirect("/signin");

  // Check if user needs onboarding
  const hasName = user?.name && user.name.trim() !== "";
  const workspaces = await getWorkspaces();
  const hasWorkspace = workspaces.documents.length > 0;

  // OAuth users need to complete onboarding if they don't have name or workspace
  if (!hasName || !hasWorkspace) {
    redirect("/onboarding");
  }

  if (!workspaces.documents.length) {
    redirect("/workspaces/create");
  } else {
    redirect(`/workspaces/${workspaces.documents[0].$id}`);
  } 
};

import { redirect } from "next/navigation";

import { getCurrent } from "@/features/auth/queries";
import { getWorkspaces } from "@/features/workspaces/queries";

export default async function Home() {
  const user = await getCurrent();
  if (!user) redirect("/signin");

  const workspaces = await getWorkspaces();

  // Replicate OnboardingGuard logic server-side
  const hasPassword = user?.has_password;
  const hasName = Boolean(user?.name?.trim());
  const hasWorkspaces = workspaces.documents.length > 0;

  if (!hasPassword || !hasName || !hasWorkspaces) {
    redirect("/onboarding");
  }

  // If fully onboarded, go to first workspace
  redirect(`/workspaces/${workspaces.documents[0].$id}`);
};

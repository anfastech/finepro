import { redirect } from "next/navigation";
import { getCurrent } from "@/features/auth/queries";
import { ProjectsListClient } from "./client";

const ProjectsListPage = async () => {
  const user = await getCurrent();
  if (!user) {
    redirect("/signin");
  }
  return <ProjectsListClient />;
};

export default ProjectsListPage;


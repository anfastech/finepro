import { redirect } from "next/navigation";
import { getCurrent } from "@/features/auth/queries";
import { TeamsListClient } from "./client";

const TeamsListPage = async () => {
  const user = await getCurrent();
  if (!user) {
    redirect("/signin");
  }
  return <TeamsListClient />;
};

export default TeamsListPage;


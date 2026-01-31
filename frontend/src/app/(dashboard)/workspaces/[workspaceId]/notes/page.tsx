import { redirect } from "next/navigation";
import { getCurrent } from "@/features/auth/queries";
import { NotesClient } from "./client";

const NotesPage = async () => {
  const user = await getCurrent();
  if (!user) {
    redirect("/signin");
  }
  return <NotesClient />;
};

export default NotesPage;


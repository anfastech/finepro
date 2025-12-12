import { useQuery } from "@tanstack/react-query";
import { Models } from "node-appwrite";

import { rpc } from "@/lib/rpc";
import { Workspace } from "../types";

export const useGetWorkspaces = () => {
  const query = useQuery<Models.DocumentList<Workspace>>({
    queryKey: ["workspaces"],
    queryFn: async () => {
      const response = await rpc.api.workspaces.$get();

      if (!response.ok) {
        throw new Error("Failed to fetch workspaces");
      }

      const { data } = await response.json();

      return data;
    },
  });

  return query;
};
import { useQuery } from "@tanstack/react-query";

import { rpc } from "@/lib/rpc";
import { Team } from "../types";

interface useGetTeamProps {
  teamId: string;
}

export const useGetTeam = ({ teamId }: useGetTeamProps) => {
  const query = useQuery({
    queryKey: ["team", teamId],
    queryFn: async () => {
      const response = await rpc.api.teams[":teamId"].$get({
        param: { teamId },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch team");
      }

      const { data } = await response.json();

      return data;
    },
  });

  return query;
};


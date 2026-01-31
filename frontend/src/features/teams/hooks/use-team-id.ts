import { useParams } from "next/navigation";

export const useTeamId = () => {
  const params = useParams();
  return params?.teamId as string | undefined;
};


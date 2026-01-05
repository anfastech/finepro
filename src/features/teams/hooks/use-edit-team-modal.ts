import { useQueryState } from "nuqs";

export const useEditTeamModal = () => {
    const [teamId, setTeamId] = useQueryState("edit-team", {
        clearOnDefault: true,
    });

    const open = (id: string) => setTeamId(id);
    const close = () => setTeamId(null);

    return {
        teamId,
        open,
        close,
        setTeamId,
    };
};


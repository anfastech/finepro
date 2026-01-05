import { useQueryState, parseAsBoolean } from "nuqs";

export const useCreateTeamModal = () => {
    const [isOpen, setIsOpen] = useQueryState(
        "create-team",
        parseAsBoolean.withDefault(false).withOptions({clearOnDefault: true})
    );

    const open =  () => setIsOpen(true);
    const close = () => setIsOpen(false);

    return {
        isOpen,
        open,
        close,
        setIsOpen
    }
}


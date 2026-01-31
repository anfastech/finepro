import { useState } from "react";
import type { ComponentProps } from "react";

import { Button } from "@/components/ui/button";

import { ResponsiveModal } from "@/components/responsive-modal";

import {
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const useConfirm = (
  title: string,
  message: string,
  variant: ComponentProps<typeof Button>["variant"] = "primary"
): [() => React.JSX.Element, () => Promise<unknown>] => {
  const [promise, setPromise] = useState<{
    resolve: (value: boolean) => void;
  } | null>(null);

  const confirm = () => {
    return new Promise((resolve) => {
      setPromise({ resolve });
    });
  };

  const handleClose = () => {
    setPromise(null);
  };

  const handleConfirm = () => {
    promise?.resolve(true);
    handleClose();
  };
  const handleCancel = () => {
    promise?.resolve(false);
    handleClose();
  };

  const ConfirmationDailog = () => (
    <ResponsiveModal open={promise !== null} onOpenChange={handleClose}>
      <div className="w-full h-full border-none shadow-none p-6">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{message}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="pt-4 w-full flex flex-col gap-y-2 lg:flex-row gap-x-2 items-center justify-end">
          <Button
            className="w-full lg:w-fit"
            variant="outline"
            size="sm"
            type="button"
            onClick={handleCancel}
          >
            Cancel
          </Button>
          <Button
            className="w-full lg:w-fit"
            variant={variant}
            size="sm"
            type="button"
            onClick={handleConfirm}
          >
            Confirm
          </Button>
        </DialogFooter>
      </div>
    </ResponsiveModal>
  );

  return [ ConfirmationDailog, confirm ];
};


export default useConfirm;
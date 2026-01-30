import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

type PaymentConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  amountUsdFormatted: string;
  disabled: boolean;
  confirming: boolean;
  onConfirm: () => void | Promise<void>;
  triggerText?: string;
  confirmText?: string;
  note?: string;
};

export function PaymentConfirmDialog({
  open,
  onOpenChange,
  amountUsdFormatted,
  disabled,
  confirming,
  onConfirm,
  triggerText = "Pay",
  confirmText = "Confirm & Pay",
  note,
}: PaymentConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogTrigger asChild>
        <Button type="button" size="lg" disabled={disabled}>
          {triggerText}
        </Button>
      </AlertDialogTrigger>

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirm payment</AlertDialogTitle>
          <AlertDialogDescription>
            Amount: <span className="font-medium text-foreground">{amountUsdFormatted}</span>
            {note ? (
              <>
                <br />
                {note}
              </>
            ) : null}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={confirming}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              void onConfirm();
            }}
            disabled={confirming || disabled}
          >
            {confirming ? "Processing..." : confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export interface SubmitDialogProps {
  open: boolean;
  unanswered: number;
  onCancel: () => void;
  onConfirm: () => void;
}

export function SubmitDialog({ open, unanswered, onCancel, onConfirm }: SubmitDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={(next) => !next && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Submit exam?</AlertDialogTitle>
          <AlertDialogDescription>
            {unanswered > 0
              ? `${unanswered} ${unanswered === 1 ? "question is" : "questions are"} unanswered and will be marked wrong. You can't change answers after submitting.`
              : "You can't change answers after submitting."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>Keep working</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>Submit now</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

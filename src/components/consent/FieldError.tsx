/** Inline validation message. Give it the same `id` the input references in `aria-describedby`. */
export function FieldError({ id, message }: { id?: string; message?: string | undefined }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="mt-1 text-xs text-destructive">
      {message}
    </p>
  );
}

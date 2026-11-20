import { FileUp } from "lucide-react";

import { btn, Empty } from "@/components/studio/ui";

/** Shown on the creator dashboard when the student has no upload-permission requests yet. */
export function PermissionsEmpty({ onRequest }: { onRequest: () => void }) {
  return (
    <Empty
      title="No upload requests yet"
      body="Ask a faculty member for permission before uploading content."
    >
      <button type="button" className={btn} onClick={onRequest}>
        <FileUp className="h-4 w-4" aria-hidden="true" />
        Request upload permission
      </button>
    </Empty>
  );
}

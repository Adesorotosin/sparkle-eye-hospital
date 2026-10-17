import { redirect } from "next/navigation";

/**
 * The old Kanban board used hard-coded sample patients and local-only stage
 * transitions. Keep the route working for old bookmarks, but send clinicians
 * to the live, database-backed Doctor queue instead.
 *
 * A hospital-wide pipeline should only return once it is backed by real,
 * permission-scoped workflow data.
 */
export default function WorkflowQueuePage(): never {
  redirect("/doctor");
}

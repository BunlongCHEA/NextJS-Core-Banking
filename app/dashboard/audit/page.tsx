import { PageHeader, Panel, EmptyState } from "@/components/ui";

export default function AuditPage() {
  return (
    <div>
      <PageHeader
        title="Audit trail"
        description="Read-only record of who changed what, when."
      />
      <Panel>
        <EmptyState
          title="No audit endpoint exposed yet"
          hint="AuditEventDocument / AuditService exist on the backend, but no REST controller is wired up for it. Add a read-only @GetMapping under /audit (AUDITOR + SUPER_ADMIN) to populate this page."
        />
      </Panel>
    </div>
  );
}

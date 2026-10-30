import { PermissionDenied } from '../../../components/ui';
import { useRequiredUser } from '../hooks';
import type { ApplicationDetail } from '../../../services/types';
import { InstitutionActions } from './InstitutionActions';
import { ReviewerActions } from './ReviewerActions';

/**
 * Chooses the role-specific action set. Visibility here is a UX convenience only.
 * The service layer re-checks every capability and scope on each operation.
 */
export function ActionsPanel({ detail }: { detail: ApplicationDetail }) {
  const user = useRequiredUser();
  if (user.role === 'institution_admin') return <InstitutionActions detail={detail} />;
  if (user.role === 'regulatory_reviewer') return <ReviewerActions detail={detail} />;
  return (
    <PermissionDenied message="System administrators review applications through the Overview and Audit Trail. Application actions are performed by institution administrators and regulatory reviewers." />
  );
}

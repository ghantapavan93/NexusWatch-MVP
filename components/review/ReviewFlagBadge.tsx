import { StatusBadge } from "@/components/shared/StatusBadge";
import type { ReviewFlag } from "@/types";

export function ReviewFlagBadge({ flag }: { flag: ReviewFlag }) {
  return <StatusBadge status={flag} />;
}

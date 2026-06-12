-- Drop class-change tracking fields from Member; classType remains the source of truth for current class.
ALTER TABLE "Member" DROP COLUMN IF EXISTS "previousClassType";
ALTER TABLE "Member" DROP COLUMN IF EXISTS "classChangedAt";

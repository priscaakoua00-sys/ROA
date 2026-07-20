import type { VehicleAngle } from '@/integrations/ai';

/**
 * The 8 angles offered as dedicated capture slots on the diagnosis upload
 * form, shared between the server action (field names) and the UI (labels,
 * icons). 'other' is a separate, untagged multi-file slot for anything
 * these don't cover.
 */
export const TAGGED_VEHICLE_ANGLES: Exclude<VehicleAngle, 'other'>[] = [
  'front',
  'rear',
  'left_side',
  'right_side',
  'engine',
  'dashboard',
  'underside',
  'tire',
];

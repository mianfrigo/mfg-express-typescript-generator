// The roles of the app. Add one here and the validation, the model, the
// controller and requireRole() follow.
export const ROLES = ['user', 'admin'] as const;

export type Role = (typeof ROLES)[number];

export const isRole = (value: unknown): value is Role =>
  ROLES.includes(value as Role);

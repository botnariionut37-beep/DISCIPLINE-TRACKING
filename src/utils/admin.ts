/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const ADMIN_EMAILS: readonly string[] = [
  'botnariionut37@gmail.com',
  'ibotnari589@gmail.com'
];

/**
 * Checks whether an email address belongs to one of the authorized administrators.
 */
export function isAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  const clean = email.toLowerCase().trim();
  return ADMIN_EMAILS.some(admin => admin.toLowerCase().trim() === clean);
}

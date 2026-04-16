/**
 * Formats a role string to a human-readable format
 * @param {string} role - The role string (e.g., "super_admin", "manager", "staff")
 * @returns {string} - Formatted role (e.g., "Super Admin", "Manager", "Staff")
 */
export const formatRole = (role) => {
  if (!role || typeof role !== 'string') {
    return role || '';
  }

  // Handle common role formats
  const roleMap = {
    'super_admin': 'Super Admin',
    'superadmin': 'Super Admin',
    'manager': 'Manager',
    'staff': 'Staff',
  };

  // Check if we have a direct mapping
  const lowerRole = role.toLowerCase();
  if (roleMap[lowerRole]) {
    return roleMap[lowerRole];
  }

  // Fallback: Convert snake_case or kebab-case to Title Case
  return role
    .split(/[_-]/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

/**
 * Gets the display label for a role
 * This is an alias for formatRole for consistency
 */
export const getRoleLabel = formatRole;


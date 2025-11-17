// Profile management utilities

const PROFILES_STORAGE_KEY = 'lumen-profiles';

// Pastel color palette for avatars
const AVATAR_COLORS = [
  '#FFB3BA', '#FFDFBA', '#FFFFBA', '#BAFFC9', '#BAE1FF',
  '#E0BBE4', '#FFCCCB', '#F0E68C', '#DDA0DD', '#98D8C8',
  '#F7DC6F', '#AED6F1', '#A9DFBF', '#F9E79F', '#FAD7A0'
];

/**
 * Get all profiles from localStorage
 */
function getProfiles() {
  try {
    const stored = localStorage.getItem(PROFILES_STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch (error) {
    console.warn('Failed to load profiles', error);
    return {};
  }
}

/**
 * Save profiles to localStorage
 */
function saveProfiles(profiles) {
  try {
    localStorage.setItem(PROFILES_STORAGE_KEY, JSON.stringify(profiles));
    return true;
  } catch (error) {
    console.warn('Failed to save profiles', error);
    return false;
  }
}

/**
 * Get profile for a user by userId
 */
function getUserProfile(userId) {
  const profiles = getProfiles();
  return profiles[userId] || null;
}

/**
 * Save or update user profile
 */
function saveUserProfile(userId, profileData) {
  const profiles = getProfiles();
  const existingProfile = profiles[userId] || {};
  
  profiles[userId] = {
    ...existingProfile,
    ...profileData,
    userId: userId,
    updatedAt: new Date().toISOString()
  };
  
  return saveProfiles(profiles);
}

/**
 * Get user's full name (from profile or fallback to username/email)
 */
function getUserFullName(userId) {
  const profile = getUserProfile(userId);
  if (profile && profile.fullName) {
    return profile.fullName;
  }
  
  // Fallback to account data
  const accounts = getAccounts();
  const account = accounts.find(acc => acc.id === userId);
  if (account) {
    return account.username || account.email || 'User';
  }
  
  return 'User';
}

/**
 * Get user's email (from account)
 */
function getUserEmail(userId) {
  const accounts = getAccounts();
  const account = accounts.find(acc => acc.id === userId);
  return account ? account.email : '';
}

/**
 * Get user's department (from profile)
 */
function getUserDepartment(userId) {
  const profile = getUserProfile(userId);
  return profile ? (profile.department || '') : '';
}

/**
 * Get user's role (from profile)
 */
function getUserRole(userId) {
  const profile = getUserProfile(userId);
  return profile ? (profile.role || '') : '';
}

/**
 * Get user's bio (from profile)
 */
function getUserBio(userId) {
  const profile = getUserProfile(userId);
  return profile ? (profile.bio || '') : '';
}

/**
 * Get user's profile picture URL (from profile)
 */
function getUserProfilePicture(userId) {
  const profile = getUserProfile(userId);
  return profile ? (profile.profilePicture || null) : null;
}

/**
 * Generate a consistent color for a user based on userId
 */
function getUserAvatarColor(userId) {
  if (!userId) return AVATAR_COLORS[0];
  
  // Simple hash function to get consistent color
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_COLORS.length;
  return AVATAR_COLORS[index];
}

/**
 * Get user initials for avatar
 */
function getUserInitials(userId) {
  const profile = getUserProfile(userId);
  if (profile && profile.fullName) {
    const names = profile.fullName.trim().split(/\s+/);
    if (names.length >= 2) {
      return (names[0][0] + names[names.length - 1][0]).toUpperCase();
    }
    return names[0].substring(0, 2).toUpperCase();
  }
  
  // Fallback to account data
  const accounts = getAccounts();
  const account = accounts.find(acc => acc.id === userId);
  if (account) {
    if (account.username) {
      return account.username.substring(0, 2).toUpperCase();
    }
    if (account.email) {
      return account.email.substring(0, 2).toUpperCase();
    }
  }
  
  return 'U';
}

/**
 * Get complete user data with profile information
 */
function getUserWithProfile(userId) {
  const accounts = getAccounts();
  const account = accounts.find(acc => acc.id === userId);
  const profile = getUserProfile(userId);
  
  if (!account) return null;
  
  return {
    id: account.id,
    username: account.username,
    email: account.email,
    createdAt: account.createdAt,
    // Profile data
    fullName: profile ? (profile.fullName || account.username || account.email) : (account.username || account.email),
    department: profile ? profile.department : '',
    role: profile ? profile.role : '',
    bio: profile ? profile.bio : '',
    profilePicture: profile ? profile.profilePicture : null,
    // Avatar helpers
    initials: getUserInitials(userId),
    avatarColor: getUserAvatarColor(userId)
  };
}

/**
 * Delete user's profile picture
 */
function deleteUserProfilePicture(userId) {
  const profile = getUserProfile(userId);
  if (profile && profile.profilePicture) {
    // Remove the data URL from localStorage (it's stored as base64)
    // In a real app, you'd delete from cloud storage
    return saveUserProfile(userId, { profilePicture: null });
  }
  return true;
}

/**
 * Convert file to base64 data URL
 */
function fileToDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = (e) => reject(e);
    reader.readAsDataURL(file);
  });
}


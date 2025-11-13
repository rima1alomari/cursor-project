// Shared authentication utilities using localStorage

const AUTH_STORAGE_KEY = 'lumen-accounts';
const CURRENT_USER_KEY = 'currentUser';
const GUEST_MODE_KEY = 'isGuest';

/**
 * Get all accounts from localStorage
 */
function getAccounts() {
  try {
    const stored = localStorage.getItem(AUTH_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.warn('Failed to load accounts', error);
    return [];
  }
}

/**
 * Save accounts to localStorage
 */
function saveAccounts(accounts) {
  try {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(accounts));
    return true;
  } catch (error) {
    console.warn('Failed to save accounts', error);
    return false;
  }
}

/**
 * Get current logged-in user
 */
function getCurrentUser() {
  try {
    const stored = localStorage.getItem(CURRENT_USER_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch (error) {
    console.warn('Failed to load current user', error);
    return null;
  }
}

/**
 * Set current logged-in user
 */
function setCurrentUser(user) {
  try {
    if (user) {
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
      localStorage.removeItem(GUEST_MODE_KEY);
    } else {
      localStorage.removeItem(CURRENT_USER_KEY);
    }
    return true;
  } catch (error) {
    console.warn('Failed to set current user', error);
    return false;
  }
}

/**
 * Check if user is logged in
 */
function isLoggedIn() {
  return getCurrentUser() !== null;
}

/**
 * Check if user is in guest mode
 */
function isGuestMode() {
  try {
    return localStorage.getItem(GUEST_MODE_KEY) === 'true';
  } catch (error) {
    return false;
  }
}

/**
 * Set guest mode
 */
function setGuestMode(enabled) {
  try {
    if (enabled) {
      localStorage.setItem(GUEST_MODE_KEY, 'true');
      localStorage.removeItem(CURRENT_USER_KEY);
    } else {
      localStorage.removeItem(GUEST_MODE_KEY);
    }
    return true;
  } catch (error) {
    console.warn('Failed to set guest mode', error);
    return false;
  }
}

/**
 * Logout user
 */
function logout() {
  setCurrentUser(null);
  setGuestMode(false);
}

/**
 * Register a new account
 */
function registerAccount(username, email, password) {
  const accounts = getAccounts();
  
  // Check if email or username already exists
  const emailExists = accounts.some(acc => acc.email.toLowerCase() === email.toLowerCase());
  const usernameExists = accounts.some(acc => acc.username.toLowerCase() === username.toLowerCase());
  
  if (emailExists) {
    return { success: false, error: 'An account with this email already exists.' };
  }
  
  if (usernameExists) {
    return { success: false, error: 'An account with this username already exists.' };
  }
  
  // Create new account
  const newAccount = {
    id: crypto.randomUUID ? crypto.randomUUID() : `user-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    username: username.trim(),
    email: email.trim().toLowerCase(),
    password: password, // In a real app, this would be hashed
    createdAt: new Date().toISOString()
  };
  
  accounts.push(newAccount);
  
  if (saveAccounts(accounts)) {
    // Return user data without password
    const { password: _, ...userData } = newAccount;
    return { success: true, account: userData };
  } else {
    return { success: false, error: 'Failed to save account. Please try again.' };
  }
}

/**
 * Authenticate user with email/username and password
 */
function authenticate(identifier, password) {
  const accounts = getAccounts();
  
  // Find account by email or username
  const account = accounts.find(acc => 
    acc.email.toLowerCase() === identifier.toLowerCase() ||
    acc.username.toLowerCase() === identifier.toLowerCase()
  );
  
  if (!account) {
    return { success: false, error: 'Account doesn\'t exist.' };
  }
  
  if (account.password !== password) {
    return { success: false, error: 'Invalid email/username or password.' };
  }
  
  // Return user data without password
  const { password: _, ...userData } = account;
  return { success: true, user: userData };
}


// Firebase/Firestore initialization and project management
// This script provides user-specific project storage using Firestore with explicit "lumen" database
// Using compat API for file:// protocol compatibility

// Firebase configuration
const firebaseConfig = window.firebaseConfig || {
  apiKey: "AIzaSyDPzRqV-_hGNedZoeGNtorLTGWTBMmqdkc",
  authDomain: "prj-adc-gcp-coop-test.firebaseapp.com",
  projectId: "prj-adc-gcp-coop-test",
  storageBucket: "prj-adc-gcp-coop-test.firebasestorage.app",
  messagingSenderId: "472242813268",
  appId: "1:472242813268:web:3f36f9591a726003d4f0c1",
  measurementId: "G-3YJN9DCMZY"
};

// Initialize Firebase (using compat API)
let db = null;
let auth = null;
let firebaseInitialized = false;

// Check if Firebase SDK is available
if (typeof firebase !== 'undefined') {
  try {
    // Initialize Firebase app
    const app = firebase.initializeApp(firebaseConfig);
    
    // Initialize Firestore
    // Note: Compat API doesn't directly support database names in getFirestore()
    // To use "lumen" database, you need to:
    // 1. Create it in Firebase Console, OR
    // 2. Use the default database (which can be renamed to "lumen" in console)
    db = firebase.firestore(app);
    
    // Initialize Firebase Authentication
    auth = firebase.auth(app);
    
    // Try to set database name if supported (for newer Firebase versions)
    // This is a workaround - the database name should be set in Firebase Console
    if (db && typeof db.settings === 'function') {
      // Database name is configured in Firebase Console
      console.log('Firestore initialized - using database: lumen (configured in Firebase Console)');
    }
    
    firebaseInitialized = true;
    console.log('Firebase initialized successfully');
    
    // Initialize Analytics
    if (firebaseConfig.measurementId && typeof firebase.analytics !== 'undefined') {
      try {
        firebase.analytics();
      } catch (analyticsError) {
        console.warn('Analytics initialization skipped:', analyticsError);
      }
    }
  } catch (error) {
    console.warn('Failed to initialize Firebase:', error);
  }
} else {
  console.warn('Firebase SDK not loaded');
}

/**
 * Get Firebase Auth UID for current user
 * Returns the Firebase Auth UID if authenticated, otherwise null
 */
function getFirebaseAuthUID() {
  if (!auth) return null;
  const user = auth.currentUser;
  return user ? user.uid : null;
}

/**
 * Authenticate user with Firebase Auth using email and password
 * This creates or signs in a Firebase Auth user
 */
async function authenticateWithFirebase(email, password) {
  if (!auth) {
    console.warn('Firebase Auth not initialized');
    return { success: false, error: 'Firebase Auth not available' };
  }

  try {
    // Try to sign in first
    try {
      const userCredential = await auth.signInWithEmailAndPassword(email, password);
      console.log('Firebase Auth: Signed in successfully');
      return { success: true, user: userCredential.user };
    } catch (signInError) {
      // If user doesn't exist, try to create account
      if (signInError.code === 'auth/user-not-found' || signInError.code === 'auth/invalid-credential') {
        try {
          const userCredential = await auth.createUserWithEmailAndPassword(email, password);
          console.log('Firebase Auth: Created new user');
          return { success: true, user: userCredential.user };
        } catch (createError) {
          console.error('Firebase Auth: Failed to create user:', createError);
          return { success: false, error: createError.message };
        }
      } else {
        console.error('Firebase Auth: Sign in error:', signInError);
        return { success: false, error: signInError.message };
      }
    }
  } catch (error) {
    console.error('Firebase Auth: Authentication error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Create Firebase Auth user (for new registrations)
 */
async function createFirebaseAuthUser(email, password) {
  if (!auth) {
    console.warn('Firebase Auth not initialized');
    return { success: false, error: 'Firebase Auth not available' };
  }

  try {
    const userCredential = await auth.createUserWithEmailAndPassword(email, password);
    console.log('Firebase Auth: Created new user');
    return { success: true, user: userCredential.user };
  } catch (error) {
    console.error('Firebase Auth: Failed to create user:', error);
    // If user already exists, try to sign in instead
    if (error.code === 'auth/email-already-in-use') {
      try {
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        console.log('Firebase Auth: User already exists, signed in');
        return { success: true, user: userCredential.user };
      } catch (signInError) {
        return { success: false, error: signInError.message };
      }
    }
    return { success: false, error: error.message };
  }
}

/**
 * Sign out from Firebase Auth
 */
async function signOutFirebaseAuth() {
  if (!auth) return;
  try {
    await auth.signOut();
    console.log('Firebase Auth: Signed out');
  } catch (error) {
    console.error('Firebase Auth: Sign out error:', error);
  }
}

/**
 * Check if user is authenticated with Firebase Auth
 * Returns true if authenticated, false otherwise
 */
function isFirebaseAuthAuthenticated() {
  if (!auth) return false;
  return auth.currentUser !== null;
}

/**
 * Wait for Firebase Auth to initialize and check authentication state
 * This is useful when the page loads to ensure auth state is restored
 */
function waitForFirebaseAuth() {
  return new Promise((resolve) => {
    if (!auth) {
      console.warn('Firebase Auth not initialized');
      resolve(false);
      return;
    }
    
    // Check if already authenticated
    if (auth.currentUser) {
      console.log('Firebase Auth already authenticated:', auth.currentUser.uid);
      resolve(true);
      return;
    }
    
    // Firebase Auth automatically restores auth state, but it might take a moment
    // Use onAuthStateChanged to wait for the initial state
    console.log('Waiting for Firebase Auth state to restore...');
    let resolved = false;
    
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (resolved) return; // Prevent multiple resolutions
      resolved = true;
      unsubscribe();
      
      if (user) {
        console.log('✅ Firebase Auth state restored - authenticated:', user.uid);
        resolve(true);
      } else {
        console.warn('⚠️ Firebase Auth state restored - not authenticated');
        resolve(false);
      }
    });
    
    // Timeout after 5 seconds (increased from 3)
    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        unsubscribe();
        const isAuthenticated = auth.currentUser !== null;
        if (isAuthenticated) {
          console.log('✅ Firebase Auth authenticated (timeout check):', auth.currentUser.uid);
        } else {
          console.warn('⚠️ Firebase Auth not authenticated after timeout');
        }
        resolve(isAuthenticated);
      }
    }, 5000);
  });
}

/**
 * Check if user needs to re-authenticate with Firebase Auth
 * Returns true if user is logged in with custom auth but not Firebase Auth
 */
function needsFirebaseAuthReauthentication() {
  const currentUser = getCurrentUser();
  if (!currentUser) return false;
  
  const firebaseUID = getFirebaseAuthUID();
  return !firebaseUID;
}

/**
 * Show a user-friendly message if Firebase Auth re-authentication is needed
 */
function checkAndNotifyFirebaseAuthStatus() {
  if (needsFirebaseAuthReauthentication()) {
    console.warn('⚠️ IMPORTANT: You are logged in but not authenticated with Firebase Auth.');
    console.warn('⚠️ Firestore operations will fail. Please log out and log back in.');
    console.warn('⚠️ This is a one-time requirement after the Firebase Auth integration.');
    
    // Optionally show a user-visible notification
    if (typeof window !== 'undefined' && window.alert) {
      // Don't show alert automatically, but log it for debugging
      console.info('To fix: Log out and log back in to authenticate with Firebase Auth.');
    }
    
    return false;
  }
  return true;
}

/**
 * Get user-specific localStorage key for project storage
 */
function getUserProjectStorageKey(projectId) {
  const currentUser = getCurrentUser();
  if (!currentUser || !currentUser.id) {
    return null;
  }
  return `lumen-presentation-${currentUser.id}-${projectId}`;
}

/**
 * Get user-specific localStorage key for projects index
 */
function getUserProjectsIndexKey() {
  const currentUser = getCurrentUser();
  if (!currentUser || !currentUser.id) {
    return null;
  }
  return `lumen-presentations-index-${currentUser.id}`;
}

/**
 * Get Firestore reference for user's projects collection
 * Path: users/{uid}/projects/{projectId}
 * Database: lumen (configured in Firebase Console)
 * Uses Firebase Auth UID if available, otherwise falls back to custom user ID
 */
function getUserProjectsRef(uid = null, projectId = null) {
  if (!db) return null;
  
  // Prefer Firebase Auth UID for Firestore queries (required for security rules)
  const firebaseUID = getFirebaseAuthUID();
  const effectiveUID = firebaseUID || uid;
  
  if (!effectiveUID) {
    console.warn('No user ID available for Firestore reference');
    return null;
  }
  
  if (projectId) {
    return db.collection('users').doc(effectiveUID).collection('projects').doc(projectId);
  } else {
    return db.collection('users').doc(effectiveUID).collection('projects');
  }
}

/**
 * Save project to Firestore
 * Path: users/{uid}/projects/{projectId}
 * Database: lumen
 */
async function saveProjectToFirestore(projectId, projectData) {
  const currentUser = getCurrentUser();
  if (!currentUser || !currentUser.id) {
    console.warn('Cannot save project: No user logged in');
    return { success: false, error: 'User not logged in' };
  }

  // Wait for Firebase Auth to be ready (if available)
  // This is critical - Firebase Auth state restoration is asynchronous
  if (typeof waitForFirebaseAuth === 'function') {
    const isAuthReady = await waitForFirebaseAuth();
    if (!isAuthReady) {
      const firebaseUID = getFirebaseAuthUID();
      if (!firebaseUID) {
        console.error('❌ Firebase Auth not authenticated after waiting. Cannot save to Firestore.');
        throw new Error('Firebase Auth not authenticated. Please log in again.');
      }
    }
  } else {
    // If waitForFirebaseAuth is not available, check current state
    const firebaseUID = getFirebaseAuthUID();
    if (!firebaseUID) {
      // Give it a moment - auth state might still be restoring
      await new Promise(resolve => setTimeout(resolve, 500));
      const firebaseUIDAfterWait = getFirebaseAuthUID();
      if (!firebaseUIDAfterWait) {
        throw new Error('Firebase Auth not authenticated. Please log in again.');
      }
    }
  }

  if (!firebaseInitialized || !db) {
    console.warn('Firebase not initialized, falling back to localStorage');
    // Fallback to localStorage - use user-specific key
    const PRESENTATION_STORAGE_PREFIX = 'lumen-presentation-';
    try {
      // Include userId in project data for filtering
      const dataToSave = {
        ...projectData,
        userId: currentUser.id,
        id: projectId,
        updatedAt: Date.now()
      };
      // Store with user-specific key: lumen-presentation-{userId}-{projectId}
      localStorage.setItem(`${PRESENTATION_STORAGE_PREFIX}${currentUser.id}-${projectId}`, JSON.stringify(dataToSave));
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  try {
    // Ensure projectData has required fields
    const dataToSave = {
      ...projectData,
      id: projectId,
      updatedAt: Date.now(),
      userId: currentUser.id
    };

    // Debug: Log what we're saving
    if (dataToSave.slides && Array.isArray(dataToSave.slides)) {
      console.log('Firestore save: Saving', dataToSave.slides.length, 'slides');
      if (dataToSave.slides.length > 0) {
        const firstSlide = dataToSave.slides[0];
        console.log('Firestore save: First slide has', firstSlide?.elements?.length || 0, 'elements');
        if (firstSlide?.elements && firstSlide.elements.length > 0) {
          console.log('Firestore save: First element type:', firstSlide.elements[0]?.type);
          console.log('Firestore save: First element text length:', firstSlide.elements[0]?.text?.length || 0);
        }
      }
      
      // Calculate approximate data size
      try {
        const jsonString = JSON.stringify(dataToSave);
        const sizeInBytes = new Blob([jsonString]).size;
        const sizeInMB = sizeInBytes / (1024 * 1024);
        console.log(`Firestore save: Data size: ${sizeInBytes} bytes (${sizeInMB.toFixed(2)} MB)`);
        
        // Firestore document limit is 1MB
        if (sizeInMB > 1) {
          console.warn('⚠️ WARNING: Project data exceeds 1MB limit. Firestore may reject this save.');
        }
      } catch (sizeError) {
        console.warn('Could not calculate data size:', sizeError);
      }
    } else {
      console.warn('Firestore save: projectData.slides is not a valid array:', dataToSave.slides);
    }

    // Clean data: Remove any undefined values, functions, or circular references
    // Firestore doesn't support undefined values
    const cleanData = (obj) => {
      if (obj === null || obj === undefined) return null;
      if (typeof obj === 'function') return null; // Remove functions
      if (obj instanceof Date) return obj.getTime(); // Convert dates to timestamps
      if (Array.isArray(obj)) {
        return obj.map(item => cleanData(item)).filter(item => item !== undefined);
      }
      if (typeof obj === 'object') {
        const cleaned = {};
        for (const key in obj) {
          if (obj.hasOwnProperty(key)) {
            const value = cleanData(obj[key]);
            if (value !== undefined) {
              cleaned[key] = value;
            }
          }
        }
        return cleaned;
      }
      return obj;
    };

    const cleanedData = cleanData(dataToSave);

    // Use Firebase Auth UID for Firestore queries (required for security rules)
    const firebaseUID = getFirebaseAuthUID();
    if (!firebaseUID) {
      throw new Error('Firebase Auth not authenticated. Please log in again.');
    }
    
    const projectRef = getUserProjectsRef(firebaseUID, projectId);
    if (!projectRef) {
      throw new Error('Failed to get project reference');
    }

    console.log('Firestore save: Attempting to save to', `users/${firebaseUID}/projects/${projectId}`);
    await projectRef.set(cleanedData, { merge: true });
    console.log('✅ Project saved to Firestore (lumen database):', `users/${firebaseUID}/projects/${projectId}`);
    return { success: true };
  } catch (error) {
    console.error('❌ Failed to save project to Firestore:', error);
    console.error('Error details:', {
      code: error.code,
      message: error.message,
      stack: error.stack
    });
    
    // Provide more specific error messages
    if (error.code === 'permission-denied') {
      return { success: false, error: 'Permission denied. Please check Firestore security rules.' };
    } else if (error.message && error.message.includes('size')) {
      return { success: false, error: 'Project data is too large for Firestore (max 1MB).' };
    } else if (error.message && error.message.includes('serialize')) {
      return { success: false, error: 'Project data contains invalid values that cannot be saved.' };
    }
    
    return { success: false, error: error.message || 'Unknown error occurred' };
  }
}

/**
 * Load project from Firestore
 * Path: users/{uid}/projects/{projectId}
 * Database: lumen
 */
async function loadProjectFromFirestore(projectId) {
  const currentUser = getCurrentUser();
  if (!currentUser || !currentUser.id) {
    console.warn('Cannot load project: No user logged in');
    return null;
  }

  if (!firebaseInitialized || !db) {
    console.warn('Firebase not initialized, falling back to localStorage');
    // Fallback to localStorage - use user-specific key
    const PRESENTATION_STORAGE_PREFIX = 'lumen-presentation-';
    try {
      // Try user-specific key first: lumen-presentation-{userId}-{projectId}
      const userSpecificKey = `${PRESENTATION_STORAGE_PREFIX}${currentUser.id}-${projectId}`;
      let projectDataRaw = localStorage.getItem(userSpecificKey);
      
      // If not found, try legacy key for migration
      if (!projectDataRaw) {
        const legacyKey = PRESENTATION_STORAGE_PREFIX + projectId;
        projectDataRaw = localStorage.getItem(legacyKey);
        // If found with legacy key, check if it belongs to current user
        if (projectDataRaw) {
          const legacyData = JSON.parse(projectDataRaw);
          // Only return if it belongs to current user or has no userId (migration case)
          if (legacyData.userId && legacyData.userId !== currentUser.id) {
            return null; // Project belongs to different user
          }
          // Migrate to user-specific key
          if (!legacyData.userId || legacyData.userId === currentUser.id) {
            legacyData.userId = currentUser.id;
            localStorage.setItem(userSpecificKey, JSON.stringify(legacyData));
            localStorage.removeItem(legacyKey); // Remove legacy key
          }
        }
      }
      
      const projectData = projectDataRaw ? JSON.parse(projectDataRaw) : null;
      // Double-check userId matches (security)
      if (projectData && projectData.userId && projectData.userId !== currentUser.id) {
        return null; // Project belongs to different user
      }
      return projectData;
    } catch (error) {
      console.error('Failed to load project from localStorage:', error);
      return null;
    }
  }

  try {
    // Use Firebase Auth UID for Firestore queries (required for security rules)
    const firebaseUID = getFirebaseAuthUID();
    if (!firebaseUID) {
      throw new Error('Firebase Auth not authenticated. Please log in again.');
    }
    
    const projectRef = getUserProjectsRef(firebaseUID, projectId);
    if (!projectRef) {
      throw new Error('Failed to get project reference');
    }

    const doc = await projectRef.get();
    if (doc.exists) {
      const data = doc.data();
      console.log('Project loaded from Firestore (lumen database):', `users/${firebaseUID}/projects/${projectId}`);
      
      // Debug: Log what we loaded
      console.log('Firestore load: Full data keys:', Object.keys(data));
      if (data.slides && Array.isArray(data.slides)) {
        console.log('Firestore load: Loaded', data.slides.length, 'slides');
        if (data.slides.length > 0) {
          const firstSlide = data.slides[0];
          console.log('Firestore load: First slide keys:', firstSlide ? Object.keys(firstSlide) : 'null');
          console.log('Firestore load: First slide has', firstSlide?.elements?.length || 0, 'elements');
          if (firstSlide?.elements && firstSlide.elements.length > 0) {
            console.log('Firestore load: First element type:', firstSlide.elements[0]?.type);
            console.log('Firestore load: First element text:', firstSlide.elements[0]?.text?.substring(0, 50) || 'No text');
            console.log('Firestore load: First element text length:', firstSlide.elements[0]?.text?.length || 0);
            console.log('Firestore load: First element full object:', firstSlide.elements[0]);
          } else {
            console.warn('Firestore load: WARNING - First slide has NO elements!');
            console.warn('Firestore load: First slide object:', firstSlide);
          }
        } else {
          console.warn('Firestore load: WARNING - Loaded 0 slides!');
        }
      } else {
        console.warn('Firestore load: data.slides is not a valid array:', data.slides);
        console.warn('Firestore load: data.slides type:', typeof data.slides);
      }
      
      return data;
    } else {
      console.log('Project not found in Firestore:', projectId);
      return null;
    }
  } catch (error) {
    console.error('Failed to load project from Firestore:', error);
    return null;
  }
}

/**
 * Load all projects for current user from Firestore
 * Path: users/{uid}/projects
 * Database: lumen
 */
async function loadAllUserProjectsFromFirestore() {
  const currentUser = getCurrentUser();
  if (!currentUser || !currentUser.id) {
    console.warn('Cannot load projects: No user logged in');
    return [];
  }

  // Helper function for localStorage fallback
  const loadFromLocalStorage = () => {
    console.warn('Using localStorage fallback for projects');
    const PRESENTATIONS_INDEX_KEY = 'lumen-presentations-index';
    const PRESENTATION_STORAGE_PREFIX = 'lumen-presentation-';
    try {
      // Load from user-specific index: lumen-presentations-index-{userId}
      const userSpecificIndexKey = `${PRESENTATIONS_INDEX_KEY}-${currentUser.id}`;
      let raw = localStorage.getItem(userSpecificIndexKey);
      let parsed = raw ? JSON.parse(raw) : [];
      
      // If no user-specific index, try legacy index and filter by userId
      if (!raw || parsed.length === 0) {
        raw = localStorage.getItem(PRESENTATIONS_INDEX_KEY);
        parsed = raw ? JSON.parse(raw) : [];
        // Filter to only include projects for current user
        parsed = parsed.filter(p => {
          if (!p || !p.id) return false;
          // Check if project data exists and belongs to current user
          const projectKey = `${PRESENTATION_STORAGE_PREFIX}${currentUser.id}-${p.id}`;
          const legacyKey = `${PRESENTATION_STORAGE_PREFIX}${p.id}`;
          const projectDataRaw = localStorage.getItem(projectKey) || localStorage.getItem(legacyKey);
          if (projectDataRaw) {
            try {
              const projectData = JSON.parse(projectDataRaw);
              // Include if userId matches or no userId (migration case)
              return !projectData.userId || projectData.userId === currentUser.id;
            } catch (e) {
              return false;
            }
          }
          // If no project data found, exclude it (orphaned index entry)
          return false;
        });
        
        // Save filtered list to user-specific index
        if (parsed.length > 0) {
          localStorage.setItem(userSpecificIndexKey, JSON.stringify(parsed));
        }
      }
      
      // Double-check: filter by userId in project data
      const filtered = parsed.filter(p => {
        if (!p || !p.id) return false;
        // Verify project belongs to current user
        const projectKey = `${PRESENTATION_STORAGE_PREFIX}${currentUser.id}-${p.id}`;
        const legacyKey = `${PRESENTATION_STORAGE_PREFIX}${p.id}`;
        const projectDataRaw = localStorage.getItem(projectKey) || localStorage.getItem(legacyKey);
        if (projectDataRaw) {
          try {
            const projectData = JSON.parse(projectDataRaw);
            return !projectData.userId || projectData.userId === currentUser.id;
          } catch (e) {
            return false;
          }
        }
        return false;
      });
      
      return Array.isArray(filtered) ? filtered : [];
    } catch (error) {
      console.error('Failed to load projects from localStorage:', error);
      return [];
    }
  };

  // Check if we should use localStorage fallback
  if (!firebaseInitialized || !db) {
    console.warn('Firebase not initialized, falling back to localStorage');
    return loadFromLocalStorage();
  }

  // Check if Firebase Auth is authenticated - if not, use localStorage
  const firebaseUID = getFirebaseAuthUID();
  if (!firebaseUID) {
    console.warn('Firebase Auth not authenticated. Using localStorage fallback.');
    console.warn('To use Firestore, please log out and log back in.');
    return loadFromLocalStorage();
  }

  try {
    // Use Firebase Auth UID for Firestore queries (required for security rules)
    const firebaseUID = getFirebaseAuthUID();
    if (!firebaseUID) {
      const currentUser = getCurrentUser();
      console.error('❌ Firebase Auth not authenticated!');
      console.error('   Custom auth user:', currentUser?.email || currentUser?.username || 'Unknown');
      console.error('   Firebase Auth UID: null');
      console.error('   Solution: Log out and log back in to authenticate with Firebase Auth.');
      throw new Error('Firebase Auth not authenticated. Please log out and log back in.');
    }
    
    console.log('✅ Firebase Auth authenticated with UID:', firebaseUID);
    const projectsRef = getUserProjectsRef(firebaseUID);
    if (!projectsRef) {
      throw new Error('Failed to get projects collection reference');
    }

    console.log('Attempting to load projects from Firestore with UID:', firebaseUID);
    const snapshot = await projectsRef.get();
    const projects = [];
    
    snapshot.forEach(doc => {
      const data = doc.data();
      // Only include projects that belong to this user
      if (data.userId === currentUser.id || !data.userId) {
        projects.push({
          id: doc.id,
          ...data
        });
      }
    });

    console.log(`Loaded ${projects.length} projects from Firestore (lumen database) for user ${currentUser.id}`);
    return projects;
  } catch (error) {
    console.error('Failed to load projects from Firestore:', error);
    
    // If it's a permission error and user is not authenticated with Firebase Auth
    if (error.code === 'permission-denied' || error.message?.includes('permission')) {
      const firebaseUID = getFirebaseAuthUID();
      if (!firebaseUID) {
        console.error('PERMISSION DENIED: User is logged in with custom auth but not authenticated with Firebase Auth.');
        console.error('SOLUTION: Please log out and log back in to authenticate with Firebase Auth.');
        console.error('This is required for Firestore access. Falling back to localStorage.');
      } else {
        console.error('PERMISSION DENIED: User is authenticated but Firestore security rules are blocking access.');
        console.error('Please check Firestore security rules in Firebase Console.');
      }
    }
    
    return [];
  }
}

/**
 * Delete project from Firestore
 * Path: users/{uid}/projects/{projectId}
 * Database: lumen
 */
async function deleteProjectFromFirestore(projectId) {
  const currentUser = getCurrentUser();
  if (!currentUser || !currentUser.id) {
    console.warn('Cannot delete project: No user logged in');
    return { success: false, error: 'User not logged in' };
  }

  if (!firebaseInitialized || !db) {
    console.warn('Firebase not initialized, falling back to localStorage');
    // Fallback to localStorage - use user-specific key
    const PRESENTATION_STORAGE_PREFIX = 'lumen-presentation-';
    try {
      // Remove user-specific key
      localStorage.removeItem(`${PRESENTATION_STORAGE_PREFIX}${currentUser.id}-${projectId}`);
      // Also remove legacy key if it exists
      localStorage.removeItem(PRESENTATION_STORAGE_PREFIX + projectId);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  try {
    // Use Firebase Auth UID for Firestore queries (required for security rules)
    const firebaseUID = getFirebaseAuthUID();
    if (!firebaseUID) {
      throw new Error('Firebase Auth not authenticated. Please log in again.');
    }
    
    const projectRef = getUserProjectsRef(firebaseUID, projectId);
    if (!projectRef) {
      throw new Error('Failed to get project reference');
    }

    await projectRef.delete();
    console.log('Project deleted from Firestore (lumen database):', `users/${firebaseUID}/projects/${projectId}`);
    return { success: true };
  } catch (error) {
    console.error('Failed to delete project from Firestore:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Update project metadata (name, important flag, etc.) in Firestore
 * Database: lumen
 */
async function updateProjectMetadataInFirestore(projectId, metadata) {
  const currentUser = getCurrentUser();
  if (!currentUser || !currentUser.id) {
    console.warn('Cannot update project: No user logged in');
    return { success: false, error: 'User not logged in' };
  }

  if (!firebaseInitialized || !db) {
    console.warn('Firebase not initialized, falling back to localStorage');
    // Fallback to localStorage - use user-specific key
    const PRESENTATION_STORAGE_PREFIX = 'lumen-presentation-';
    try {
      const userSpecificKey = `${PRESENTATION_STORAGE_PREFIX}${currentUser.id}-${projectId}`;
      let projectDataRaw = localStorage.getItem(userSpecificKey);
      
      // Try legacy key if user-specific not found
      if (!projectDataRaw) {
        projectDataRaw = localStorage.getItem(PRESENTATION_STORAGE_PREFIX + projectId);
      }
      
      if (projectDataRaw) {
        const projectData = JSON.parse(projectDataRaw);
        // Verify it belongs to current user
        if (projectData.userId && projectData.userId !== currentUser.id) {
          return { success: false, error: 'Project belongs to different user' };
        }
        const updatedData = { ...projectData, ...metadata, updatedAt: Date.now(), userId: currentUser.id };
        localStorage.setItem(userSpecificKey, JSON.stringify(updatedData));
        // Remove legacy key if it exists
        localStorage.removeItem(PRESENTATION_STORAGE_PREFIX + projectId);
      }
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  try {
    // Use Firebase Auth UID for Firestore queries (required for security rules)
    const firebaseUID = getFirebaseAuthUID();
    if (!firebaseUID) {
      throw new Error('Firebase Auth not authenticated. Please log in again.');
    }
    
    const projectRef = getUserProjectsRef(firebaseUID, projectId);
    if (!projectRef) {
      throw new Error('Failed to get project reference');
    }

    await projectRef.update({
      ...metadata,
      updatedAt: Date.now()
    });
    console.log('Project metadata updated in Firestore (lumen database):', projectId);
    return { success: true };
  } catch (error) {
    console.error('Failed to update project metadata in Firestore:', error);
    return { success: false, error: error.message };
  }
}

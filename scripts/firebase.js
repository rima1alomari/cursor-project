// Firebase/Firestore initialization and project management
// This script provides user-specific project storage using Firestore

// Firebase configuration - Update with your Firebase project config
// You can also set these via window.firebaseConfig if you prefer to load from a separate config file
const firebaseConfig = window.firebaseConfig || {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Initialize Firebase (only if Firebase SDK is loaded)
let db = null;
let firebaseInitialized = false;

// Check if Firebase SDK is available
if (typeof firebase !== 'undefined' && firebase.apps && firebase.apps.length === 0) {
  try {
    firebase.initializeApp(firebaseConfig);
    db = firebase.firestore();
    firebaseInitialized = true;
    console.log('Firebase initialized successfully');
  } catch (error) {
    console.warn('Failed to initialize Firebase:', error);
  }
} else if (typeof firebase !== 'undefined' && firebase.apps && firebase.apps.length > 0) {
  // Firebase already initialized
  db = firebase.firestore();
  firebaseInitialized = true;
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
 */
function getUserProjectsRef(uid, projectId = null) {
  if (!db || !uid) return null;
  
  if (projectId) {
    return db.collection('users').doc(uid).collection('projects').doc(projectId);
  } else {
    return db.collection('users').doc(uid).collection('projects');
  }
}

/**
 * Save project to Firestore
 * Path: users/{uid}/projects/{projectId}
 */
async function saveProjectToFirestore(projectId, projectData) {
  const currentUser = getCurrentUser();
  if (!currentUser || !currentUser.id) {
    console.warn('Cannot save project: No user logged in');
    return { success: false, error: 'User not logged in' };
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
    const projectRef = getUserProjectsRef(currentUser.id, projectId);
    if (!projectRef) {
      throw new Error('Failed to get project reference');
    }

    // Ensure projectData has required fields
    const dataToSave = {
      ...projectData,
      id: projectId,
      updatedAt: Date.now(),
      userId: currentUser.id
    };

    await projectRef.set(dataToSave, { merge: true });
    console.log('Project saved to Firestore:', `users/${currentUser.id}/projects/${projectId}`);
    return { success: true };
  } catch (error) {
    console.error('Failed to save project to Firestore:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Load project from Firestore
 * Path: users/{uid}/projects/{projectId}
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
    const projectRef = getUserProjectsRef(currentUser.id, projectId);
    if (!projectRef) {
      throw new Error('Failed to get project reference');
    }

    const doc = await projectRef.get();
    if (doc.exists) {
      const data = doc.data();
      console.log('Project loaded from Firestore:', `users/${currentUser.id}/projects/${projectId}`);
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
 */
async function loadAllUserProjectsFromFirestore() {
  const currentUser = getCurrentUser();
  if (!currentUser || !currentUser.id) {
    console.warn('Cannot load projects: No user logged in');
    return [];
  }

  if (!firebaseInitialized || !db) {
    console.warn('Firebase not initialized, falling back to localStorage');
    // Fallback to localStorage - filter by userId
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
  }

  try {
    const projectsRef = getUserProjectsRef(currentUser.id);
    if (!projectsRef) {
      throw new Error('Failed to get projects collection reference');
    }

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

    console.log(`Loaded ${projects.length} projects from Firestore for user ${currentUser.id}`);
    return projects;
  } catch (error) {
    console.error('Failed to load projects from Firestore:', error);
    return [];
  }
}

/**
 * Delete project from Firestore
 * Path: users/{uid}/projects/{projectId}
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
    const projectRef = getUserProjectsRef(currentUser.id, projectId);
    if (!projectRef) {
      throw new Error('Failed to get project reference');
    }

    await projectRef.delete();
    console.log('Project deleted from Firestore:', `users/${currentUser.id}/projects/${projectId}`);
    return { success: true };
  } catch (error) {
    console.error('Failed to delete project from Firestore:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Update project metadata (name, important flag, etc.) in Firestore
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
    const projectRef = getUserProjectsRef(currentUser.id, projectId);
    if (!projectRef) {
      throw new Error('Failed to get project reference');
    }

    await projectRef.update({
      ...metadata,
      updatedAt: Date.now()
    });
    console.log('Project metadata updated in Firestore:', projectId);
    return { success: true };
  } catch (error) {
    console.error('Failed to update project metadata in Firestore:', error);
    return { success: false, error: error.message };
  }
}


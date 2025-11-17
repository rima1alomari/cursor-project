// Teams database and management system using localStorage

const TEAMS_STORAGE_KEY = 'lumen-teams';
const TEAM_MEMBERS_STORAGE_KEY = 'lumen-team-members';
const TEAM_PROJECTS_STORAGE_KEY = 'lumen-team-projects';
const ACTIVITIES_STORAGE_KEY = 'lumen-activities';

/**
 * Get all teams from storage
 */
function getTeams() {
  try {
    const stored = localStorage.getItem(TEAMS_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.warn('Failed to load teams', error);
    return [];
  }
}

/**
 * Save teams to storage
 */
function saveTeams(teams) {
  try {
    localStorage.setItem(TEAMS_STORAGE_KEY, JSON.stringify(teams));
    return true;
  } catch (error) {
    console.warn('Failed to save teams', error);
    return false;
  }
}

/**
 * Get all team members from storage
 */
function getTeamMembers() {
  try {
    const stored = localStorage.getItem(TEAM_MEMBERS_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.warn('Failed to load team members', error);
    return [];
  }
}

/**
 * Save team members to storage
 */
function saveTeamMembers(members) {
  try {
    localStorage.setItem(TEAM_MEMBERS_STORAGE_KEY, JSON.stringify(members));
    return true;
  } catch (error) {
    console.warn('Failed to save team members', error);
    return false;
  }
}

/**
 * Get all team projects from storage
 */
function getTeamProjects() {
  try {
    const stored = localStorage.getItem(TEAM_PROJECTS_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.warn('Failed to load team projects', error);
    return [];
  }
}

/**
 * Save team projects to storage
 */
function saveTeamProjects(projects) {
  try {
    localStorage.setItem(TEAM_PROJECTS_STORAGE_KEY, JSON.stringify(projects));
    return true;
  } catch (error) {
    console.warn('Failed to save team projects', error);
    return false;
  }
}

/**
 * Get all activities from storage
 */
function getActivities() {
  try {
    const stored = localStorage.getItem(ACTIVITIES_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.warn('Failed to load activities', error);
    return [];
  }
}

/**
 * Save activities to storage
 */
function saveActivities(activities) {
  try {
    localStorage.setItem(ACTIVITIES_STORAGE_KEY, JSON.stringify(activities));
    return true;
  } catch (error) {
    console.warn('Failed to save activities', error);
    return false;
  }
}

/**
 * Create a new team
 */
function createTeam(name, icon = null, color = null) {
  const currentUser = getCurrentUser();
  if (!currentUser) {
    return { success: false, error: 'You must be logged in to create a team.' };
  }

  const teams = getTeams();
  const teamId = crypto.randomUUID ? crypto.randomUUID() : `team-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  
  const newTeam = {
    teamId,
    name: name.trim(),
    icon,
    color,
    ownerUserId: currentUser.id,
    createdAt: new Date().toISOString()
  };

  teams.push(newTeam);
  
  if (saveTeams(teams)) {
    // Add creator as owner member
    addTeamMember(teamId, currentUser.id, 'owner');
    
    // Log activity
    logActivity({
      teamId,
      userId: currentUser.id,
      actionType: 'team_created',
      details: { teamName: name }
    });

    return { success: true, team: newTeam };
  } else {
    return { success: false, error: 'Failed to create team.' };
  }
}

/**
 * Add a member to a team
 */
function addTeamMember(teamId, userId, role = 'member') {
  const members = getTeamMembers();
  
  // Check if member already exists
  const existing = members.find(m => m.teamId === teamId && m.userId === userId);
  if (existing) {
    return { success: false, error: 'User is already a member of this team.' };
  }

  const newMember = {
    teamId,
    userId,
    role,
    joinedAt: new Date().toISOString()
  };

  members.push(newMember);
  
  if (saveTeamMembers(members)) {
    return { success: true, member: newMember };
  } else {
    return { success: false, error: 'Failed to add team member.' };
  }
}

/**
 * Remove a member from a team
 */
function removeTeamMember(teamId, userId) {
  const members = getTeamMembers();
  const filtered = members.filter(m => !(m.teamId === teamId && m.userId === userId));
  
  if (saveTeamMembers(filtered)) {
    return { success: true };
  } else {
    return { success: false, error: 'Failed to remove team member.' };
  }
}

/**
 * Get teams for a user
 */
function getUserTeams(userId) {
  const members = getTeamMembers();
  const userTeamIds = members
    .filter(m => m.userId === userId)
    .map(m => m.teamId);
  
  const teams = getTeams();
  return teams.filter(t => userTeamIds.includes(t.teamId));
}

/**
 * Get team members for a team
 */
function getTeamMembersList(teamId) {
  const members = getTeamMembers();
  return members.filter(m => m.teamId === teamId);
}

/**
 * Get user role in a team
 */
function getUserTeamRole(teamId, userId) {
  const members = getTeamMembers();
  const member = members.find(m => m.teamId === teamId && m.userId === userId);
  return member ? member.role : null;
}

/**
 * Check if user is team owner
 */
function isTeamOwner(teamId, userId) {
  const role = getUserTeamRole(teamId, userId);
  return role === 'owner';
}

/**
 * Check if user can edit in team
 */
function canUserEditInTeam(teamId, userId) {
  const role = getUserTeamRole(teamId, userId);
  return role === 'owner' || role === 'member';
}

/**
 * Link a project to a team
 */
function linkProjectToTeam(projectId, teamId) {
  const projects = getTeamProjects();
  
  // Remove existing link for this project
  const filtered = projects.filter(p => p.projectId !== projectId);
  
  const newLink = {
    projectId,
    teamId,
    linkedAt: new Date().toISOString()
  };

  filtered.push(newLink);
  
  if (saveTeamProjects(filtered)) {
    return { success: true };
  } else {
    return { success: false, error: 'Failed to link project to team.' };
  }
}

/**
 * Get team for a project
 */
function getProjectTeam(projectId) {
  const projects = getTeamProjects();
  const link = projects.find(p => p.projectId === projectId);
  if (!link) return null;
  
  const teams = getTeams();
  return teams.find(t => t.teamId === link.teamId);
}

/**
 * Get projects for a team
 */
function getTeamProjectsList(teamId) {
  const projects = getTeamProjects();
  return projects.filter(p => p.teamId === teamId);
}

/**
 * Log an activity
 */
function logActivity(activity) {
  const activities = getActivities();
  const currentUser = getCurrentUser();
  
  const newActivity = {
    activityId: crypto.randomUUID ? crypto.randomUUID() : `activity-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    teamId: activity.teamId || null,
    userId: activity.userId || (currentUser ? currentUser.id : null),
    userEmail: currentUser ? currentUser.email : null,
    userName: currentUser ? (currentUser.username || currentUser.email) : null,
    actionType: activity.actionType,
    projectId: activity.projectId || null,
    slideId: activity.slideId || null,
    timestamp: new Date().toISOString(),
    details: activity.details || {}
  };

  activities.unshift(newActivity); // Add to beginning
  
  // Keep only last 1000 activities
  if (activities.length > 1000) {
    activities.splice(1000);
  }
  
  saveActivities(activities);
  return newActivity;
}

/**
 * Get activities for a team
 */
function getTeamActivities(teamId, limit = 50) {
  const activities = getActivities();
  return activities
    .filter(a => a.teamId === teamId)
    .slice(0, limit);
}

/**
 * Get activities for a project
 */
function getProjectActivities(projectId, limit = 50) {
  const activities = getActivities();
  return activities
    .filter(a => a.projectId === projectId)
    .slice(0, limit);
}

/**
 * Get user activities
 */
function getUserActivities(userId, limit = 50) {
  const activities = getActivities();
  return activities
    .filter(a => a.userId === userId)
    .slice(0, limit);
}

/**
 * Invite user to team by email
 */
function inviteUserToTeam(teamId, email) {
  const currentUser = getCurrentUser();
  if (!currentUser) {
    return { success: false, error: 'You must be logged in to invite users.' };
  }

  // Check if user has permission
  if (!isTeamOwner(teamId, currentUser.id)) {
    return { success: false, error: 'Only team owners can invite members.' };
  }

  // Check if email exists in accounts
  const accounts = getAccounts();
  const account = accounts.find(acc => acc.email.toLowerCase() === email.toLowerCase());
  
  if (!account) {
    return { success: false, error: 'User with this email not found. They need to register first.' };
  }

  // Check if already a member
  const existing = getTeamMembersList(teamId).find(m => m.userId === account.id);
  if (existing) {
    return { success: false, error: 'User is already a member of this team.' };
  }

  // Add as member
  const result = addTeamMember(teamId, account.id, 'member');
  
  if (result.success) {
    // Log activity
    logActivity({
      teamId,
      userId: account.id,
      actionType: 'team_joined',
      details: { invitedBy: currentUser.id, teamName: getTeams().find(t => t.teamId === teamId)?.name }
    });

    return { success: true, message: 'User added to team successfully.' };
  } else {
    return result;
  }
}

/**
 * Get user info by ID
 */
function getUserById(userId) {
  const accounts = getAccounts();
  const account = accounts.find(acc => acc.id === userId);
  if (!account) return null;
  
  const { password: _, ...userData } = account;
  return userData;
}

/**
 * Format activity message
 */
function formatActivityMessage(activity) {
  const userName = activity.userName || activity.userEmail || 'Unknown';
  const actionType = activity.actionType;
  const details = activity.details || {};

  const messages = {
    'team_created': `${userName} created team "${details.teamName}"`,
    'team_joined': `${userName} joined the team`,
    'project_created': `${userName} created project "${details.projectName || 'Untitled'}"`,
    'slide_created': `${userName} created slide ${details.slideNumber || ''}`,
    'slide_edited': `${userName} edited slide ${details.slideNumber || ''}`,
    'slide_deleted': `${userName} deleted slide ${details.slideNumber || ''}`,
    'slide_renamed': `${userName} renamed slide to "${details.newName}"`,
    'comment_added': `${userName} added a comment on slide ${details.slideNumber || ''}`,
    'comment_edited': `${userName} edited a comment`,
    'comment_deleted': `${userName} deleted a comment`,
    'element_added': `${userName} added ${details.elementType || 'an element'} to slide ${details.slideNumber || ''}`,
    'element_edited': `${userName} edited ${details.elementType || 'an element'}`,
    'element_deleted': `${userName} deleted ${details.elementType || 'an element'}`,
  };

  return messages[actionType] || `${userName} performed ${actionType}`;
}


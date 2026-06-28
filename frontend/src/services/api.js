import axios from 'axios';
import { mockProfiles } from './mockData';

// Configuration
const API_BASE_URL = '/api';

// Create Axios instance
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor for JWT Token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('dt_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Toggle variable to force mock mode if desired (or autodetect)
let forceMock = false;

// ----------------------------------------------------
// LOCAL STORAGE MOCK SIMULATOR
// ----------------------------------------------------
const initMockDB = () => {
  if (!localStorage.getItem('dt_profiles')) {
    localStorage.setItem('dt_profiles', JSON.stringify(mockProfiles));
  }
  if (!localStorage.getItem('dt_users')) {
    // Seed standard mock users for testing login
    const initialUsers = mockProfiles.map(p => ({
      id: p.userId,
      email: `${p.fullName.toLowerCase().replace(' ', '')}@devtinder.com`,
      username: p.fullName.toLowerCase().replace(' ', ''),
      password: 'password123', // Default test password
      role: 'USER',
      subscriptionTier: p.id === 'mock-2' ? 'PRO' : 'FREE' // Make Alex Rivera a PRO
    }));
    localStorage.setItem('dt_users', JSON.stringify(initialUsers));
  }
  if (!localStorage.getItem('dt_swipes')) {
    // Seed some initial swipes to create mock pending requests
    // Let's make Sarah Chen (mock-1, user-1), Aisha Patel (mock-3, user-3), and Chloe (mock-5, user-5)
    // swipe right on the user (e.g. current user is "me")
    const initialSwipes = [
      { id: 'swipe-init-1', swiperUserId: 'user-1', targetUserId: 'current-user-id', isRightSwipe: true, timestamp: new Date().toISOString() },
      { id: 'swipe-init-2', swiperUserId: 'user-3', targetUserId: 'current-user-id', isRightSwipe: true, timestamp: new Date().toISOString() },
      { id: 'swipe-init-3', swiperUserId: 'user-5', targetUserId: 'current-user-id', isRightSwipe: true, timestamp: new Date().toISOString() },
    ];
    localStorage.setItem('dt_swipes', JSON.stringify(initialSwipes));
  }
  if (!localStorage.getItem('dt_connections')) {
    localStorage.setItem('dt_connections', JSON.stringify([]));
  }
  if (!localStorage.getItem('dt_chat_messages')) {
    localStorage.setItem('dt_chat_messages', JSON.stringify([]));
  }
  if (!localStorage.getItem('dt_projects')) {
    const initialProjects = [
      {
        id: 'proj-1',
        title: 'Portfolio Website',
        description: 'A beautiful, minimalist 3D portfolio site showing my latest interactive designs.',
        technologiesUsed: ['React', 'Three.js', 'Framer Motion', 'Tailwind CSS'],
        githubUrl: 'https://github.com/sarah-chen/portfolio-3d',
        liveDemoUrl: 'https://sarahchen.dev',
        ownerUserId: 'user-1'
      },
      {
        id: 'proj-2',
        title: 'E-commerce API Gateway',
        description: 'High performance API gateway service routing traffic to sub-services, built using reactive spring webflux.',
        technologiesUsed: ['Java', 'Spring Boot', 'Spring Cloud Gateway', 'Redis'],
        githubUrl: 'https://github.com/alex-rivera-jvm/api-gateway',
        liveDemoUrl: '',
        ownerUserId: 'user-2'
      },
      {
        id: 'proj-3',
        title: 'Movie Recommendation Engine',
        description: 'Collaborative filtering recommender engine using PyTorch, trained on MovieLens 100k database.',
        technologiesUsed: ['Python', 'PyTorch', 'Pandas', 'FastAPI'],
        githubUrl: 'https://github.com/aisha-ds/movie-recommender',
        liveDemoUrl: 'https://aisha.ai/demo/movies',
        ownerUserId: 'user-3'
      }
    ];
    localStorage.setItem('dt_projects', JSON.stringify(initialProjects));
  }
};

// Initialize Mock database
initMockDB();

const getMockData = (key) => JSON.parse(localStorage.getItem(key) || '[]');
const setMockData = (key, data) => localStorage.setItem(key, JSON.stringify(data));

const mockOAuthLogin = async (emailInput) => {
  const users = getMockData('dt_users');
  let user = users.find(u => u.email === emailInput);
  
  if (!user) {
    console.log('[Mock API] Registering new OAuth user:', emailInput);
    const username = emailInput.split('@')[0].replaceAll(/[^a-zA-Z0-9_]/g, '');
    user = {
      id: 'user-' + Math.random().toString(36).substr(2, 9),
      username: username || 'oauth_user',
      email: emailInput,
      role: 'USER',
      subscriptionTier: 'FREE'
    };
    users.push(user);
    setMockData('dt_users', users);
  }

  const token = `mock-jwt-token-for-${user.id}`;
  localStorage.setItem('dt_token', token);
  localStorage.setItem('dt_current_user', JSON.stringify(user));
  return { token, username: user.username, email: user.email, id: user.id };
};

const mockAuthService = {
  login: async (email, password) => {
    console.log('[Mock API] Attempting login for', email);
    const users = getMockData('dt_users');
    const emailExists = users.some(u => u.email === email);
    if (!emailExists) {
      throw new Error('This email is not registered with us, please sign up.');
    }
    const user = users.find(u => u.email === email && u.password === password);
    if (!user) {
      throw new Error('Invalid email or password');
    }
    const token = `mock-jwt-token-for-${user.id}`;
    localStorage.setItem('dt_token', token);
    localStorage.setItem('dt_current_user', JSON.stringify(user));
    return { token, username: user.username, email: user.email, id: user.id };
  },

  register: async (username, email, password) => {
    console.log('[Mock API] Registering user', username);
    const users = getMockData('dt_users');
    if (users.some(u => u.email === email)) {
      throw new Error('Email is already registered!');
    }
    if (users.some(u => u.username === username)) {
      throw new Error('Username is already taken!');
    }
    const newUser = {
      id: 'user-' + Math.random().toString(36).substr(2, 9),
      username,
      email,
      password,
      role: 'USER',
      subscriptionTier: 'FREE'
    };
    users.push(newUser);
    setMockData('dt_users', users);
    return 'User registered successfully!';
  },

  logout: () => {
    localStorage.removeItem('dt_token');
    localStorage.removeItem('dt_current_user');
  },

  loginGoogleMock: async () => {
    const emailInput = window.prompt(
      "🔄 [Google OAuth Simulation]\nChoose a Google Account email to sign in or register:",
      "new_developer@gmail.com"
    );
    if (!emailInput) {
      throw new Error("Google Sign-In cancelled");
    }
    return mockOAuthLogin(emailInput);
  },

  loginGithubMock: async () => {
    const emailInput = window.prompt(
      "🔄 [GitHub OAuth Simulation]\nChoose a GitHub Account email to sign in or register:",
      "git_coder@gmail.com"
    );
    if (!emailInput) {
      throw new Error("GitHub Sign-In cancelled");
    }
    return mockOAuthLogin(emailInput);
  }
};

const mockProfileService = {
  getProfile: async (userId) => {
    console.log('[Mock API] Getting profile for user', userId);
    const profiles = getMockData('dt_profiles');
    let profile = profiles.find(p => p.userId === userId);
    if (!profile) {
      // Return empty profile layout
      const users = getMockData('dt_users');
      const user = users.find(u => u.id === userId);
      profile = {
        userId,
        fullName: user ? user.username : 'New Developer',
        bio: '',
        githubUrl: '',
        resumeUrl: '',
        skills: [],
        interests: [],
        yearsOfExperience: 0,
        age: 23,
        gender: 'Male',
        photoUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=600&h=600'
      };
    }
    return profile;
  },

  saveProfile: async (profileData) => {
    console.log('[Mock API] Saving profile', profileData);
    const profiles = getMockData('dt_profiles');
    const index = profiles.findIndex(p => p.userId === profileData.userId);
    
    // Set default photo if missing
    if (!profileData.photoUrl) {
      profileData.photoUrl = profileData.gender === 'Female' 
        ? 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=600&h=600'
        : 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=600&h=600';
    }
    
    if (index !== -1) {
      profiles[index] = { ...profiles[index], ...profileData };
    } else {
      profiles.push({
        id: 'profile-' + Math.random().toString(36).substr(2, 9),
        ...profileData
      });
    }
    setMockData('dt_profiles', profiles);
    return profileData;
  }
};

const mockFeedService = {
  getFeed: async (currentUserId) => {
    console.log('[Mock API] Fetching feed for', currentUserId);
    const profiles = getMockData('dt_profiles');
    const swipes = getMockData('dt_swipes');

    // Exclude swipes by the current user
    const swipedTargetIds = swipes
      .filter(s => s.swiperUserId === currentUserId)
      .map(s => s.targetUserId);

    // Exclude current user and already swiped developers
    const feed = profiles.filter(p => p.userId !== currentUserId && !swipedTargetIds.includes(p.userId));
    
    // Enrich with mock compatibility scores and reasons
    const mockReasons = [
      "Both of you specialize in modern React architectures and share an interest in open source.",
      "They build microservices using Spring Boot, which perfectly complements your frontend skills.",
      "Aligns with your interest in statistics and machine learning; they build recommendation systems.",
      "They focus on cloud native automation (AWS/Terraform) to support your backend deployments.",
      "Matches your mobile development goals; they are an expert in native-looking Flutter apps.",
      "A full-stack engineer who complements your interest in product design and UI layouts.",
      "They specialize in low-level Rust and WebAssembly, which can optimize your heavy algorithms."
    ];

    return feed.map(p => {
      // Create a deterministic score & reason index based on the profile id string
      const idNum = p.id ? parseInt(p.id.replace(/[^0-9]/g, '')) || 1 : 1;
      const compatibilityScore = 75 + (idNum * 7) % 24; // score between 75% and 98%
      const reasonIdx = idNum % mockReasons.length;
      const compatibilityReason = mockReasons[reasonIdx];
      
      return {
        ...p,
        compatibilityScore,
        compatibilityReason
      };
    });
  }
};

const mockSwipeService = {
  submitSwipe: async (swipeData) => {
    console.log('[Mock API] Submitting swipe', swipeData);
    const swipes = getMockData('dt_swipes');
    const swipeId = 'swipe-' + Math.random().toString(36).substr(2, 9);
    const newSwipe = {
      id: swipeId,
      ...swipeData,
      timestamp: new Date().toISOString()
    };
    swipes.push(newSwipe);
    setMockData('dt_swipes', swipes);

    // Matchmaking logic (Tinder style)
    let isMatch = false;
    if (swipeData.isRightSwipe) {
      const reverseSwipe = swipes.find(
        s => s.swiperUserId === swipeData.targetUserId && 
             (s.targetUserId === swipeData.swiperUserId || s.targetUserId === 'current-user-id') && 
             s.isRightSwipe === true
      );

      if (reverseSwipe) {
        console.log('[Mock API] Mutual swipe detected! Creating connection.');
        isMatch = true;
        const connections = getMockData('dt_connections');
        const connId = 'conn-' + Math.random().toString(36).substr(2, 9);
        connections.push({
          id: connId,
          userOneId: swipeData.swiperUserId,
          userTwoId: swipeData.targetUserId,
          createdAt: new Date().toISOString()
        });
        setMockData('dt_connections', connections);
      }
    }

    return { ...newSwipe, isMatch };
  }
};

const mockConnectionsAndRequests = {
  getConnections: async (currentUserId) => {
    console.log('[Mock API] Fetching connections for', currentUserId);
    const connections = getMockData('dt_connections');
    const profiles = getMockData('dt_profiles');

    // Filter connections that involve the current user
    const userConnections = connections.filter(
      c => c.userOneId === currentUserId || c.userTwoId === currentUserId
    );

    // Fetch the profile of the other user in the connection
    const matchedProfiles = [];
    userConnections.forEach(c => {
      const otherUserId = c.userOneId === currentUserId ? c.userTwoId : c.userOneId;
      const otherProfile = profiles.find(p => p.userId === otherUserId);
      if (otherProfile) {
        matchedProfiles.push({
          ...otherProfile,
          connectionId: c.id,
          matchedAt: c.createdAt
        });
      }
    });

    return matchedProfiles;
  },

  getRequests: async (currentUserId) => {
    console.log('[Mock API] Fetching pending requests for', currentUserId);
    const swipes = getMockData('dt_swipes');
    const profiles = getMockData('dt_profiles');

    // Requests are users who swiped right on current user,
    // where the current user HAS NOT swiped on them yet.
    const incomingLikes = swipes.filter(
      s => (s.targetUserId === currentUserId || s.targetUserId === 'current-user-id') && s.isRightSwipe === true
    );

    const swipedByCurrentUser = swipes
      .filter(s => s.swiperUserId === currentUserId)
      .map(s => s.targetUserId);

    const pendingProfiles = [];
    incomingLikes.forEach(like => {
      if (!swipedByCurrentUser.includes(like.swiperUserId)) {
        const profile = profiles.find(p => p.userId === like.swiperUserId);
        if (profile && !pendingProfiles.some(p => p.userId === profile.userId)) {
          pendingProfiles.push({
            ...profile,
            swipeId: like.id,
            timestamp: like.timestamp
          });
        }
      }
    });

    return pendingProfiles;
  }
};

const mockProjectService = {
  getProjectsByOwner: async (ownerUserId) => {
    console.log('[Mock API] Fetching projects for owner', ownerUserId);
    const projects = getMockData('dt_projects');
    return projects.filter(p => p.ownerUserId === ownerUserId);
  },
  addProject: async (projectData) => {
    console.log('[Mock API] Saving project', projectData);
    const projects = getMockData('dt_projects');
    const newProject = {
      id: 'proj-' + Math.random().toString(36).substr(2, 9),
      ...projectData
    };
    projects.push(newProject);
    setMockData('dt_projects', projects);
    return newProject;
  },
  deleteProject: async (projectId) => {
    console.log('[Mock API] Deleting project', projectId);
    const projects = getMockData('dt_projects');
    const filtered = projects.filter(p => p.id !== projectId);
    setMockData('dt_projects', filtered);
    return { success: true };
  }
};

const mockChatService = {
  getChatHistory: async (currentUserId, otherUserId) => {
    console.log('[Mock API] Fetching chat history between', currentUserId, 'and', otherUserId);
    const messages = getMockData('dt_chat_messages');
    return messages.filter(
      m => (m.senderId === currentUserId && m.recipientId === otherUserId) ||
           (m.senderId === otherUserId && m.recipientId === currentUserId)
    ).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  },

  saveMessage: async (senderId, recipientId, text) => {
    console.log('[Mock API] Saving message from', senderId, 'to', recipientId);
    const messages = getMockData('dt_chat_messages');
    const newMsg = {
      id: 'msg-' + Math.random().toString(36).substr(2, 9),
      senderId,
      recipientId,
      text,
      timestamp: new Date().toISOString()
    };
    messages.push(newMsg);
    setMockData('dt_chat_messages', messages);
    return newMsg;
  }
};

// Helper to check if backend is running (returns true if reachable)
const isBackendReachable = async () => {
  if (forceMock) return false;
  try {
    // Perform a quick check on AuthController login endpoint metadata or simple ping
    // We will attempt to fetch a public or simple endpoint.
    // If it fails with connection refused, we know backend is down.
    await axios.get('/api/auth/ping-check', { timeout: 1000 });
    return true;
  } catch (error) {
    if (error.code === 'ECONNABORTED' || !error.response) {
      // Network error or timeout, backend is likely down
      return false;
    }
    // If we get a 404 or other response, the server IS up (just that path is missing)
    return true;
  }
};

// ----------------------------------------------------
// EXPORTED API SERVICES (DUAL-MODE)
// ----------------------------------------------------

export const authService = {
  login: async (email, password) => {
    if (await isBackendReachable()) {
      try {
        const response = await apiClient.post('/auth/login', { email, password });
        const { token } = response.data;
        const userDetails = {
          id: response.data.userId || response.data.id,
          username: response.data.username,
          email: response.data.email,
        };
        localStorage.setItem('dt_token', token);
        localStorage.setItem('dt_current_user', JSON.stringify(userDetails));
        return { ...response.data, ...userDetails };
      } catch (err) {
        console.error('[API] Real login failed, falling back to mock login.', err);
        if (err.response && err.response.data) {
          throw new Error(err.response.data.message || err.response.data || 'Login failed');
        }
        return mockAuthService.login(email, password);
      }
    } else {
      return mockAuthService.login(email, password);
    }
  },

  register: async (username, email, password) => {
    if (await isBackendReachable()) {
      try {
        const response = await apiClient.post('/auth/register', { username, email, password });
        return response.data;
      } catch (err) {
        console.error('[API] Real registration failed, falling back to mock registration.', err);
        if (err.response && err.response.data) {
          throw new Error(err.response.data.message || err.response.data || 'Registration failed');
        }
        return mockAuthService.register(username, email, password);
      }
    } else {
      return mockAuthService.register(username, email, password);
    }
  },

  logout: () => {
    mockAuthService.logout();
  },

  loginGoogle: async (idToken) => {
    if (await isBackendReachable()) {
      try {
        const response = await apiClient.post('/auth/google', { idToken });
        const { token } = response.data;
        const userDetails = {
          id: response.data.userId || response.data.id,
          username: response.data.username,
          email: response.data.email,
        };
        localStorage.setItem('dt_token', token);
        localStorage.setItem('dt_current_user', JSON.stringify(userDetails));
        return { ...response.data, ...userDetails };
      } catch (err) {
        console.error('[API] Real Google auth failed, falling back to mock login.', err);
        return mockAuthService.loginGoogleMock();
      }
    } else {
      return mockAuthService.loginGoogleMock();
    }
  },

  loginGithub: async (code) => {
    if (await isBackendReachable()) {
      try {
        const response = await apiClient.post('/auth/github', { code });
        const { token } = response.data;
        const userDetails = {
          id: response.data.userId || response.data.id,
          username: response.data.username,
          email: response.data.email,
        };
        localStorage.setItem('dt_token', token);
        localStorage.setItem('dt_current_user', JSON.stringify(userDetails));
        return { ...response.data, ...userDetails };
      } catch (err) {
        console.error('[API] Real GitHub auth failed, falling back to mock login.', err);
        return mockAuthService.loginGithubMock();
      }
    } else {
      return mockAuthService.loginGithubMock();
    }
  }
};
export const profileService = {
  getProfile: async (userId) => {
    if (await isBackendReachable()) {
      try {
        const response = await apiClient.get(`/profiles/${userId}`);
        return response.data;
      } catch (err) {
        if (err.response && err.response.status === 404) {
          console.log('[API] Profile not found (404) on backend. Needs onboarding.');
          return null;
        }
        console.warn('[API] Real profile get failed. Falling back to mock profile.', err);
        return mockProfileService.getProfile(userId);
      }
    } else {
      return mockProfileService.getProfile(userId);
    }
  },

  saveProfile: async (profileData) => {
    if (await isBackendReachable()) {
      try {
        const response = await apiClient.post('/profiles', profileData);
        return response.data;
      } catch (err) {
        console.error('[API] Real profile save failed. Falling back to mock save.', err);
        return mockProfileService.saveProfile(profileData);
      }
    } else {
      return mockProfileService.saveProfile(profileData);
    }
  }
};

export const feedService = {
  getFeed: async (currentUserId) => {
    if (await isBackendReachable()) {
      try {
        const response = await apiClient.get('/feed');
        // If feed is empty and backend is running, we might still want to show mock profiles 
        // to make it look full and exciting, but let's respect backend empty state if it works
        return response.data;
      } catch (err) {
        console.warn('[API] Real feed fetch failed. Falling back to mock feed.', err);
        return mockFeedService.getFeed(currentUserId);
      }
    } else {
      return mockFeedService.getFeed(currentUserId);
    }
  }
};

export const swipeService = {
  submitSwipe: async (swiperUserId, targetUserId, isRightSwipe) => {
    const swipePayload = { swiperUserId, targetUserId, isRightSwipe };
    if (await isBackendReachable()) {
      try {
        const response = await apiClient.post('/swipes', swipePayload);
        // Note: The backend SwipeService automatically creates a Match (Connection) in DB.
        // We will mock check for mutual match locally as well in case connection endpoints are mocked
        const mockResult = await mockSwipeService.submitSwipe(swipePayload);
        return { ...response.data, isMatch: mockResult.isMatch };
      } catch (err) {
        console.error('[API] Real swipe submit failed. Falling back to mock swipe.', err);
        return mockSwipeService.submitSwipe(swipePayload);
      }
    } else {
      return mockSwipeService.submitSwipe(swipePayload);
    }
  }
};

export const connectionService = {
  getConnections: async (currentUserId) => {
    if (await isBackendReachable()) {
      try {
        const response = await apiClient.get('/connections');
        return response.data;
      } catch (err) {
        console.warn('[API] Real connections get failed. Falling back to mock.', err);
        return mockConnectionsAndRequests.getConnections(currentUserId);
      }
    } else {
      return mockConnectionsAndRequests.getConnections(currentUserId);
    }
  },
  unmatchConnection: async (currentUserId, otherUserId) => {
    console.log('[Mock API] Unmatching users', currentUserId, 'and', otherUserId);
    
    // 1. Remove from dt_connections
    const connections = getMockData('dt_connections');
    const filteredConnections = connections.filter(
      c => !((c.userOneId === currentUserId && c.userTwoId === otherUserId) || 
             (c.userOneId === otherUserId && c.userTwoId === currentUserId))
    );
    setMockData('dt_connections', filteredConnections);

    // 2. Remove from dt_swipes
    const swipes = getMockData('dt_swipes');
    const filteredSwipes = swipes.filter(
      s => !((s.swiperUserId === currentUserId && s.targetUserId === otherUserId) || 
             (s.swiperUserId === otherUserId && s.targetUserId === currentUserId) ||
             (s.swiperUserId === 'current-user-id' && s.targetUserId === otherUserId) ||
             (s.swiperUserId === otherUserId && s.targetUserId === 'current-user-id'))
    );
    setMockData('dt_swipes', filteredSwipes);

    // 3. Remove from dt_chat_messages
    const messages = getMockData('dt_chat_messages');
    const filteredMessages = messages.filter(
      m => !((m.senderId === currentUserId && m.recipientId === otherUserId) || 
             (m.senderId === otherUserId && m.recipientId === currentUserId))
    );
    setMockData('dt_chat_messages', filteredMessages);

    return { success: true };
  }
};

export const requestService = {
  getRequests: async (currentUserId) => {
    if (await isBackendReachable()) {
      try {
        const response = await apiClient.get('/requests');
        return response.data;
      } catch (err) {
        console.warn('[API] Real requests get failed. Falling back to mock.', err);
        return mockConnectionsAndRequests.getRequests(currentUserId);
      }
    } else {
      return mockConnectionsAndRequests.getRequests(currentUserId);
    }
  }
};

export const projectService = {
  getProjectsByOwner: async (ownerId) => {
    if (await isBackendReachable()) {
      try {
        const response = await apiClient.get(`/projects/owner/${ownerId}`);
        return response.data;
      } catch (err) {
        console.warn('[API] Real project get failed. Falling back to mock.', err);
        return mockProjectService.getProjectsByOwner(ownerId);
      }
    } else {
      return mockProjectService.getProjectsByOwner(ownerId);
    }
  },

  addProject: async (projectData) => {
    if (await isBackendReachable()) {
      try {
        const response = await apiClient.post('/projects', projectData);
        // Sync to mock database to keep mock consistent if needed
        const mockProjects = getMockData('dt_projects');
        mockProjects.push(response.data);
        setMockData('dt_projects', mockProjects);
        return response.data;
      } catch (err) {
        console.error('[API] Real project save failed. Falling back to mock.', err);
        return mockProjectService.addProject(projectData);
      }
    } else {
      return mockProjectService.addProject(projectData);
    }
  },

  deleteProject: async (projectId) => {
    return mockProjectService.deleteProject(projectId);
  }
};

export const chatService = {
  getChatHistory: async (otherUserId) => {
    const currentUserJson = localStorage.getItem('dt_current_user');
    const currentUser = currentUserJson ? JSON.parse(currentUserJson) : null;
    const currentUserId = currentUser ? currentUser.id : 'current-user-id';

    if (await isBackendReachable()) {
      try {
        const response = await apiClient.get(`/chat/messages/${otherUserId}`);
        return response.data;
      } catch (err) {
        console.warn('[API] Real chat history fetch failed. Falling back to mock.', err);
        return mockChatService.getChatHistory(currentUserId, otherUserId);
      }
    } else {
      return mockChatService.getChatHistory(currentUserId, otherUserId);
    }
  },

  sendMockMessage: async (recipientId, text) => {
    const currentUserJson = localStorage.getItem('dt_current_user');
    const currentUser = currentUserJson ? JSON.parse(currentUserJson) : null;
    const currentUserId = currentUser ? currentUser.id : 'current-user-id';
    return mockChatService.saveMessage(currentUserId, recipientId, text);
  }
};

export { isBackendReachable };


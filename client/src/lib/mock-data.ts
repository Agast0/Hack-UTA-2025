import { Team, AgentRun, BugFinding, User } from '@/types/bug';
import { getRoastMessage } from './roast';

export const mockUser: User = {
  id: 'user-1',
  email: 'john.doe@bugzooka.com',
  name: 'John Doe',
  avatar: 'https://github.com/shadcn.png',
};

export const mockUsers: User[] = [
  {
    id: 'user-1',
    email: 'john.doe@bugzooka.com',
    name: 'John Doe',
    avatar: 'https://github.com/shadcn.png',
  },
  {
    id: 'user-2',
    email: 'jane.smith@bugzooka.com',
    name: 'Jane Smith',
    avatar: 'https://github.com/jane.png',
  },
  {
    id: 'user-3',
    email: 'mike.wilson@bugzooka.com',
    name: 'Mike Wilson',
    avatar: 'https://github.com/mike.png',
  },
  {
    id: 'user-4',
    email: 'sarah.jones@bugzooka.com',
    name: 'Sarah Jones',
    avatar: 'https://github.com/sarah.png',
  },
  {
    id: 'user-5',
    email: 'alex.brown@bugzooka.com',
    name: 'Alex Brown',
    avatar: 'https://github.com/alex.png',
  },
  {
    id: 'user-6',
    email: 'emma.davis@bugzooka.com',
    name: 'Emma Davis',
    avatar: 'https://github.com/emma.png',
  },
];

export const mockTeams: Team[] = [
  {
    id: 'team-1',
    name: 'Security Squad',
    description: 'Our elite security testing team',
    createdAt: new Date('2024-01-15'),
    memberCount: 3,
    members: [mockUsers[0], mockUsers[1], mockUsers[2]],
  },
  {
    id: 'team-2',
    name: 'Bug Hunters',
    description: 'Specialized in web application testing',
    createdAt: new Date('2024-02-01'),
    memberCount: 2,
    members: [mockUsers[3], mockUsers[4]],
  },
  {
    id: 'team-3',
    name: 'QA Masters',
    description: 'Comprehensive quality assurance',
    createdAt: new Date('2024-02-15'),
    memberCount: 1,
    members: [mockUsers[5]],
  },
];

export const mockBugFindings: BugFinding[] = [
  {
    id: 'bug-1',
    title: 'SQL Injection Vulnerability',
    description: 'The login form is vulnerable to SQL injection attacks through the username field.',
    roast: getRoastMessage('critical'),
    reproduction_steps: [
      {
        step_number: 1,
        text: 'Navigate to the login page',
        image_url: 'https://via.placeholder.com/400x300/ff0000/ffffff?text=Step+1',
      },
      {
        step_number: 2,
        text: 'Enter "admin\' OR \'1\'=\'1" in the username field',
        image_url: 'https://via.placeholder.com/400x300/ff0000/ffffff?text=Step+2',
      },
      {
        step_number: 3,
        text: 'Enter any password',
        image_url: 'https://via.placeholder.com/400x300/ff0000/ffffff?text=Step+3',
      },
      {
        step_number: 4,
        text: 'Click login',
        image_url: 'https://via.placeholder.com/400x300/ff0000/ffffff?text=Step+4',
      },
    ],
    status: 'pending',
    isEditing: false,
  },
  {
    id: 'bug-2',
    title: 'XSS in Search Function',
    description: 'The search functionality is vulnerable to cross-site scripting attacks.',
    roast: 'This search is so vulnerable, it might as well be a public bulletin board. Anyone can post whatever they want, including malicious scripts. It\'s like having a security guard who just waves everyone through with a smile.',
    reproduction_steps: [
      {
        step_number: 1,
        text: 'Navigate to the search page',
        image_url: 'https://via.placeholder.com/400x300/ff8800/ffffff?text=Step+1',
      },
      {
        step_number: 2,
        text: 'Enter "<script>alert(\\\'XSS\\\')</script>" in the search field',
        image_url: 'https://via.placeholder.com/400x300/ff8800/ffffff?text=Step+2',
      },
      {
        step_number: 3,
        text: 'Click search',
        image_url: 'https://via.placeholder.com/400x300/ff8800/ffffff?text=Step+3',
      },
      {
        step_number: 4,
        text: 'Observe the alert popup',
        image_url: 'https://via.placeholder.com/400x300/ff8800/ffffff?text=Step+4',
      },
    ],
    status: 'confirmed',
    isEditing: false,
  },
  {
    id: 'bug-3',
    title: 'Missing CSRF Protection',
    description: 'Forms are missing CSRF tokens, making them vulnerable to cross-site request forgery.',
    roast: 'These forms are so trusting, they\'d accept a request from anyone. It\'s like having a bank that doesn\'t verify your identity - just walk in and take whatever you want!',
    reproduction_steps: [
      {
        step_number: 1,
        text: 'Login to the application',
        image_url: 'https://via.placeholder.com/400x300/ffff00/000000?text=Step+1',
      },
      {
        step_number: 2,
        text: 'Open browser developer tools',
        image_url: 'https://via.placeholder.com/400x300/ffff00/000000?text=Step+2',
      },
      {
        step_number: 3,
        text: 'Inspect the form elements',
        image_url: 'https://via.placeholder.com/400x300/ffff00/000000?text=Step+3',
      },
      {
        step_number: 4,
        text: 'Notice the absence of CSRF tokens',
        image_url: 'https://via.placeholder.com/400x300/ffff00/000000?text=Step+4',
      },
    ],
    status: 'confirmed',
    isEditing: false,
  },
  {
    id: 'bug-4',
    title: 'Weak Password Policy',
    description: 'The application accepts weak passwords without proper validation.',
    roast: 'This password policy is so weak, it\'s practically non-existent. "123" is considered a strong password here. It\'s like having a security system that accepts "password" as the master key.',
    reproduction_steps: [
      {
        step_number: 1,
        text: 'Navigate to the registration page',
        image_url: 'https://via.placeholder.com/400x300/00ff00/000000?text=Step+1',
      },
      {
        step_number: 2,
        text: 'Enter "123" as the password',
        image_url: 'https://via.placeholder.com/400x300/00ff00/000000?text=Step+2',
      },
      {
        step_number: 3,
        text: 'Submit the form',
        image_url: 'https://via.placeholder.com/400x300/00ff00/000000?text=Step+3',
      },
      {
        step_number: 4,
        text: 'Notice the weak password is accepted',
        image_url: 'https://via.placeholder.com/400x300/00ff00/000000?text=Step+4',
      },
    ],
    status: 'confirmed',
    isEditing: false,
  },
  {
    id: 'bug-5',
    title: 'SQL Injection in User Profile',
    description: 'The user profile update functionality is vulnerable to SQL injection attacks.',
    roast: 'This profile update is so vulnerable, it\'s like having a database that accepts any SQL command. "UPDATE users SET admin=1" would probably work here. It\'s like giving everyone the keys to the database kingdom.',
    reproduction_steps: [
      {
        step_number: 1,
        text: 'Login to the application',
        image_url: 'https://via.placeholder.com/400x300/ff0000/ffffff?text=Step+1',
      },
      {
        step_number: 2,
        text: 'Navigate to profile settings',
        image_url: 'https://via.placeholder.com/400x300/ff0000/ffffff?text=Step+2',
      },
      {
        step_number: 3,
        text: 'Enter "admin\'; DROP TABLE users; --" in the name field',
        image_url: 'https://via.placeholder.com/400x300/ff0000/ffffff?text=Step+3',
      },
      {
        step_number: 4,
        text: 'Submit the form and observe the error',
        image_url: 'https://via.placeholder.com/400x300/ff0000/ffffff?text=Step+4',
      },
    ],
    status: 'confirmed',
    isEditing: false,
  },
  {
    id: 'bug-6',
    title: 'Session Fixation Vulnerability',
    description: 'The application does not regenerate session IDs after login, making it vulnerable to session fixation attacks.',
    roast: 'This session management is so predictable, it\'s like having a lock that never changes its combination. Once someone knows your session ID, they can use it forever. It\'s like having a house key that never expires.',
    reproduction_steps: [
      {
        step_number: 1,
        text: 'Open the application in a browser',
        image_url: 'https://via.placeholder.com/400x300/800080/ffffff?text=Step+1',
      },
      {
        step_number: 2,
        text: 'Note the current session ID from cookies',
        image_url: 'https://via.placeholder.com/400x300/800080/ffffff?text=Step+2',
      },
      {
        step_number: 3,
        text: 'Login to the application',
        image_url: 'https://via.placeholder.com/400x300/800080/ffffff?text=Step+3',
      },
      {
        step_number: 4,
        text: 'Check if the session ID remains the same',
        image_url: 'https://via.placeholder.com/400x300/800080/ffffff?text=Step+4',
      },
    ],
    status: 'confirmed',
    isEditing: false,
  },
];

export const mockAgentRuns: AgentRun[] = [
  {
    id: 'run-1',
    teamId: 'team-1',
    targetUrl: 'https://example.com',
    createdBy: 'user-1',
    settings: {
      includeSubdomains: false,
      customHeaders: {
        'User-Agent': 'BugZooka/1.0',
      },
    },
    status: 'completed',
    bugFindings: mockBugFindings.slice(0, 2),
    createdAt: new Date('2024-03-01T09:00:00Z'),
    completedAt: new Date('2024-03-01T10:45:00Z'),
    createdByName: mockUser.name,
    createdByEmail: mockUser.email,
  },
  {
    id: 'run-2',
    teamId: 'team-1',
    targetUrl: 'https://demo.app.com',
    createdBy: 'user-2',
    settings: {
      includeSubdomains: true,
    },
    status: 'completed',
    bugFindings: mockBugFindings.slice(2),
    createdAt: new Date('2024-03-02T14:00:00Z'),
    completedAt: new Date('2024-03-02T15:30:00Z'),
    createdByName: 'Jane Member',
    createdByEmail: 'jane.member@bugzooka.com',
  },
  {
    id: 'run-3',
    teamId: 'team-2',
    targetUrl: 'https://test-site.org',
    createdBy: 'user-3',
    settings: {
      includeSubdomains: false,
    },
    status: 'running',
    bugFindings: [],
    createdAt: new Date('2024-03-03T08:00:00Z'),
    createdByName: 'Sam Supervisor',
    createdByEmail: 'sam.supervisor@bugzooka.com',
  },
];

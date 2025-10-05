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
    stepsToReproduce: [
      'Navigate to the login page',
      'Enter "admin\' OR \'1\'=\'1" in the username field',
      'Enter any password',
      'Click login',
    ],
    severity: 'critical',
    roastMessage: getRoastMessage('critical'),
    screenshotUrls: [
      'https://via.placeholder.com/400x300/ff0000/ffffff?text=SQL+Injection',
      'https://via.placeholder.com/400x300/ff0000/ffffff?text=Database+Access',
    ],
    createdAt: new Date('2024-03-01T10:30:00Z'),
    status: 'pending',
  },
  {
    id: 'bug-2',
    title: 'XSS in Search Function',
    description: 'The search functionality is vulnerable to cross-site scripting attacks.',
    stepsToReproduce: [
      'Navigate to the search page',
      'Enter "<script>alert(\\\'XSS\\\')</script>" in the search field',
      'Click search',
      'Observe the alert popup',
    ],
    severity: 'high',
    roastMessage: getRoastMessage('high'),
    screenshotUrls: [
      'https://via.placeholder.com/400x300/ff8800/ffffff?text=XSS+Alert',
    ],
    createdAt: new Date('2024-03-01T11:15:00Z'),
    status: 'pending',
  },
  {
    id: 'bug-3',
    title: 'Missing CSRF Protection',
    description: 'Forms are missing CSRF tokens, making them vulnerable to cross-site request forgery.',
    stepsToReproduce: [
      'Login to the application',
      'Open browser developer tools',
      'Inspect the form elements',
      'Notice the absence of CSRF tokens',
    ],
    severity: 'medium',
    roastMessage: getRoastMessage('medium'),
    screenshotUrls: [
      'https://via.placeholder.com/400x300/ffff00/000000?text=No+CSRF+Token',
    ],
    createdAt: new Date('2024-03-01T12:00:00Z'),
    status: 'pending',
  },
  {
    id: 'bug-4',
    title: 'Weak Password Policy',
    description: 'The application accepts weak passwords without proper validation.',
    stepsToReproduce: [
      'Navigate to the registration page',
      'Enter "123" as the password',
      'Submit the form',
      'Notice the weak password is accepted',
    ],
    severity: 'low',
    roastMessage: getRoastMessage('low'),
    screenshotUrls: [
      'https://via.placeholder.com/400x300/00ff00/000000?text=Weak+Password',
    ],
    createdAt: new Date('2024-03-01T12:30:00Z'),
    status: 'pending',
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
  },
];

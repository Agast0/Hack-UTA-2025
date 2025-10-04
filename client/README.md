# BugZooka - AI-Powered Bug Hunting Platform

A production-ready Next.js application for automated security testing and bug hunting, built with TypeScript, Tailwind CSS, and shadcn/ui.

## Features

- 🔐 **Fake Authentication** - Simple sign-in with any credentials
- 👥 **Team Management** - Create and manage security teams
- 🐛 **Automated Audits** - Run AI-powered security scans
- 📊 **Bug Findings** - Detailed vulnerability reports with roast messages
- 📱 **Responsive Design** - Works on all devices
- 🎨 **Modern UI** - Built with shadcn/ui components

## Tech Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui
- **State Management**: Zustand
- **Data Validation**: Zod
- **Icons**: Lucide React
- **Data Tables**: TanStack Table

## Quick Start

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Run the development server**:
   ```bash
   npm run dev
   ```

3. **Open your browser** and navigate to `http://localhost:3000`

## App Flow

1. **Sign In** - Use any email and password to authenticate
2. **Select Team** - Choose from existing teams or create a new one
3. **Create Audit** - Start a new security audit with target URL
4. **View Results** - Explore bug findings with detailed reports

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── dashboard/         # Dashboard page
│   ├── signin/           # Sign-in page
│   ├── layout.tsx        # Root layout
│   └── providers.tsx     # Global providers
├── components/           # Reusable components
│   ├── ui/               # shadcn/ui components
│   ├── layout/           # Layout components
│   └── dashboard/        # Dashboard-specific components
├── lib/                  # Utilities and stores
│   ├── store.ts         # Zustand stores
│   ├── mock-data.ts     # Mock data
│   └── roast.ts         # Roast messages
└── types/               # TypeScript type definitions
    └── bug.ts           # Data models with Zod schemas
```

## Key Components

- **Header** - App navigation with user menu
- **Sidebar** - Team selection and management
- **Main Content** - Audit creation and results
- **Bug Findings Modal** - Detailed vulnerability reports
- **Data Table** - Sortable and filterable audit results

## Mock Data

The app includes comprehensive mock data:
- 3 pre-configured teams
- Multiple audit runs with different statuses
- Detailed bug findings with severity levels
- Roast messages for each vulnerability
- Screenshot placeholders

## Development

- **Type Safety**: Full TypeScript support with Zod validation
- **State Management**: Zustand for client state
- **UI Components**: shadcn/ui for consistent design
- **Responsive**: Mobile-first design approach
- **Accessibility**: Built-in accessibility features

## Production Ready

- ✅ TypeScript for type safety
- ✅ Responsive design
- ✅ Modern UI components
- ✅ State persistence
- ✅ Error handling
- ✅ Loading states
- ✅ Form validation

## Demo Credentials

Use any email and password combination to sign in. The authentication is fake and accepts any credentials for demo purposes.

---

Built with ❤️ for HackUTA 2025
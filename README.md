# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/7fa043c8-3d24-46da-855a-144f9778f2fd

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/7fa043c8-3d24-46da-855a-144f9778f2fd) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## Environment Variables

This project uses several environment variables for configuration. These are defined in the `.env` file:

### Supabase Configuration

The following environment variables configure your Supabase backend connection:

- **`VITE_SUPABASE_PROJECT_ID`**: Your unique Supabase project identifier (`ntvpatckjaqkfozizszm`)
  - This ID identifies your specific Supabase project instance
  - Used internally for routing requests to the correct project

- **`VITE_SUPABASE_URL`**: The full URL to your Supabase project (`https://ntvpatckjaqkfozizszm.supabase.co`)
  - This is the API endpoint your frontend uses to communicate with Supabase
  - Combines your project ID with the Supabase domain

- **`VITE_SUPABASE_PUBLISHABLE_KEY`**: The public/anonymous key for frontend access
  - This key is safe to expose in your frontend code
  - Provides read-only access and enforces Row Level Security (RLS) policies
  - Cannot be used to bypass database security rules

### Application Configuration

- **`VITE_APP_PASSWORD`**: Password protection for the application (`Zaza2026`)
  - Controls access to the entire application
  - Set in the PasswordProtection component

### Security Notes

- All `VITE_*` variables are exposed to the frontend and are publicly visible
- The Supabase publishable key is designed to be public and cannot compromise your database
- Actual data security is enforced through Supabase's Row Level Security (RLS) policies
- Sensitive operations require additional authentication through Supabase's auth system

### Backend Services

This project uses Supabase as its backend-as-a-service, providing:
- **Database**: PostgreSQL with Row Level Security
- **Authentication**: User management and session handling  
- **Real-time**: Live data synchronization
- **Edge Functions**: Server-side logic and API endpoints
- **Storage**: File uploads and management

## Project Portability & Migration

### Running Without Lovable

If Lovable becomes unavailable, your project remains fully functional and portable. Since your code is standard web technology and synced to GitHub, you can run it independently.

#### Your Code is Portable

The generated code uses standard technologies:
- React + TypeScript
- Vite (build tool)
- Tailwind CSS
- Standard npm packages

#### Migration Steps

**1. Clone and Run Locally**
```bash
git clone your-repo-url
cd your-project
npm install
npm run dev
```

**2. Deploy to Any Hosting Provider**
You can deploy to various platforms:
- **Vercel** (recommended for React apps)
- **Netlify** 
- **AWS S3 + CloudFront**
- **GitHub Pages**
- **Your own server**

**3. Keep Your Supabase Backend**
Your Supabase project is completely independent of Lovable:
- Database, authentication, and all data remain in Supabase
- Environment variables already point directly to Supabase
- No backend changes needed

**4. Build for Production**
```bash
npm run build  # Creates production files in 'dist' folder
# Deploy the 'dist' folder to your hosting provider
```

#### What Remains Functional

- ✅ Your Supabase database and all data
- ✅ All environment variables work unchanged
- ✅ Authentication system continues working
- ✅ All application functionality remains identical

#### What You Lose

- ❌ Lovable's visual editor and AI assistance
- ❌ Automatic deployments from Lovable
- ❌ The live preview development environment

#### Quick Migration Example (Vercel)

1. Connect your GitHub repo to Vercel
2. Add your environment variables in Vercel's dashboard
3. Deploy - Vercel automatically detects Vite projects

Your website will be live and fully functional within minutes.

**Bottom Line**: Lovable generates standard, portable code. Your backend (Supabase) is independent, so you lose only the development tools while keeping 100% of functionality and data.

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/7fa043c8-3d24-46da-855a-144f9778f2fd) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/tips-tricks/custom-domain#step-by-step-guide)

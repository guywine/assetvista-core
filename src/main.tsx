// Entry point for the React application.
// Uses the React 18 createRoot API to mount the App component into the DOM.
import { createRoot } from 'react-dom/client'

// Root application component (the top-level React component)
import App from './App.tsx'

// Global styles for the app (imported so the bundler includes them)
import './index.css'

// Find the DOM node with id "root" and mount the React app there.
// The `!` non-null assertion tells TypeScript we expect the element to exist at runtime.
// createRoot is React 18's API for creating a concurrent root; render mounts <App />.
createRoot(document.getElementById("root")!).render(<App />);

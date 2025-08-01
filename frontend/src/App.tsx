import { useState, useEffect } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LoginScreen } from "./components/LoginScreen";
import { ChatLayout } from "./components/ChatLayout";
import { auth } from "./firebase";
import { onAuthStateChanged } from "firebase/auth";
import { Toaster } from 'react-hot-toast';


const queryClient = new QueryClient();

interface User {
  name: string;
  email: string;
  uid: string;
   photoURL?: string;
}

const App = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true); // optional: loading screen

  // ✅ Check if user is already logged in
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        const { displayName, email, uid } = firebaseUser;
        setUser({
          name: displayName || email?.split("@")[0] || "User",
          email: email || "",
          uid,
        });
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe(); // cleanup
  }, []);

  const handleLogin = (userData: User) => {
    setUser(userData);
  };

  const handleLogout = () => {
    setUser(null);
    auth.signOut();
  };

  if (loading) {
    return <div className="text-center mt-10 text-foreground">Loading...</div>;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster position="top-right" reverseOrder={false}  toastOptions={{
    duration: 4000,
    style: {
      background: '#222222',
      color: '#fff',
    },
  }}/>
        <div className="dark">
          {user ? (
            <ChatLayout user={user} onLogout={handleLogout} />
          ) : (
            <LoginScreen onLogin={handleLogin} />
          )}
        </div>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
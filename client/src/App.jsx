import { useState } from "react";
import Signup from "./components/Signup";
import Login from "./components/Login";

function App() {
  // Can be 'home', 'login', or 'signup'
  const [currentView, setCurrentView] = useState("home");

  return (
    <div className="app-container">
      {/* home page*/}
      {currentView === "home" && (
        <div className="home-page">
          <h1>Welcome</h1>
          <p>Please choose an option to continue:</p>
          <button onClick={() => setCurrentView("login")}>Log In</button>
          <button onClick={() => setCurrentView("signup")}>Sign Up</button>
        </div>
      )}

      {/* login page */}
      {currentView === "login" && (
        <div className="view-container">
          <button onClick={() => setCurrentView("home")}>← Back to Home</button>
          <Login />
        </div>
      )}

      {/* sign up page */}
      {currentView === "signup" && (
        <div className="view-container">
          <button onClick={() => setCurrentView("home")}>← Back to Home</button>
          <Signup />
        </div>
      )}
    </div>
  );
}

export default App;
import { useState } from "react";
import Signup from "./components/Signup";
import Login from "./components/Login";
import CreateProject from "./components/CreateProject"; 

function App() {
  // switches between login, signup apge
  const [currentView, setCurrentView] = useState("home");
  const [loggedIn, setLoggedIn] = useState(false);
 
  function handleLogin() {
    setLoggedIn(true);
    setCurrentView("createProject");
  }
 
  function handleLogout() {
    setLoggedIn(false);
    setCurrentView("home");
  }

  return (
    <div className="app-container">
      {/* navigation bar after login */}
      {loggedIn && (
        <nav>
          <button onClick={() => setCurrentView("createProject")}>Create Project</button>
          <button onClick={handleLogout}>Log Out</button>
        </nav>
      )} 

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
          <Login onLogin={handleLogin} />
        </div>
      )}

      {/* sign up page */}
      {currentView === "signup" && (
        <div className="view-container">
          <button onClick={() => setCurrentView("home")}>← Back to Home</button>
          <Signup />
        </div>
      )}

      {/* create project page */}
      {loggedIn && currentView === "createProject" && (
        <div className="view-container">
          <CreateProject />
        </div>
      )}

    </div>
  );
}

export default App;
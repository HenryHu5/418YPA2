import { useState } from "react";

function Signup() {
  const [fName, setFName] = useState("");
  const [lName, setLName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();

    try {
      // send all required fields database
      const response = await fetch("http://localhost:9000/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          f_name: fName,
          l_name: lName,
          username,
          password,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(data.message || "Signup successful!");
        // clear fields once signed up
        setFName("");
        setLName("");
        setUsername("");
        setPassword("");
      } else {
        setMessage(data.message || "Signup failed.");
      }
    } catch (error) {
      setMessage("Could not connect to the server.");
    }
  }

  return (
    <div>
      <h2>Sign Up</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <label>First Name: </label>
          <input
            type="text"
            value={fName}
            onChange={(e) => setFName(e.target.value)}
            required
          />
        </div>

        <div>
          <label>Last Name: </label>
          <input
            type="text"
            value={lName}
            onChange={(e) => setLName(e.target.value)}
            required
          />
        </div>

        <div>
          <label>Username: </label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </div>

        <div>
          <label>Password: </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <button type="submit">Sign Up</button>
      </form>

      {message && <p>{message}</p>}
    </div>
  );
}

export default Signup;
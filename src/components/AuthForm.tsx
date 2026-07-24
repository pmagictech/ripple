import { useState, type SubmitEventHandler } from "react";
import { useStore } from "../store";

type AuthData = {
  success: boolean;
  error?: string;
  id?: number;
  username?: string;
};

export default function AuthForm() {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const login = useStore((s) => s.login);

  const submit: SubmitEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault();
    const url = isLogin ? "login.php" : "signup.php";

    const data: AuthData = await fetch(
      `http://localhost/websockets/backend/${url}`,
      {
        method: "POST",
        body: JSON.stringify({ username, password }),
      },
    ).then((res) => res.json());

    if (data.success && data.id && data.username) {
      login({ id: data.id, username: data.username });
    } else {
      setError(data.error || "Authentication failed. Please try again.");
    }
  };

  return (
    <div className="flex h-screen items-center justify-center bg-whatsapp">
      <form
        className="w-sm rounded-2xl bg-white p-8 shadow-lg"
        onSubmit={submit}
      >
        <div className="mb-5 text-center text-2xl font-bold">
          {isLogin ? "Login" : "Sign Up"}
        </div>

        {error && (
          <div className="mb-4 rounded-md bg-red-100 p-2 text-center text-sm text-red-700">
            {error}
          </div>
        )}
        <input
          className="mb-4 w-full rounded-full border border-gray-300 px-4 py-2 outline-none focus:border-green-500 focus:ring focus:ring-green-200"
          placeholder="Username"
          name="username"
          onChange={(e) => setUsername(e.target.value)}
        />
        <input
          type="password"
          name="password"
          className="mb-2 w-full rounded-full border border-gray-300 px-4 py-2 outline-none focus:border-green-500 focus:ring focus:ring-green-200"
          placeholder="Password"
          onChange={(e) => setPassword(e.target.value)}
        />

        <button className="my-5 w-full rounded-md bg-green-600 py-2 font-bold text-white hover:bg-green-700">
          {isLogin ? "Login" : "Sign Up"}
        </button>

        <div
          className="cursor-pointer text-center text-sm text-green-600 hover:underline"
          onClick={() => setIsLogin(!isLogin)}
        >
          {isLogin
            ? "Don't have an account? Sign Up"
            : "Already have an account? Login"}
        </div>
      </form>
    </div>
  );
}

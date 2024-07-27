import Axios from "../axios";

export type Role = "client" | "dispatcher" | "driver" | "admin";

export type User = {
  user_id: number;
  user_name: string;
  session_token: string;
} & (
  | {
      role: "dispatcher";
      dispatcher_id: number;
      area_id: number;
    }
  | {
      role: "client";
    }
  | {
      role: "driver";
      driver_id: number;
    }
  | {
      role: "admin";
    }
);

// 非同期処理 Promise all() を使わない
const AxiosInstance = Axios.getInstance();

export const login = async (username: string, password: string) => {
  try {
    // ログインリクエストとセッション情報の保存を同時に行う
    // 非同期処理 Promise all() を使わない
    const [{ data }] = await Promise.all([
      AxiosInstance.post<User>("/api/login", {
        username,
        password
      }),
      AxiosInstance.post("/session", { username, password })
    ]);

    return data;
  } catch (error) {
    console.error("Login failed:", error);
    throw new Error("Login failed");
  }
};

export const logout = async (session_token: string | null) => {
  try {
    if (session_token) {
      await AxiosInstance.post(
        "/api/logout",
        { session_token },
        { headers: { Authorization: `Bearer ${session_token}` } }
      );
    }
    await AxiosInstance.delete("/session");
  } catch (error) {
    console.error("Logout failed:", error);
    throw new Error("Logout failed");
  }
};

let sessionCache: User | undefined;

export const getSession = async () => {
  if (sessionCache) {
    return sessionCache;
  }

  try {
    const response = await AxiosInstance.get<User>("/session");
    sessionCache = response.data;
    return sessionCache;
  } catch (error) {
    console.error("An error occurred while fetching the session:", error);
    return undefined;
  }
};

/* // 非同期処理 Promise all() を使う
const AxiosInstance = Axios.getInstance();
// Promise.all() は、複数の Promise を受け取り、それらが全て完了したときに新しい Promise を返す
export const login = async (username: string, password: string) => {
  const { data } = await AxiosInstance.post<User>("/api/login", {
    username,
    password
  });

  // セッション情報をサーバーサイドに保存
  await Promise.all([AxiosInstance.post("/session", data)]);

  return data;
};

export const logout = async (session_token: string | null) => {
  if (session_token) {
    await Promise.all([
      AxiosInstance.post("/api/logout", { session_token }, { headers: { Authorization: session_token } }),
      AxiosInstance.delete("/session")
    ]);
  } else {
    await AxiosInstance.delete("/session");
  }
};

let sessionCache: User | undefined;

export const getSession = async () => {
  if (sessionCache) {
    return sessionCache;
  }

  try {
    const response = await AxiosInstance.get<User>("/session");
    sessionCache = response.data;
    return sessionCache;
  } catch (error: any) {
    console.error("An error occurred while fetching the session:", error);
    return undefined;
  }
};
*/

// // Original
// const AxiosInstance = Axios.getInstance();

// export const login = async (username: string, password: string) => {
//   const { data } = await AxiosInstance.post<User>("/api/login", {
//     username,
//     password
//   });

//   // セッション情報をサーバーサイドに保存
//   await AxiosInstance.post("/session", data);

//   return data;
// };

// export const logout = async (session_token: string | null) => {
//   if (session_token) {
//     await AxiosInstance.post("/api/logout", { session_token }, { headers: { Authorization: session_token } });
//   }
//   await AxiosInstance.delete("/session");
// };

// export const getSession = async () => {
//   try {
//     const response = await AxiosInstance.get<User>("/session");
//     return response.data;
//   } catch (error: any) {
//     console.error("An error occurred while fetching the session:", error);
//     return undefined;
//   }
// };

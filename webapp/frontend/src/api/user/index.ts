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

const AxiosInstance = Axios.getInstance();

export const login = async (username: string, password: string) => {
  const { data } = await AxiosInstance.post<User>("/api/login", {
    username,
    password
  });

  // セッション情報をサーバーサイドに保存
  await AxiosInstance.post("/session", data);

  return data;
};

export const logout = async (session_token: string | null) => {
  if (session_token) {
    await AxiosInstance.post("/api/logout", { session_token }, { headers: { Authorization: session_token } });
  }
  await AxiosInstance.delete("/session");
};

export const getSession = async () => {
  try {
    const response = await AxiosInstance.get<User>("/session");
    return response.data;
  } catch (error: any) {
    console.error("An error occurred while fetching the session:", error);
    return undefined;
  }
};

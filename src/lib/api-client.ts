import axios from "axios";

export class ApiClientError extends Error {
    public readonly statusCode: number;

    constructor(statusCode: number, message: string) {
        super(message);

        this.name = "ApiClientError";
        this.statusCode = statusCode;
    }
}

export const api = axios.create({
    baseURL: "/api",
    timeout: 10_000,
    headers: {
        "Content-Type": "application/json",
    },
});

api.interceptors.response.use(
    (response) => response,

    (error) => {
        if (axios.isAxiosError(error)) {
            const statusCode = error.response?.status ?? 500;

            const message =
                error.response?.data?.error ??
                error.response?.data?.message ??
                error.message ??
                "Something went wrong";

            return Promise.reject(
                new ApiClientError(statusCode, message)
            );
        }

        return Promise.reject(error);
    }
);
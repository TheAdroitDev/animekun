export type ApiResponseType<T> =
    | {
        success: true;
        message?: string;
        data: T;
    }
    | {
        success: false;
        message?: string;
        error: string;
    };
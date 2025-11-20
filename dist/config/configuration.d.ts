declare const _default: () => {
    port: number;
    nodeEnv: string;
    database: {
        host: string;
        port: number;
        username: string;
        password: string;
        database: string;
    };
    jwt: {
        secret: string;
        refreshSecret: string;
        expiresIn: number;
        refreshExpiresIn: number;
    };
    corporateEmailDomain: string;
    throttle: {
        ttl: number;
        limit: number;
    };
};
export default _default;

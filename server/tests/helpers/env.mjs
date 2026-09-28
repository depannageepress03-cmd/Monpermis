// QA — variables de test (jamais la prod). La base Mongo est fournie
// par mongodb-memory-server (voir mongo.mjs) et écrase MONGODB_URI.
export const QA_PORT = Number(process.env.QA_PORT) || 5011
export const QA_JWT_SECRET = 'qa-jwt-secret-min-32-chars-0123456789abcdef'
export const QA_WEBHOOK_SECRET = 'whsec_qa_test_secret_0123456789'
export const QA_CRON_KEY = 'qa-cron-key'

export function qaEnv(mongoUri) {
  return {
    PATH: process.env.PATH,
    HOME: process.env.HOME,
    PORT: String(QA_PORT),
    NODE_ENV: 'test',
    MONGODB_URI: mongoUri,
    JWT_SECRET: QA_JWT_SECRET,
    CLIENT_URL: 'http://localhost:5174',
    ADMIN_CLIENT_URL: 'http://localhost:5173',
    MONITEUR_CLIENT_URL: 'http://localhost:5176',
    ALLOWED_ORIGINS: 'http://localhost:5174,http://localhost:5173',
    API_PUBLIC_URL: `http://localhost:${QA_PORT}`,
    FEDAPAY_PUBLIC_KEY: 'pk_sandbox_qa_fake',
    FEDAPAY_SECRET_KEY: 'sk_sandbox_qa_fake',
    FEDAPAY_ENVIRONMENT: 'sandbox',
    FEDAPAY_WEBHOOK_SECRET: QA_WEBHOOK_SECRET,
    FEDAPAY_CALLBACK_URL: `http://localhost:${QA_PORT}/abonnement`,
    ALLOW_ADMIN_REGISTRATION: 'false',
    CRON_API_KEY: QA_CRON_KEY,
    SMTP_HOST: '127.0.0.1',
    SMTP_PORT: '1025',
    SMTP_USER: 'qa',
    SMTP_PASS: 'qa',
    SMTP_FROM: 'qa@test.local',
    ADMIN_PHONE: '0199000001',
    ADMIN_PASSWORD: 'QaAdmin1234',
    ADMIN_FULL_NAME: 'QA Admin',
    MOBILE_SCHEME: 'monpermis-qa',
    // Empêche dotenv de charger server/.env (prod) par-dessus.
    DOTENV_CONFIG_PATH: '/dev/null',
  }
}

import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    // هنا نقوم بربط رابط قاعدة البيانات من ملف الـ .env
    url: env('DATABASE_URL'),
  },
});

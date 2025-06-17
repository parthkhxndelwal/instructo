/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000",
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push({
        'mysql2': 'mysql2',
        'pg': 'pg',
        'pg-hstore': 'pg-hstore',
        'sqlite3': 'sqlite3',
        'tedious': 'tedious',
        'mariadb': 'mariadb'
      });
    }

    // Suppress the critical dependency warning from Sequelize
    config.module = config.module || {};
    config.module.exprContextCritical = false;
    
    // Alternatively, you can use this more specific approach:
    config.ignoreWarnings = [
      /Critical dependency: the request of a dependency is an expression/,
    ];

    return config;
  },
}

module.exports = nextConfig

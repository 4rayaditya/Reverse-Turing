/** @type {import('next').NextConfig} */
const path = require('path')

const nextConfig = {
  reactStrictMode: false, // Turn off strict mode for Three.js hot reloading mainly
  webpack: (config) => {
    // Ensure Node native optional deps are treated as externals
    config.externals.push({
      "utf-8-validate": "commonjs utf-8-validate",
      "bufferutil": "commonjs bufferutil"
    })

    // Add alias for `@` -> ./src so imports like '@/components/...' resolve
    config.resolve = config.resolve || {}
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      '@': path.resolve(__dirname, 'src')
    }

    return config
  },
}

module.exports = nextConfig

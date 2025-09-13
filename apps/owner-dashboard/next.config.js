/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: require('path').join(__dirname, '../../'),
  transpilePackages: ['@cafe/shared-types', '@cafe/ui-components', '@cafe/utils']
}

module.exports = nextConfig

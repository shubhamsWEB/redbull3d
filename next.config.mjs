/** @type {import('next').NextConfig} */
const nextConfig = {
    webpack: (config, { isServer }) => {
      // Add GLSL loader
      config.module.rules.push({
        test: /\.(glsl|vs|fs)$/,
        exclude: /node_modules/,
        use: 'raw-loader',
      });
  
      return config; // Ensure config is returned
    },
  };
  
  export default nextConfig;
  
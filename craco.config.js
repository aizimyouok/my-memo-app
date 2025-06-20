// craco.config.js

const webpack = require('webpack');

module.exports = {
  webpack: {
    configure: (webpackConfig, { env, paths }) => {
      // 'util' 모듈 폴리필 설정
      webpackConfig.resolve.fallback = {
        ...webpackConfig.resolve.fallback,
        "util": require.resolve("util/"),
        "http": require.resolve("stream-http"),
        "https": require.resolve("https-browserify"),
        "stream": require.resolve("stream-browserify"),
        "assert": require.resolve("assert/"),
        "url": require.resolve("url/"),
        "buffer": require.resolve("buffer/"),
        "process": require.resolve("process/browser")
      };

      // Buffer와 process 전역 폴리필 설정
        webpackConfig.plugins = (webpackConfig.plugins || []).concat([
        new webpack.ProvidePlugin({
          process: 'process/browser.js', // <--- .js 추가!
          Buffer: ['buffer', 'Buffer'],
        }),
      ]);
      
      return webpackConfig;
    },
  },
};
import express from 'express'
import historyApiFallback from 'connect-history-api-fallback'
import config from '../config'

const server = express()
const debug = require('debug')('app:server')
const paths = config.utils_paths

server.use(historyApiFallback({
  verbose : false
}))

// Serve app with Webpack if HMR is enabled
if (config.compiler_enable_hmr) {
  const webpack = require('webpack')
  const webpackConfig = require('../webpack')
  const compiler = webpack(webpackConfig)

  // dispatcher for cross domain
  // `.shouldnotpublic` is a module
  // that returns `login_name` and `password`
  server.use(require('./middlewares/dispatcher')(require('../../.shouldnotpublic')))

  server.use(require('./middlewares/webpack-dev')({
    compiler,
    publicPath: webpackConfig.output.publicPath
  }))
  server.use(require('./middlewares/webpack-hmr')({ compiler }))
} else {
  debug(
    'Application is being run outside of development mode. This starter kit ' +
    'does not provide any production-specific server functionality. To learn ' +
    'more about deployment strategies, check out the "deployment" section ' +
    'in the README.'
  )

  // Serving ~/dist by default. Ideally these files should be served by
  // the web server and not the app server, but this helps to demo the
  // server in production.
  server.use(express.static(paths.base(config.dir_dist)))
}

export default server

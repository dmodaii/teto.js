import axios from 'axios'

const debug = require('debug')('app:server:dispatcher')

const dispatcherMiddleware = options => {
  let cached = null

  const url = 'http://101uccenter.beta.web.sdp.101.com/v0.93'

  const { login_name, password } = options

  if (!login_name || !password) {
    throw new Error('need login_name and password')
  }

  const getBearerToken = () => {
    return new Promise((resolve, reject) => {
      if (cached) {
        return resolve(cached)
      }

      axios({
        url: url + '/bearer_tokens',
        data: {
          login_name: login_name,
          password: password
        },
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8'
        }
      }).then(({ data }) => {
        cached = {
          token: data
        }

        axios({
          url: url + '/users/' + data.user_id,
          method: 'GET',
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
            Authorization: 'Bearer "' + data.access_token + '"'
          }
        }).then(({ _data }) => {
          cached.user = _data
          resolve(cached)
        }, () => {
          reject((cached = null))
        })
      }, () => {
        reject((cached = null))
      })
    })
  }

  return (req, res, next) => {
    if (!/\/dispatcher\//.test(req.url) ||
      !req.headers.dispatcher) {
      return next()
    }

    // {
    //   "module": "microblog",
    //   "protocol": "http://",
    //   "host": "microblog.debug.web.nd",
    //   "ver": "v0.1",
    //   "api": "%2Ftimelines%2F%7Btimeline_name%7D",
    //   "vars": {
    //     "timeline_name": "square",
    //     "id": 0
    //   }
    // }

    getBearerToken().then(({ token, user }) => {
      const { dispatcher } = req.headers
      const { protocol, host, ver, vars } = JSON.parse(dispatcher)
      let { api } = JSON.parse(dispatcher)
      api = decodeURIComponent(api)

      if (vars) {
        Object.keys(vars).forEach(key => {
          api = api.replace(new RegExp('{' + key + '}', 'img'), vars[key])
        })
      }

      if (api.indexOf('?') !== -1) {
        api += '&orgId=' + user.org_exinfo.org_id +
          '&suid=' + token.user_id
      } else {
        api += '?orgId=' + user.org_exinfo.org_id +
          '&suid=' + token.user_id
      }

      const responder = ({ data, status }) => {
        res.status(status).json(data)
      }

      axios({
        url: protocol + host + '/' + ver + api,
        method: req.method,
        data: req.body,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          Authorization: 'Bearer "' + token.access_token + '"'
        }
      }).then(responder, responder)
    }, () => {
      console.log('ERROR')
    })
  }
}

export default options => {
  debug('Enable Dispatcher middleware.')

  return dispatcherMiddleware(options)
}

import Cors from 'cors'

class Lib {
  constructor() {
    this.cors = Cors({
      origin: '*',
      methods: ['GET', 'POST', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
    })

    this.midd = this.midd.bind(this)
  }

  rand() {
    return Math.random().toString(36).substr(2)
  }
  error(msg) {
    return { error: true, msg }
  }
  success(opts) {
    return { error: false, ...opts }
  }

  midd(req, res) {
    return new Promise((resolve, reject) => {
      const origin = req.headers.origin
      if (origin) {
        res.setHeader('Access-Control-Allow-Origin', origin)
        res.setHeader('Access-Control-Allow-Credentials', 'true')
      } else {
        res.setHeader('Access-Control-Allow-Origin', '*')
      }
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE')
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept')

      if (req.method === 'OPTIONS') {
        res.status(200).end()
        return resolve(true)
      }

      this.cors(req, res, (result) => {
        if (result instanceof Error) return reject(result)
        return resolve(false)
      })
    })
  }

  acum(a, query, field) {
    const x = Object.keys(query)[0]
    const y = Object.values(query)[0]

    return a
      .filter((i) => i[x] == y)
      .map((i) => i[field])
      .reduce((a, b) => a + b, 0)
  }

  ids(a) {
    return a.map((i) => i.userId)
  }
  _ids(a) {
    return a.map((i) => i.id)
  }
  parent_ids(a) {
    return a.map((i) => i.parentId)
  }

  map(a) {
    return new Map(a.map((i) => [i.id, i]))
  }
  _map(a) {
    return new Map(a.map((i) => [i.userId, i]))
  }

  model(obj, model) {
    let ret = {}

    for (let key in obj) if (model.includes(key)) ret[key] = obj[key]

    return ret
  }
  /**
   * @param {Date}  initialDate
   * @param {Date}  finalDate
   * @return {Number} Cantidad de días de diferencia
   */
  diff_between_dates(initialDate, finalDate) {
    var d1 = new Date(initialDate).getTime()
    var d2 = new Date(finalDate).getTime()
    var diff = (d2 - d1) / 86400000
    // return diff
    return Number.parseInt(diff)
  }
}

export default new Lib()

import db from '../../../components/db'
import lib from '../../../components/lib'

const { Product, User, Session, Affiliation, Activation } = db
const { midd, success, rand } = lib

const { Tree, Transaction, Closed } = db

let tree

const pays = [
  {
    name: 'PLATA',
    payed: false,
    value: 70,
  },
  {
    name: 'ORO',
    payed: false,
    value: 150,
  },
  {
    name: 'PLATINO',
    payed: false,
    value: 300,
  },
  {
    name: 'RUBI',
    payed: false,
    value: 700,
  },
  {
    name: 'ZAFIRO',
    payed: false,
    value: 1500,
  },
  {
    name: 'DIAMANTE',
    payed: false,
    value: 3000,
  },
  {
    name: 'EMBAJADOR ESTRELLA',
    payed: false,
    value: 5000,
  },
  {
    name: 'EMBAJADOR ELITE',
    payed: false,
    value: 10000,
  },
  {
    name: 'EMBAJADOR DUNAMIS',
    payed: false,
    value: 15000,
  },
]

let r = [0.35, 0.16, 0.28, 0.1, 0.05]

const pos = {
  none: -1,
  ACTIVO: 0,
  BRONCE: 1,
  PLATA: 2,
  ORO: 3,
  PLATINO: 4,
  RUBI: 5,
  ZAFIRO: 6,
  DIAMANTE: 7,
  'EMBAJADOR ESTRELLA': 8,
  'EMBAJADOR ELITE': 9,
  'EMBAJADOR DUNAMIS': 10,
}

const bonuses = {
  DIAMANTE: [],
  'EMBAJADOR ELITE': [],
}

const globalRanks = {
  ACTIVO: {
    M: 0, // Puntos grupales
    M1: 0, //  Máximo pierna larga
    M2: 0, // Máximo otras piernas
  },
  ORO: {
    M: 4000,
    M1: 1600,
    M2: 1400,
  },
  PLATINO: {
    M: 8000,
    M1: 2800,
    M2: 2800,
  },
  RUBI: {
    M: 15000,
    M1: 5250,
    M2: 5000,
  },
  ZAFIRO: {
    M: 30000,
    M1: 10000,
    M2: 10000,
  },
  DIAMANTE: {
    M: 50000,
    M1: 16667,
    M2: 16667,
  },
  'EMBAJADOR ESTRELLA': {
    M: 100000,
    M1: 33334,
    M2: 33334,
  },
  'EMBAJADOR ELITE': {
    M: 200000,
    M1: 60000,
    M2: 50000,
  },
  'EMBAJADOR DUNAMIS': {
    M: 500000,
    M1: 150000,
    M2: 125000,
  },
}

/**
 * Obtiene la cantidad de puntos que gana un nodo por su red hacia abajo
 * @param {string} id Id del nodo
 * @returns {number}
 */
function total_points(id) {
  const node = tree.find((e) => e.id == id)

  if (!node) return

  node.total_points = node.points + node.affiliation_points

  node.childs.forEach((_id) => {
    node.total_points += total_points(_id)
  })

  return node.total_points
}
/**
 * Calcula y obtiene el rango segun los puntos obtenidos
 * @param {number[]}  arr Cantidad de puntos agrupados por hijos
 * @returns {"PLATA" | "BRONCE" | "ACTIVO"}
 */
const calc_range = (arr) => {
  const n = arr.length

  console.log('arr', arr)
  // if PLATA
  if (
    n >= 2 &&
    arr.reduce(
      (a, b, c) =>
        a +
        (b > (c == 0 ? 0.65 : 0.5) * 2000 ? (c == 0 ? 0.65 : 0.5) * 2000 : b),
      0
    ) >= 2000
  ) {
    return 'PLATA'
  }

  // if BRONCE
  if (
    n >= 2 &&
    arr.reduce(
      (a, b, c) =>
        a + (b > (c == 0 ? 0.8 : 0.5) * 1000 ? (c == 0 ? 0.8 : 0.5) * 1000 : b),
      0
    ) >= 1000
  ) {
    return 'BRONCE'
  }

  // default rank
  return 'ACTIVO'
}

// function rank(node) {
//   if (node.activated)
//     node.rank = calc_range(node.total, node.points)
//   else node.rank = 'none'

//   node.childs.forEach((_id) => {
//     const _node = tree.find((e) => e.id == _id)
//     rank(_node)
//   })
// }

/**
 * Inserta el rango que le corresponde alos nodos segun los puntos obtenidos
 * @returns {void}
 * @example node[].rank = string
 */
const rank = () => {
  for (let node of tree) {
    if (node.activated) node.rank = calc_range(node.total)
    else node.rank = 'none'
  }
}

/**
 * Inserta cuantos niveles de nodos debajo podrá cobrar el usuario, segun su rango
 * @returns {void}
 * @example node[].levels = number
 */
function levels() {
  for (let node of tree) {
    if (node.rank == 'ACTIVO') node.levels = 3
    if (node.rank == 'BRONCE') node.levels = 3
    if (node.rank == 'PLATA') node.levels = 4
    if (node.rank == 'ORO') node.levels = 5
    if (node.rank == 'PLATINO') node.levels = 6
    if (node.rank == 'RUBI') node.levels = 7
    if (node.rank == 'ZAFIRO') node.levels = 8
    if (node.rank == 'DIAMANTE') node.levels = 9
    if (node.rank == 'EMBAJADOR ESTRELLA') node.levels = 10
    if (node.rank == 'EMBAJADOR ELITE') node.levels = 11
  }
}
/**
 * Verifica si debajo del nodo existe el rango especificado o uno superior
 * @param {string} id Id del nodo
 * @param {string} name Nombre del rango
 * @returns {boolean}
 */
function find_rank(id, name) {
  const node = tree.find((e) => e.id == id)

  const i = pos[node.rank]
  const j = pos[name]

  if (i >= j) return true

  for (let _id of node.childs) {
    if (find_rank(_id, name)) return true
  }

  return false
}
/**
 * Verifica si debajo del nodo se cumplen las condiciones para que pertenezca a un rango específico
 * @param {object}    node Nodo del arbol
 * @param {number[]}  node.total Cantidad de puntos agrupados por hijos
 * @param {string[]}  node.childs Id de los nodos hijos
 * @param {string}    node.parentId
 * @param {string}    node.plan
 * @param {string}    node.dni
 * @param {string}    node.name
 * @param {boolean}   node.activated
 * @param {number}    node.points
 * @param {number}    node.affiliation_points
 * @param {string}    rank Nombre del rango
 * @returns {boolean}
 */
const is_rank = (node, rank) => {
  let total = 0
  const { M, M1, M2 } = globalRanks[rank]

  const n = node.childs.length

  const arr = node.total

  // Suma los puntos grupales de acuerdo a las limitaciones de las piernas del nodo
  for (const [i, a] of arr.entries()) {
    if (i == 0) total += arr[i] > M1 ? M1 : arr[i]
    if (i >= 1) total += arr[i] > M2 ? M2 : arr[i]
  }

  const countChildRank = {
    _ACTIVO: 0,
    _BRONCE: 0,
    _PLATA: 0,
    _ORO: 0,
    _PLATINO: 0,
    _RUBI: 0,
    _ZAFIRO: 0,
    _DIAMANTE: 0,
    _EMBAJADOR_ESTRELLA: 0,
    _EMBAJADOR_ELITE: 0,
    _EMBAJADOR_DUNAMIS: 0,
  }

  for (const _id of node.childs) {
    if (find_rank(_id, 'BRONCE')) countChildRank._BRONCE += 1
    if (find_rank(_id, 'PLATA')) countChildRank._PLATA += 1
    if (find_rank(_id, 'ORO')) countChildRank._ORO += 1
    if (find_rank(_id, 'PLATINO')) countChildRank._PLATINO += 1
    if (find_rank(_id, 'RUBI')) countChildRank._RUBI += 1
    if (find_rank(_id, 'ZAFIRO')) countChildRank._ZAFIRO += 1
    if (find_rank(_id, 'DIAMANTE')) countChildRank._DIAMANTE += 1
    if (find_rank(_id, 'EMBAJADOR ESTRELLA'))
      countChildRank._EMBAJADOR_ESTRELLA += 1
    if (find_rank(_id, 'EMBAJADOR ELITE')) countChildRank._EMBAJADOR_ELITE += 1
    if (find_rank(_id, 'EMBAJADOR DUNAMIS'))
      countChildRank._EMBAJADOR_DUNAMIS += 1
  }

  // if (node.name === 'Luis Logan') {
  //   console.log('rank', rank)
  //   console.log('node.name', node.name)
  //   console.log('total', total)
  //   console.log('M', M)
  //   console.log('n', n)
  //   console.log('countChildRank', countChildRank)
  // }
  switch (rank) {
    case 'EMBAJADOR DUNAMIS':
      if (
        total >= M &&
        n >= 3 &&
        countChildRank._EMBAJADOR_ELITE >= 1 &&
        countChildRank._EMBAJADOR_ESTRELLA >= 1 &&
        countChildRank._DIAMANTE >= 2
      ) {
        return true
      }
      break
    case 'EMBAJADOR ELITE':
      if (
        total >= M &&
        n >= 3 &&
        countChildRank._DIAMANTE >= 1 &&
        countChildRank._ZAFIRO >= 2 &&
        countChildRank._RUBI >= 1
      ) {
        return true
      }
      break
    case 'EMBAJADOR ESTRELLA':
      if (
        total >= M &&
        n >= 3 &&
        countChildRank._ZAFIRO >= 1 &&
        countChildRank._RUBI >= 2
      ) {
        return true
      }
      break
    case 'DIAMANTE':
      if (
        total >= M &&
        n >= 3 &&
        countChildRank._RUBI >= 1 &&
        countChildRank._PLATINO >= 2
      ) {
        return true
      }
      break
    case 'ZAFIRO':
      if (node.name === 'Luis Logan') {
        console.log('1**********')
        console.log('node.name', node.name)
        console.log('node.total', node.total)
        console.log(
          `${total} >= ${M} && ${n} >= 3 && ${countChildRank._PLATINO} >= 1 && ${countChildRank._ORO} >= 2`,
          total >= M &&
            n >= 3 &&
            countChildRank._PLATINO >= 1 &&
            countChildRank._ORO >= 2
        )
      }
      if (
        total >= M &&
        n >= 3 &&
        countChildRank._PLATINO >= 1 &&
        countChildRank._ORO >= 2
      ) {
        return true
      }
      break
    case 'RUBI':
      if (
        total >= M &&
        n >= 3 &&
        countChildRank._ORO >= 1 &&
        countChildRank._PLATA >= 2
      ) {
        return true
      }
      break
    case 'PLATINO':
      if (
        total >= M &&
        n >= 3 &&
        countChildRank._PLATA >= 1 &&
        countChildRank._BRONCE >= 1
      ) {
        return true
      }
      break
    case 'ORO':
      if (total >= M && n >= 3 && countChildRank._BRONCE >= 1) return true
      break
  }

  return false
}
/**
 * Crea un arreglo con los pagos residuales correspondientes de un usuario de la red
 * @param {string}  id Id del nodo iterado
 * @param {number}  n Nivel del nodo iterado
 * @param {object}  user Objeto del usuario beneficiario
 * @param {string}  user.dni
 * @param {string}  user.name
 * @param {number}  user.points
 * @returns {void}
 * @example node[].residual_bonus_arr = [{
 *  n: number,
 *  dni: string,
 *  name: string,
 *  val: number,
 *  r: number,
 *  amount: number,
 * }]
 */
function pay_residual(id, n, user) {
  if (n == 15) return

  let node = tree.find((e) => e.id == id)
  let _id = node.parent

  if (node.activated) {
    if (node.levels > n) {

      if(node._activated && !node.activated) { // activacion simple
        // const _points = if(user.points > 50)  ? 50 : user.points // truncado a 50
      }

      if(node.activated) { // activacion full
        // const _points = if(user.points > 150) ? 150 : user.points // truncado a 150
      }

      // const amount = r[n] * user.points
      const amount = r[n] * user._points * 2.6 // factor de conversion puntos a moneda 2.6

      if (amount > 0) {
        node.residual_bonus += amount

        node.residual_bonus_arr.push({
          n,
          dni: user.dni,
          name: user.name,
          val: user.points,
          r: r[n],
          amount,
        })
      }
    }

    if (_id) pay_residual(_id, n + 1, user)
  } else {
    if (_id) pay_residual(_id, n, user)
  }
}

export default async (req, res) => {
  await midd(req, res)

  if (req.method == 'GET') {
    let closeds = await Closed.find({})

    return res.json(success({ closeds }))
  }

  if (req.method == 'POST') {
    console.log('POST ...')

    const { action } = req.body

    if (action == 'new') {
      console.log('new ...')

      const users = await User.find({ tree: true })
      tree = await Tree.find({})

      // enrich tree
      tree.forEach((node) => {
        const user = users.find((e) => e.id == node.id)

        node.parentId = user.parentId
        node.plan = user.plan
        node.dni = user.dni
        node.name = user.name + ' ' + user.lastName
        node.activated = user.activated
        node.points = Number(user.points)
        node.affiliation_points = user.affiliation_points
          ? user.affiliation_points
          : 0
        // node.closeds            = user.closeds ? user.closeds : []
        node.pays = user.pays ? user.pays : pays
        node.bonuses = user.bonuses ? user.bonuses : bonuses
        // node.n_inactives = user.n_inactives ? user.n_inactives : 0
        node.residual_bonus = 0
        node.residual_bonus_arr = []
        node._pays = []
        node.ZAFIRO = user.ZAFIRO || false
        node.bonuses_enabled = user.bonuses_enabled || false
        node.profit_aff = user.profit_aff || 0
      })

      // calc total_points
      total_points('5f0e0b67af92089b5866bcd0')

      // calc total array
      tree.forEach((node) => {
        node.total = []
        node._total = []

        node.childs.forEach((_id) => {
          const _node = tree.find((e) => e.id == _id)

          node.total.push(_node.total_points)
          node._total.push(_node.total_points)
        })

        node.total.sort((a, b) => b - a)
      })

      // ranks calculate
      rank() // BRONCE, PLATA, ACTIVOS

      for (let node of tree) {
        if (node.name === 'Luis Logan') {
          console.log('0-x---')
          console.log('node', node)
          // console.log('node.total', node.total)
        }
      }
      // Sort from low rank to hight rank
      for (let node of tree) if (is_rank(node, 'ORO')) node.rank = 'ORO' // -> BRONCE
      for (let node of tree) if (is_rank(node, 'PLATINO')) node.rank = 'PLATINO' // -> PLATA, BRONCE
      for (let node of tree) if (is_rank(node, 'RUBI')) node.rank = 'RUBI' // -> ORO, PLATA, PLATA
      for (let node of tree) if (is_rank(node, 'ZAFIRO')) node.rank = 'ZAFIRO' // -> PLATINO, ORO, ORO
      for (let node of tree)
        if (is_rank(node, 'DIAMANTE')) node.rank = 'DIAMANTE' // -> RUBI, PLATINO, PLATINO
      for (let node of tree)
        if (is_rank(node, 'EMBAJADOR ESTRELLA'))
          node.rank = 'EMBAJADOR ESTRELLA' // -> ZAFIRO, RUBI, RUBI
      for (let node of tree)
        if (is_rank(node, 'EMBAJADOR ELITE')) node.rank = 'EMBAJADOR ELITE' // -> DIAMANTE, ZAFIRO, ZAFIRO, RUBI
      for (let node of tree)
        if (is_rank(node, 'EMBAJADOR DUNAMIS')) node.rank = 'EMBAJADOR DUNAMIS' // -> EMBAJADOR ELITE, EMBAJADOR ESTRELLA, DIAMANTE, DIAMANTE

      // for (let node of tree) {
      //   if (node.name === 'Luis Logan') {
      //     console.log('1-x---')
      //     console.log('node', node)
      //     // console.log('node.total', node.total)
      //   }
      // }
      // levels calculation
      levels()

      // pay residual bonus
      for (let node of tree) if (node.parent) pay_residual(node.parent, 0, node)

      // pay bonus
      for (let node of tree) {
        const { rank } = node

        if (rank != 'none') {
          const pos = node.pays.findIndex((e) => e.name == rank)

          if (pos != -1) {
            for (let i = 0; i <= pos; i++) {
              const pay = node.pays[i]

              if (!pay.payed) {
                const value = pay.value

                pay.value = value

                node._pays.push(pay)
              }
            }
          }
        }
      }

      const affiliations = await Affiliation.find({ closed: { $ne: true } })
      const activations = await Activation.find({ closed: { $ne: true } })

      const aff_transactions = await Transaction.find({
        name: 'affiliation bonus',
        closed: { $ne: true },
      })

      return res.json(
        success({ tree, affiliations, activations, aff_transactions })
      )
    }

    if (action == 'save') {
      console.log('save ...')

      const { tree, affiliations, activations, aff_transactions } =
        req.body.data

      let users = []

      for (let node of tree) {
        if (node.rank != 'none') {
          users.push({
            name: node.name,
            activated: node.activated,
            points: node.points,
            total: node._total,
            rank: node.rank,
            residual_bonus: node.residual_bonus,
            _pays: node._pays,
          })
        }
      }

      await Closed.insert({
        id: rand(),
        date: new Date(),
        users,
        tree,
        affiliations,
        activations,
        aff_transactions,
      })

      for (let node of tree) {
        const { rank } = node

        if (rank != 'none') {
          // residual bonus
          await Transaction.insert({
            date: new Date(),
            user_id: node.id,
            type: 'in',
            value: node.residual_bonus,
            name: 'residual',
          })

          // pay bonus
          const pos = node.pays.findIndex((e) => e.name == rank)

          if (pos != -1) {
            for (let i = 0; i <= pos; i++) {
              const pay = node.pays[i]

              if (!pay.payed) {
                const value = pay.value

                await Transaction.insert({
                  date: new Date(),
                  user_id: node.id,
                  type: 'in',
                  value: value,
                  name: 'closed bonus',
                  desc: `Rango ${node.rank}`,
                })

                pay.payed = true
              }
            }
          }

          // pay bonuses

          if (pos[node.rank] >= 6) node.ZAFIRO = true

          if (node.bonuses_enabled) {
            if (rank == 'DIAMANTE') {
              node.bonuses['DIAMANTE'].push(true)

              if (
                node.bonuses['DIAMANTE'].length == 2 &&
                node.bonuses['DIAMANTE'][0] &&
                node.bonuses['DIAMANTE'][1]
              ) {
                await Transaction.insert({
                  date: new Date(),
                  user_id: node.id,
                  type: 'in',
                  value: 3000,
                  name: 'DIAMANTE bonus',
                })
              }
            } else {
              node.bonuses['DIAMANTE'] = []
            }

            if (rank == 'EMBAJADOR ELITE') {
              node.bonuses['EMBAJADOR ELITE'].push(true)

              if (
                node.bonuses['EMBAJADOR ELITE'].length == 2 &&
                node.bonuses['EMBAJADOR ELITE'][0] &&
                node.bonuses['EMBAJADOR ELITE'][1]
              ) {
                await Transaction.insert({
                  date: new Date(),
                  user_id: node.id,
                  type: 'in',
                  value: 30000,
                  name: 'EMBAJADOR ELITE bonus',
                })
              }
            } else {
              node.bonuses['EMBAJADOR ELITE'] = []
            }
          }
        }

        // if (!node.activated) node.n_inactives + 1
      }

      await User.updateMany(
        {},
        {
          activated: false,
          rank: 'none',
          points: 0,
          affiliation_points: 0,
          profit_aff: 0,
        }
      )

      for (let node of tree) {
        if (node.rank != 'none') {
          await User.updateOne(
            { id: node.id },
            {
              rank: node.rank,
              pays: node.pays,
              bonuses: node.bonuses,
              // n_inactives: node.n_inactives,
              ZAFIRO: node.ZAFIRO,
            }
          )
        }

        if(node.activated) {
          await Transaction.insert({
            date: new Date(),
            user_id: node.id,
            type: 'in',
            value: node.profit_aff,
            name: 'profit aff',
          })
        }
      }

      await Affiliation.updateMany({}, { closed: true })
      await Activation.updateMany({}, { closed: true })

      await Transaction.updateMany(
        { name: 'affiliation bonus' },
        { closed: true }
      )

      // delete virtual transactions
      const virtualTransactions = await Transaction.find({ virtual: true })

      for (let transaction of virtualTransactions) {
        await Transaction.delete({ id: transaction.id })
      }
    }

    // response
    return res.json(success({}))
  }
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '4mb',
    },
  },
}

export const ClosedJsStatic = { pays, r, pos, bonuses, globalRanks }
export const ClosedJs = { calc_range, is_rank, rank }

export function ExportClosedJs(otherTree) {
  tree = otherTree
  return { ...ClosedJsStatic, ...ClosedJs }
}

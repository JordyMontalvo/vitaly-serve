import db from '../../../components/db'
import lib from '../../../components/lib'
import {
  ExportClosedJs,
  ClosedJs,
  ClosedJsStatic,
} from '../../../pages/api/admin/closeds'

const { User, Session, Transaction, Tree, Banner, PlatformConfig } = db
const { error, success, acum, midd, diff_between_dates } = lib

let tree

const pays = ClosedJsStatic.pays

let r = ClosedJsStatic.r

const pos = ClosedJsStatic.pos

const bonuses = ClosedJsStatic.bonuses

const globalRanks = ClosedJsStatic.globalRanks

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
      const amount = r[n] * user.points

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

/**
 * Obtiene la cantidad de puntos que gana un nodo por su red hacia abajo
 * @param {string} id Id del nodo
 * @returns {number}
 */
function total_points(id) {
  const node = tree.find((e) => e.id == id)

  if (!node) return
  // console.log(
  //   'node.points + node.affiliation_points',
  //   node.points,
  //   '+',
  //   node.affiliation_points
  // )
  node.total_points = node.points + node.affiliation_points

  node.childs.forEach((_id) => {
    node.total_points += total_points(_id)
  })

  return node.total_points
}

function total_only_points(id) {
  const node = tree.find((e) => e.id == id)

  if (!node) return

  node.total_only_points = node.points

  node.childs.forEach((_id) => {
    node.total_only_points += total_only_points(_id)
  })

  return node.total_only_points
}

function total_only_aff_points(id) {
  const node = tree.find((e) => e.id == id)

  if (!node) return

  node.total_only_aff_points = node.affiliation_points

  node.childs.forEach((_id) => {
    node.total_only_aff_points += total_only_aff_points(_id)
  })

  return node.total_only_aff_points
}

// function total_affiliates(id, parent_id) {
//   const node = tree.find((e) => e.id == id)

//   node.total_affiliates =
//     node.affiliated && node.parentId == parent_id && !node.closed ? 1 : 0

//   node.childs.forEach((_id) => {
//     node.total_affiliates += total_affiliates(_id, parent_id)
//   })

//   return node.total_affiliates
// }

/**
 * Inserta el rango que le corresponde alos nodos segun los puntos obtenidos
 * @param {object} node Nodo
 * @returns {void}
 * @example node[].rank = string
 */
const rank = (node) => {
  if (node.activated) node.rank = ClosedJs.calc_range(node.total)
  else node.rank = 'none'
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

  // console.log('node.childs', node.childs)
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
  //   console.log('----')
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
 * @returns {void}
 */
const next_rank = (node) => {
  let total = 0

  const currentRankPos = pos[node.rank]
  console.log('currentRankPos', currentRankPos)
  const keyRankPos = Object.keys(pos).find(
    (key) => pos[key] === currentRankPos + 1
  )

  console.log(keyRankPos)
  let d = 0 // restantes para ese nivel
  node.next_rank = {
    name: keyRankPos,
    points: d,
  }
  /**
  if (node.rank == 'none') total = 0
  if (node.rank == 'active') total = node.total.reduce((a, b) => a + b, 0)
  if (node.rank == 'star')
    total = node.total.reduce(
      (a, b, c) =>
        a +
        (b > (c == 0 ? 0.6667 : 0.5) * 300 ? (c == 0 ? 0.6667 : 0.5) * 300 : b),
      0
    )
  if (node.rank == 'master')
    total = node.total.reduce(
      (a, b, c) =>
        a +
        (b > (c == 0 ? 0.5556 : 0.5) * 900 ? (c == 0 ? 0.5556 : 0.5) * 900 : b),
      0
    )
  if (node.rank == 'silver')
    total = node.total.reduce(
      (a, b, c) =>
        a +
        (b > (c == 0 ? 0.4167 : 0.3334) * 1800
          ? (c == 0 ? 0.4167 : 0.3334) * 1800
          : b),
      0
    )
  if (node.rank == 'gold')
    total = node.total.reduce(
      (a, b, c) =>
        a +
        (b > (c == 0 ? 0.3637 : 0.3334) * 3300
          ? (c == 0 ? 0.3637 : 0.3334) * 3300
          : b),
      0
    )
  if (node.rank == 'sapphire')
    total = node.total.reduce(
      (a, b, c) =>
        a +
        (b > (c == 0 ? 0.2768 : 0.25) * 9000
          ? (c == 0 ? 0.2768 : 0.25) * 9000
          : b),
      0
    )

  total = 0
  let M, M1, M2

  const n = node.childs.length

  const arr = node.total

  if (rank == 'RUBI') {
    M = 21000
    M1 = 5500
    M2 = 5250
  }
  if (rank == 'DIAMANTE') {
    M = 60000
    M1 = 13000
    M2 = 12000
  }
  if (rank == 'DOBLE DIAMANTE') {
    M = 115000
    M1 = 23000
    M2 = 23000
  }
  if (rank == 'TRIPLE DIAMANTE') {
    M = 225000
    M1 = 37500
    M2 = 37500
  }
  if (rank == 'DIAMANTE ESTRELLA') {
    M = 520000
    M1 = 87000
    M2 = 86700
  }

  for (const [i, a] of arr.entries()) {
    if (i == 0) total += arr[i] > M1 ? M1 : arr[i]
    if (i >= 1) total += arr[i] > M2 ? M2 : arr[i]
  }

  let next = ''
  let d = 0

  if (node.rank == 'none') {
    next = 'active'
    d = 90 - total
  }
  if (node.rank == 'active') {
    next = 'star'
    d = 300 - total
  }
  if (node.rank == 'star') {
    next = 'master'
    d = 900 - total
  }
  if (node.rank == 'master') {
    next = 'silver'
    d = 1800 - total
  }
  if (node.rank == 'silver') {
    next = 'gold'
    d = 3300 - total
  }
  if (node.rank == 'gold') {
    next = 'sapphire'
    d = 9000 - total
  }
  if (node.rank == 'sapphire') {
    next = 'RUBI'
    d = 21000 - total
  }
  if (node.rank == 'RUBI') {
    next = 'DIAMANTE'
    d = 60000 - total
  }
  if (node.rank == 'DIAMANTE') {
    next = 'DOBLE DIAMANTE'
    d = 115000 - total
  }
  if (node.rank == 'DOBLE DIAMANTE') {
    next = 'TRIPLE DIAMANTE'
    d = 225000 - total
  }
  if (node.rank == 'TRIPLE DIAMANTE') {
    next = 'DIAMANTE ESTRELLA'
    d = 520000 - total
  }

  if (d < 0) d = 0

  node.next_rank = {
    name: next,
    points: d,
  }
   */
}

/**
 * @param {User} user
 * @returns {Number}
 */
const verify_expiration_plan = async (user) => {
  if (user.plan === 'default') return null
  const diff =
    -lib.diff_between_dates(new Date(user.affiliation_date), new Date()) + 365
  if (diff <= 0) {
    await User.updateOne(
      { _id: user._id },
      { plan: 'default', activated: false, _activated: false }
    )
  }
  console.log('Faltan', diff, 'dias')
  return diff
}

export default async (req, res) => {
  await midd(req, res)

  let { session } = req.query

  // valid session
  session = await Session.findOne({ value: session })
  if (!session) return res.json(error('invalid session'))

  // get USER
  const user = await User.findOne({ id: session.id })

  const days_to_expire = await verify_expiration_plan(user)

  // get transactions
  const transactions = await Transaction.find({
    user_id: user.id,
    virtual: { $in: [null, false] },
  })
  const virtualTransactions = await Transaction.find({
    user_id: user.id,
    virtual: true,
  })

  const ins = acum(transactions, { type: 'in' }, 'value')
  const outs = acum(transactions, { type: 'out' }, 'value')
  const outsAff = acum(transactions, { type: 'out_profit_aff' }, 'value')
  console.log('outsAff', outsAff)
  const insVirtual = acum(virtualTransactions, { type: 'in' }, 'value')
  const outsVirtual = acum(virtualTransactions, { type: 'out' }, 'value')

  const users = await User.find({ tree: true })
  tree = await Tree.find({})

  // enrich tree
  tree.forEach((node) => {
    const user = users.find((e) => e.id == node.id)
    node.parentId = user.parentId
    node.plan = user.plan
    // node.dni = user.dni
    node.name = user.name + ' ' + user.lastName
    node.activated = user.activated
    node.points = Number(user.points)
    node.affiliation_points = user.affiliation_points
      ? user.affiliation_points
      : 0
    node.affiliated = user.affiliated
    node.closed = user.closed ? true : false

    node.total = []
    node._total = []

    // node.closeds = user.closeds ? user.closeds : []
    node.pays = user.pays ? user.pays : pays
    node.bonuses = user.bonuses ? user.bonuses : bonuses
    // node.n_inactives = user.n_inactives ? user.n_inactives : 0
    node.residual_bonus = 0
    node.residual_bonus_arr = []
    node._pays = []
  })

  // Obtiene el nodo del usaurio actual
  const currentNode = tree.find((e) => e.id == user.id)
  if (currentNode) currentNode.total = []

  // calc total_points
  // total_points(user.id)
  total_points('5f0e0b67af92089b5866bcd0')
  total_only_points('5f0e0b67af92089b5866bcd0')
  total_only_aff_points('5f0e0b67af92089b5866bcd0')

  // calc total array
  tree.forEach((node) => {
    node.total = []
    node._total = []
    node._total_only_points = []
    node._total_only_aff_points = []

    node.childs.forEach((_id) => {
      const _node = tree.find((e) => e.id == _id)

      node.total.push(_node.total_points)

      node._total.push(_node.total_points)
      node._total_only_points.push(_node.total_only_points)
      node._total_only_aff_points.push(_node.total_only_aff_points)
    })
    node.total.sort((a, b) => b - a)
  })

  const exportClosedJs = ExportClosedJs(tree)

  // ranks calculate
  exportClosedJs.rank() // BRONCE, PLATA, ACTIVOS
  // rank(currentNode) // BRONCE, PLATA, ACTIVOS

  // Sort from low rank to hight rank
  for (let node of tree)
    if (exportClosedJs.is_rank(node, 'ORO')) node.rank = 'ORO' // -> BRONCE
  for (let node of tree)
    if (exportClosedJs.is_rank(node, 'PLATINO')) node.rank = 'PLATINO' // -> PLATA, BRONCE
  for (let node of tree)
    if (exportClosedJs.is_rank(node, 'RUBI')) node.rank = 'RUBI' // -> ORO, PLATA, PLATA
  for (let node of tree)
    if (exportClosedJs.is_rank(node, 'ZAFIRO')) node.rank = 'ZAFIRO' // -> PLATINO, ORO, ORO
  for (let node of tree)
    if (exportClosedJs.is_rank(node, 'DIAMANTE')) node.rank = 'DIAMANTE' // -> RUBI, PLATINO, PLATINO
  for (let node of tree)
    if (exportClosedJs.is_rank(node, 'EMBAJADOR ESTRELLA'))
      node.rank = 'EMBAJADOR ESTRELLA' // -> ZAFIRO, RUBI, RUBI
  for (let node of tree)
    if (exportClosedJs.is_rank(node, 'EMBAJADOR ELITE'))
      node.rank = 'EMBAJADOR ELITE' // -> DIAMANTE, ZAFIRO, ZAFIRO, RUBI
  for (let node of tree)
    if (exportClosedJs.is_rank(node, 'EMBAJADOR DUNAMIS'))
      node.rank = 'EMBAJADOR DUNAMIS' // -> EMBAJADOR ELITE, EMBAJADOR ESTRELLA, DIAMANTE, DIAMANTE

  if (currentNode) next_rank(currentNode)

  // levels calculation
  levels()

  // pay residual bonus
  for (let node of tree) if (node.parent) pay_residual(node.parent, 0, node)

  // levels calculation
  // levels()

  // total_affiliates(user.id, user.id)

  // let n_affiliates = 0

  // if(user.plan == 'default') {
  //   node.childs.forEach(_id => {
  //     const _node = tree.find(e => e.id == _id)
  //     n_affiliates += _node.total_affiliates
  //   })
  // }
  const _balance_aff = user.profit_aff

  const banner = await Banner.findOne({})
  const platform_configs = await PlatformConfig.get()
  // console.log('currentNode.rank', currentNode.rank)
  // response

  const directs_found = await User.countDocuments({
    parentId: user.id, // directos
    closeds: { $in: [false, null] }, // no cerrados
    plan: { $ne: 'default' }, // tengan plan
  })
  const bonus_by_directs = Math.floor(directs_found / 5)

  return res.json(
    success({
      platform_configs: platform_configs,

      name: user.name,
      lastName: user.lastName,
      affiliated: user.affiliated,
      activated: user.activated,
      plan: user.plan,
      country: user.country,
      photo: user.photo,
      tree: user.tree,

      banner,
      ins,
      insVirtual,
      outs,
      balance: ins - outs + outsAff,
      _balance: insVirtual - outsVirtual,
      _balance_aff,
      rank: user.rank || 'NINGUNO',
      points: user.points,
      node: currentNode,
      dateStartPlan: user.affiliation_date,
      days_to_expire,
      // n_affiliates,
      directs_found,
      bonus_by_directs,
    })
  )
}

// function total_affiliates(id, parent_id, n) {

//   const node = tree.find(e => e.id == id)

//   node.total_affiliates = 0

//   if(node.affiliated && !node.closeds) {
//     if(node.parentId == parent_id) node.total_affiliates = 1
//     else
//       if(n < 5) node.total_affiliates = 1
//   }

//   node.childs.forEach(_id => {
//     node.total_affiliates += total_affiliates(_id, parent_id, n+1)
//   })

//   return node.total_affiliates
// }

export function exportDashboardjs(otherTree) {
  console.log('exportDashboardjs')
  tree = otherTree
  return { rank, is_rank, next_rank }
}

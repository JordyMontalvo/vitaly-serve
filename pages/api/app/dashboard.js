import db from '../../../components/db'
import lib from '../../../components/lib'


const { User, Session, Transaction, Tree, Banner, PlatformConfig } = db
const { error, success, acum, midd, diff_between_dates } = lib


let users = []
let tree = []



const ranks = [
  // Ordenarlos de forma descendente al rango
  {
    pos: 5,
    rank: 'EMBAJADOR ESTRELLA',
    type_calculation: 'rank_dependency',
    minimum_frontals: 3,
    threshold_points: 54450, // M
    maximum_large_leg: 18150, // M1
    maximum_others_leg: 18150, // M2
    rank_dependencies: [
      {
        rank: 'EMBAJADOR VISIONARIO',
        minimum: 2,
        diff_branch: false,
      },
    ],
  },
  {
    pos: 4,
    rank: 'EMBAJADOR VISIONARIO',
    type_calculation: 'rank_dependency',
    minimum_frontals: 3,
    threshold_points: 18000, // M
    maximum_large_leg: 6300, // M1
    maximum_others_leg: 6000, // M2
    rank_dependencies: [
      {
        rank: 'EJECUTIVO - PLATA',
        minimum: 1,
        diff_branch: false,
      },
    ],
  },
  {
    pos: 3,
    rank: 'EJECUTIVO - ORO',
    type_calculation: 'simple',
    minimum_frontals: 3,
    threshold_points: 5850, // M
    maximum_large_leg: 2300, // M1
    maximum_others_leg: 1950, // M2
    rank_dependencies: [],
  },
  {
    pos: 2,
    rank: 'EJECUTIVO - PLATA',
    type_calculation: 'simple',
    minimum_frontals: 3,
    threshold_points: 1800, // M
    maximum_large_leg: 900, // M1
    maximum_others_leg: 600, // M2
    rank_dependencies: [],
  },
  {
    pos: 1,
    rank: 'EJECUTIVO',
    type_calculation: 'simple',
    minimum_frontals: 2,
    threshold_points: 450, // M
    maximum_large_leg: 350, // M1
    maximum_others_leg: 250, // M2
    rank_dependencies: [],
  },
]
ranks.push({
  pos: 0,
  rank: 'ACTIVO',
  type_calculation: 'temp',
  rank_dependencies: [],
})
ranks.push({
  pos: -1,
  rank: 'none',
  type_calculation: 'temp',
  rank_dependencies: [],
})


/**
 * @param {User[]}  users
 * @returns {void}
 */
function enrichTreeData() {
  tree.forEach((node) => {
    const user = users.find((e) => e.id == node.id)

    node.parentId = user.parentId
    node.plan = user.plan
    node.dni = user.dni
    node.name = user.name + ' ' + user.lastName
    node.activated = user.activated
    node._activated = user._activated ? user._activated : false
    node.points = Number(user.points)
    node.affiliation_points = user.affiliation_points
      ? user.affiliation_points
      : 0
    node.residual_bonus = 0
    node.residual_bonus_arr = []

    // node.closeds = user.closeds ? user.closeds : []
    // node.pays = user.pays
    //   ? user.pays
    //   : pays
    // node._pays = []
    // node.bonuses_enabled = user.bonuses_enabled || false
    // node.profit_aff = user.profit_aff || 0
  })
}

/**
 * Obtiene la cantidad de puntos que gana un nodo por su red hacia abajo
 * @param {string}  id Id del nodo
 * @returns {number}
 */
function total_points(id) {
  const node = tree.find((e) => e.id == id)

  let ret = node.points + node.affiliation_points

  const directs = tree.filter((e) => e.parentId == node.id)

  for (let d of directs) {
    ret += total_points(d.id)
  }

  return ret
}


/**
 * Inserta el rango que le corresponde alos nodos segun los puntos obtenidos
 * @returns {void}
 * @example node[].rank = string
 */
const initialRanks = () => {
  for (let node of tree) {
    if (node._activated || node.activated) node.rank = calc_rank(node)
    else node.rank = 'none'
  }
}

/**
 * Calcula y obtiene el rango segun los puntos obtenidos
 * @param {Tree}      node Nodo de un usuario
 * @param {number[]}  node.total_arr Cantidad de puntos agrupados por directos
 * @returns {"PLATA" | "BRONCE" | "ACTIVO"}
 */
const calc_rank = (node) => {
  if (!node.activated) return 'ACTIVO' // ACTIVO SIMPLE

  const n = node.total_arr.length
  const arr = node.total_arr

  const rankLimitsSimple = ranks.filter(
    (el) => el.type_calculation === 'simple'
  )

  const valueRankLimits = (rankLimitSimple) => {
    let acum = 0
    // if EJECUTIVO
    arr.forEach((val, i) => {
      if (i == 0)
        val = val > rankLimitSimple.maximum_large_leg
                  ? rankLimitSimple.maximum_large_leg
                  : val
      else if (i != 0)
        val = val > rankLimitSimple.maximum_others_leg
                  ? rankLimitSimple.maximum_others_leg
                  : val

      acum += val
    })
    if (
      n >= rankLimitSimple.minimum_frontals &&
      acum >= rankLimitSimple.threshold_points
    ) {
      return rankLimitSimple.rank
    }
  }

  for (const rankLimitSimple of rankLimitsSimple) {
    let rankCalculated = valueRankLimits(rankLimitSimple)
    if (rankCalculated) return rankCalculated
  }

  // default rank
  return 'ACTIVO'
}

/**
 * Completar de rellenar el resto de los rangos
 * @returns {void}
 */
const completeDependencyRanks = () => {
  const rankLimitsDependency = ranks.filter(
    (el) => el.type_calculation === 'rank_dependency'
  )
  for (const rankLimitDependency of rankLimitsDependency) {
    for (let node of tree)
      if (is_rank(node, rankLimitDependency))
        node.rank = rankLimitDependency.rank // Dependerán de: rankLimitDependency.rank_dependencies
  }
}

/**
 * Verifica si debajo del nodo se cumplen las condiciones para que pertenezca a un rango específico
 * @param {object}    node Nodo del arbol
 * @param {number[]}  node.total_arr Cantidad de puntos agrupados por hijos
 * @param {string[]}  node.childs Id de los nodos hijos
 * @param {string}    node.parentId
 * @param {string}    node.plan
 * @param {string}    node.dni
 * @param {string}    node.name
 * @param {boolean}   node.activated
 * @param {number}    node.points
 * @param {number}    node.affiliation_points
 * @param {Rank}      rank Objeto del rango con sus límites
 * @param {String}    rank.rank Nombre del rango
 * @returns {boolean}
 */
const is_rank = (node, rank) => {
  let total = 0
  const M = rank.threshold_points
  const M1 = rank.maximum_large_leg
  const M2 = rank.maximum_others_leg

  const n = node.childs.length

  const arr = node.total_arr

  // Suma los puntos grupales de acuerdo a las limitaciones de las piernas del nodo
  for (const [i, a] of arr.entries()) {
    if (i == 0) total += Math.min(arr[i], M1)
    if (i >= 1) total += Math.min(arr[i], M2)
  }

  /**
   * @param {String} rank_name
   * @returns {String}
   */
  const build_attr_rank_name = (rank_name) => {
    return `_${rank_name
      .replace(/ /g, '_')
      .replace(/\-/g, '')
      .replace('__', '_')}`
  }

  // Crea un objeto con contadores temporales para saber cuantos hijos con tales rangos fueron encontrados
  let countChildRank = {}
  for (const temp_rank of ranks) {
    const attr_rank_name = build_attr_rank_name(temp_rank.rank)
    countChildRank[attr_rank_name] = 0
  }

  const rankLimitsDependency = ranks.filter(
    (el) => el.type_calculation === 'rank_dependency'
  )

  // Suma los contadores segun los rangos encontrados de los hijos del nodo
  for (const _id of node.childs) {
    for (const rank of ranks) {
      if (find_rank(_id, rank)) {
        const attr_rank_name = build_attr_rank_name(rank.rank)
        countChildRank[attr_rank_name] += 1
      }
    }
  }

  // Verifica si el nodo cumple con las otras limitaciiones de dependencia segun el rango en el que se encuentre
  for (const rankLimitDependency of rank.rank_dependencies) {
    const attr_rank_name = build_attr_rank_name(rankLimitDependency.rank)
    if (countChildRank[attr_rank_name] < rankLimitDependency.minimum) {
      return false
    }
  }

  if (total >= M && n >= rank.minimum_frontals) {
    return true
  }

  return false
}

/**
 * Verifica si debajo del nodo existe el rango especificado o uno superior
 * @param {string}    id Id del nodo
 * @param {Rank}      rank Objeto del rango con sus límites
 * @param {string}    rank.rank Nombre del rango
 * @returns {boolean}
 */
function find_rank(id, rank) {
  const node = tree.find((e) => e.id == id)

  const i = ranks.find((el) => el.rank === node.rank).pos
  const j = rank.pos

  if (i >= j) return true

  for (let _id of node.childs) {
    if (find_rank(_id, rank)) return true
  }

  return false
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


  const _balance_aff = user.profit_aff

  const banner = await Banner.findOne({})
  const platform_configs = await PlatformConfig.get()

  const directs_found = await User.countDocuments({
    parentId: user.id, // directos
    closed: { $in: [false, null] }, // no cerrados
    plan: { $ne: 'default' }, // tengan plan
  })
  const bonus_by_directs = Math.floor(directs_found / 5)




  users = await User.find({ tree: true })
  tree = await Tree.find({})

  enrichTreeData()

  // calculate total points
  for (let node of tree) {
    node.total_points = 0
    node.total_arr = []

    const directs = tree.filter((e) => e.parentId == node.id)

    for (let d of directs) {
      node.total_points += total_points(d.id)
      node.total_arr.push(total_points(d.id))
    }

    node.total_arr.sort((a, b) => b - a)
  }

  initialRanks()

  completeDependencyRanks()

  for (let node of tree) {
    console.log(node.name, node.total_points, node.total_arr, node.rank)
  }

  const currentNode = tree.find((e) => e.id == user.id)
  if (currentNode) currentNode.total = []
  console.log(currentNode)


  return res.json(
    success({
      platform_configs: platform_configs,

      name: user.name,
      lastName: user.lastName,
      affiliated: user.affiliated,
      activated: user.activated,
     _activated: user._activated,
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

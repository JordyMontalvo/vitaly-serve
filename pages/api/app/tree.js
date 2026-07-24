import db from '../../../components/db'
import lib from '../../../components/lib'
// import { Closedjs } from '../../../pages/api/admin/closeds'
import { exportDashboardjs } from '../../../pages/api/app/dashboard'

const { User, Session, Tree, Activation } = db
const { error, success, midd, map } = lib

let tree, nodes

function find(id, n) {
  if (n == 100) return

  const node = tree.find((e) => e.id == id)

  if (node.childs.length == 0) return

  node.childs.forEach((_id) => {
    find(_id, n + 1)
  })

  node._childs = []

  node.childs.forEach((_id) => {
    const _node = tree.find((e) => e.id == _id)
    node._childs.push(_node)
  })
}

function total_points(id) {
  const node = tree.find((e) => e.id == id)

  if (!node) return

  node.total_points = node.points + node.affiliation_points

  node.childs.forEach((_id) => {
    node.total_points += total_points(_id)
  })

  return node.total_points
}

export default async (req, res) => {
  await midd(req, res)

  let { session, id } = req.query

  // valid session
  session = await Session.findOne({ value: session })
  if (!session) return res.json(error('invalid session'))

  // const closeds = new Closedjs()

  // get USER, USERS, TREE
  const user = await User.findOne({ id: session.id })
  if (id == 'null') id = user.id

  const users = await User.find({ tree: true })
  tree = await Tree.find({})

  const activations = await Activation.find({})

  // enrich tree
  tree.forEach((node) => {
    const user = users.find((e) => e.id == node.id)
    const last_activations = activations
      .filter((a) => a.userId == user.id)
      .slice(0, 5)

    node.dni = user.dni
    node.name = user.name
    node.lastName = user.lastName
    node.email = user.email
    node.phone = user.phone
    node.photo = user.photo
    node.affiliated = user.affiliated
    node.activated = user.activated
    node._activated = user._activated
    node.points = Number(user.points)
    node.affiliation_points = user.affiliation_points
      ? user.affiliation_points
      : 0
    node.plan = user.plan
    node.last_rank = user.rank || 'NINGUNO'
    node.last_activations = last_activations
  })

  const node = tree.find((e) => e.id == id)
  node.total = []

  total_points('5f0e0b67af92089b5866bcd0')

  tree.forEach((node) => {
    node.closed_points = 0
    node.closed_points_arr = []

    node.childs.forEach((_id) => {
      const _node = tree.find((e) => e.id == _id)

      node.closed_points += _node.total_points
      node.closed_points_arr.push(_node.total_points)
    })

    node.total = []
    node._total = []
    node.childs.forEach((_id) => {
      const _node = tree.find((e) => e.id == _id)

      node.total.push(_node.total_points)
      node._total.push(_node.total_points)
    })
    node.total.sort((a, b) => b - a)
  })
  // const Dashboardjs = exportDashboardjs(tree)

  // // ranks calculate
  // for (let node of tree) Dashboardjs.rank(node) // BRONCE, PLATA, ACTIVOS

  // // Sort from low rank to hight rank
  // for (let node of tree) if (Dashboardjs.is_rank(node, 'ORO')) node.rank = 'ORO' // -> BRONCE
  // for (let node of tree)
  //   if (Dashboardjs.is_rank(node, 'PLATINO')) node.rank = 'PLATINO' // -> PLATA, BRONCE
  // for (let node of tree)
  //   if (Dashboardjs.is_rank(node, 'RUBI')) node.rank = 'RUBI' // -> ORO, PLATA, PLATA
  // for (let node of tree)
  //   if (Dashboardjs.is_rank(node, 'ZAFIRO')) node.rank = 'ZAFIRO' // -> PLATINO, ORO, ORO
  // for (let node of tree)
  //   if (Dashboardjs.is_rank(node, 'DIAMANTE')) node.rank = 'DIAMANTE' // -> RUBI, PLATINO, PLATINO
  // for (let node of tree)
  //   if (Dashboardjs.is_rank(node, 'RUBÍ'))
  //     node.rank = 'RUBÍ' // -> ZAFIRO, RUBI, RUBI
  // for (let node of tree)
  //   if (Dashboardjs.is_rank(node, 'EMBAJADOR ELITE'))
  //     node.rank = 'EMBAJADOR ELITE' // -> DIAMANTE, ZAFIRO, ZAFIRO, RUBI
  // for (let node of tree)
  //   if (Dashboardjs.is_rank(node, 'EMBAJADOR DUNAMIS'))
  //     node.rank = 'EMBAJADOR DUNAMIS' // -> EMBAJADOR ELITE, RUBÍ, DIAMANTE, DIAMANTE

  // for (let node of tree) Dashboardjs.next_rank(node)

  // anidation tree
  find('5f0e0b67af92089b5866bcd0', 0)

  console.log(node)

  return res.json(
    success({
      name: user.name,
      lastName: user.lastName,
      affiliated: user.affiliated,
      _activated: user._activated,
      activated: user.activated,
      plan: user.plan,
      country: user.country,
      photo: user.photo,
      tree: user.tree,

      id: user.id,
      node,
    })
  )
}

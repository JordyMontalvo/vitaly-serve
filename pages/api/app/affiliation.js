import db from '../../../components/db'
import lib from '../../../components/lib'

const {
  User,
  Session,
  Plan,
  Product,
  Affiliation,
  Office,
  Tree,
  Transaction,
  PlatformConfig,
} = db
const { error, success, midd, rand, acum } = lib

let tree

let pay_basic = 0
let pay_standard = 0
let pay_business = 0
let pay_master = 0

function total_pay(id, parent_id) {
  const node = tree.find((e) => e.id == id)

  let val = 0

  if (node.parentId == parent_id && !node.closed) {
    if (node.plan == 'basic') val = 50
    if (node.plan == 'standard') val = 150
    if (node.plan == 'business') val = 300
    if (node.plan == 'master') val = 500
  }

  pay_basic += 0.2 * val
  pay_standard += 0.4 * val
  pay_business += 0.4 * val
  pay_master += 0.4 * val

  node.childs.forEach((_id) => {
    total_pay(_id, parent_id)
  })
}

export default async (req, res) => {
  await midd(req, res)

  // valid session
  let { session } = req.query
  session = await Session.findOne({ value: session })
  if (!session) return res.json(error('invalid session'))

  // get USER
  const user = await User.findOne({ id: session.id })

  // get PLANS
  let plans = await Plan.find({})

  // get PRODUCTS
  const products = await Product.find({})

  // get last AFFILIATION pending or approved
  const affiliation = await Affiliation.findOneLast({
    userId: user.id,
    status: { $in: ['pending', 'approved'] },
  })
  const affiliations = await Affiliation.find({
    userId: user.id,
    status: 'approved',
  })

  if (affiliation && affiliation.status == 'approved') {
    if (affiliation.plan.id == 'standard') {
      plans.shift()
    }
    if (affiliation.plan.id == 'master') {
      plans.shift()
    }
    if (affiliation.plan.id == 'gold') {
      plans = []
    }
  }

  // get transactions
  const transactions = await Transaction.find({
    user_id: user.id,
    virtual: { $in: [null, false] },
  })
  const _transactions = await Transaction.find({
    user_id: user.id,
    virtual: true,
  })

  const ins = acum(transactions, { type: 'in' }, 'value')
  const outs = acum(transactions, { type: 'out' }, 'value')
  const _ins = acum(_transactions, { type: 'in' }, 'value')
  const _outs = acum(_transactions, { type: 'out' }, 'value')

  const balance = ins - outs
  const _balance = _ins - _outs
  const _balance_aff = user.profit_aff

  // if(user.plan == 'default') {

  //   const users = await User.find({ tree: true })
  //         tree  = await Tree.find({})

  //   tree.forEach(node => {

  //     const user = users.find(e => e.id == node.id)

  //     node.plan               = user.plan
  //     node.affiliation_points = user.affiliation_points
  //     node.parentId           = user.parentId
  //     node.closeds            = user.closeds ? true : false
  //   })

  //   pay_basic    = 0
  //   pay_standard = 0
  //   pay_business = 0
  //   pay_master   = 0

  //   const node = tree.find(e => e.id == user.id)

  //   node.childs.forEach(_id => {
  //     total_pay(_id, node.id)
  //   })

  //   plans[0].pay = pay_basic
  //   plans[1].pay = pay_standard
  //   plans[2].pay = pay_business
  //   plans[3].pay = pay_master

  // }

  if (req.method == 'GET') {
    const offices = await Office.find({})
    const platform_configs = await PlatformConfig.get()

    return res.json(
      success({
        platform_configs: platform_configs,

        name: user.name,
        lastName: user.lastName,
        affiliated: user.affiliated,
        _activated: user._activated,
        activated: user.activated,
        plan: user.plan,
        country: user.country,
        photo: user.photo,
        tree: user.tree,

        plans,
        products,
        affiliation,
        affiliations,
        offices,

        balance,
        _balance,
        _balance_aff,
      })
    )
  }

  if (req.method == 'POST') {
    let {
      products,
      price,
      selec_plan,
      voucher,
      office,
      check,
      remaining,
      pay_method,
      bank,
      date,
      voucher_number,
      total,
    } = req.body

    const plan = selec_plan

    let transactions = []
    let amounts

    if (check) {
      const balanceByAffiliate = _balance_aff < price ? _balance_aff : price // descuento de saldo bono por afiliados
      let r = price - _balance_aff > 0 ? price - _balance_aff : 0
      const balanceUnavailable = _balance < r ? _balance : r
      r = price - _balance > 0 ? price - _balance : 0
      const balanceAvailable = balance < r ? balance : r
      const realCost = price - balanceUnavailable - balanceByAffiliate
      console.log({
        balanceByAffiliate,
        balanceUnavailable,
        balanceAvailable,
        realCost,
      })

      const id0 = rand()
      const id1 = rand()
      const id2 = rand()

      amounts = [
        balanceByAffiliate,
        balanceUnavailable,
        balanceAvailable,
        realCost,
      ]

      if (balanceByAffiliate) {
        transactions.push(id0)
        await Transaction.insert({
          id: id0,
          date: new Date(),
          user_id: user.id,
          type: 'out_profit_aff',
          value: balanceByAffiliate,
          name: 'affiliation_balance_affiliation',
          virtual: false,
        })
        await User.updateInc(
          { id: user.id },
          {
            profit_aff: -balanceByAffiliate,
          }
        )
      }

      if (balanceUnavailable) {
        transactions.push(id1)

        await Transaction.insert({
          id: id1,
          date: new Date(),
          user_id: user.id,
          type: 'out',
          value: balanceUnavailable,
          name: 'affiliation',
          virtual: true,
        })
      }

      if (balanceAvailable) {
        transactions.push(id2)

        await Transaction.insert({
          id: id2,
          date: new Date(),
          user_id: user.id,
          type: 'out',
          value: balanceAvailable,
          name: 'affiliation',
          virtual: false,
        })
      }
    }

    const parent = await User.findOne({ id: user.parentId })
    const coverage = parent.coverage

    await Affiliation.insert({
      id: rand(),
      date: new Date(),
      userId: user.id,
      products,
      price,
      plan,
      voucher,
      office,
      status: 'pending',
      delivered: false,

      transactions,
      amounts,

      pay_method,
      bank,
      voucher_date: date,
      voucher_number,

      coverage,

      total,
    })

    return res.json(success())
  }
}

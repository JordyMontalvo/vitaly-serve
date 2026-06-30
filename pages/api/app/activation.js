import db from '../../../components/db'
import lib from '../../../components/lib'

const {
  User,
  Session,
  Product,
  Activation,
  Office,
  Transaction,
  PlatformConfig,
} = db
const { error, success, midd, map, rand, acum } = lib

export default async (req, res) => {
  await midd(req, res)

  let { session } = req.query

  // valid session
  session = await Session.findOne({ value: session })
  if (!session) return res.json(error('invalid session'))

  // check verified
  const user = await User.findOne({ id: session.id })
  console.log(user.plan)

  // get plans
  let _products = await Product.find({})

  let i

  if (user.plan == 'basic') i = 0
  if (user.plan == 'standard') i = 1
  if (user.plan == 'business') i = 2
  if (user.plan == 'master') i = 3
  console.log({ i })

  _products.forEach((p) => {
    const price = p.price
    console.log(p.name)
    console.log(p.price)
    console.log('')

    // p.price = p.price[i]
  })

  const profit = user.profit ? user.profit : 0

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

  if (req.method == 'GET') {
    const offices = await Office.find({})
    const platform_configs = await PlatformConfig.get()

    if (!user.affiliated) return res.json(error('user not affiliated'))

    // response
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

        products: _products,
        points: user.points,
        profit,
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
      office,
      check,
      voucher,
      pay_method,
      bank,
      date,
      voucher_number,
    } = req.body

    const total = products.reduce((a, b) => a + b.total, 0)
    const price = products.reduce((a, b) => a + b.price * b.total, 0)
    const points = products.reduce((a, b) => a + b.points * b.total, 0)

    let transactions = []
    let amounts

    if (check) {
      const balanceByAffiliate = _balance_aff < price ? _balance_aff : price // descuento de saldo bono por afiliados
      let r = price - _balance_aff > 0 ? price - _balance_aff : 0
      const balanceUnavailable = _balance < r ? _balance : r // descuento de saldo no disponle
      r = price - _balance > 0 ? price - _balance : 0
      const balanceAvailable = balance < r ? balance : r // descuento de saldo disponle
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
          name: 'activation_balance_affiliation',
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
          name: 'activation',
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
          name: 'activation',
          virtual: false,
        })
      }
    }

    // save new activation
    await Activation.insert({
      id: rand(),
      date: new Date(),
      userId: user.id,
      products,
      price,
      points,
      total,
      // _total,
      check,
      voucher,
      transactions,
      amounts,
      office,
      status: 'pending',
      delivered: false,

      pay_method,
      bank,
      voucher_date: date,
      voucher_number,
    })

    // response
    return res.json(success())
  }
}

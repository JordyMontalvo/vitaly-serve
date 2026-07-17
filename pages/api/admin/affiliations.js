import db from '../../../components/db'
import lib from '../../../components/lib'

const { Affiliation, User, Tree, Token, Transaction, Office, PlatformConfig } =
  db
const { error, success, midd, ids, parent_ids, map, model, rand } = lib

const A = [
  'id',
  'date',
  'plan',
  'voucher',
  'status',
  'office',
  'delivered',
  'remaining',
  'pay_method',
  'bank',
  'voucher_date',
  'voucher_number',
  'amounts',
  'price',
  'products',
]
const U = ['name', 'lastName', 'dni', 'phone']

let users = null
let tree = null

const pay = {
  standard: [175],
  master: [350],
}

let pays = []

let __id, __j

function find(id, j) {
  const node = tree.find((e) => e.id == id)
  const n = node.childs.length

  if (n < 3) {
    if (j < __j) {
      __j = j
      __id = id
    }
  }

  node.childs.forEach((_id) => {
    find(_id, j + 1)
  })
}

/**
 * @param {Object}    args
 * @param {String}    args.id     ID de usuario patrocinador
 * @param {Number}    args.value  Monto a pagar
 * @param {String}    args.aff_id ID de afiliacion
 * @param {String}    args._id    ID del usuario actual
 * @param {Boolean}   args.virtual Si es saldo no disponible
 * @returns {Promise<void>}
 */
async function pay_bonus({ id, value, aff_id, _id, virtual = false }) {
  const user = users.find((e) => e.id == id)
  if (!user) return

  const txId = rand()

  await Transaction.insert({
    id: txId,
    date: new Date(),
    user_id: user.id,
    type: 'in',
    value: value,
    n: 1,
    name: 'affiliation bonus',
    affiliation_id: aff_id,
    _user_id: _id,
    virtual: virtual,
  })

  pays.push(txId)
}

/**
 * @param {Object}  platform_configs
 * @param {String}  key
 * @param {Number}  points_total
 * @return {Boolean}
 */
function activateByConfig(platform_configs, key, points_total) {
  switch (platform_configs.steps_affiliation[key].mode) {
    case 'default': {
      return platform_configs.steps_affiliation[key].value
    }
    case 'condition': {
      // console.log(p.steps_activation[key].codition)
      console.log(p.steps_activation[key].codition.code)
      const conditionCodeActivation = eval(
        '(' + p.steps_activation[key].codition.code + ')'
      )
      // Ejecución de la función almacenada en el documento
      return conditionCodeActivation(points_total) // Pasando 5 como argumento a la función
    }
    default: {
      new ReferenceError(
        `"${platform_configs.steps_affiliation.activated_default.mode}" not supported in ${key}`
      )
    }
  }
}

const handler = async (req, res) => {
  const platform_configs = await PlatformConfig.get()

  if (req.method == 'GET') {
    // validate filter
    const { filter } = req.query

    const q = { all: {}, pending: { status: 'pending' } }

    if (!(filter in q)) return res.json(error('invalid filter'))

    const { account } = req.query

    // get AFFILIATIONS
    let qq = q[filter]

    if (account != 'admin') qq.office = account

    let affiliations = await Affiliation.find(qq)

    // get USERS for affiliations
    let users = await User.find({ id: { $in: ids(affiliations) } })
    users = map(users)

    // enrich affiliations
    affiliations = affiliations.map((a) => {
      let u = users.get(a.userId)

      a = model(a, A)
      u = model(u, U)

      return { ...a, ...u }
    })

    let parents = await User.find({ id: { $in: parent_ids(affiliations) } })

    return res.json(success({ affiliations }))
  }

  if (req.method == 'POST') {
    const { id, action } = req.body

    // get affiliation
    let affiliation = await Affiliation.findOne({ id })

    // validate affiliation
    if (!affiliation) return res.json(error('affiliation not exist'))

    if (action == 'approve' || action == 'reject') {
      if (affiliation.status == 'approved')
        return res.json(error('already approved'))
      if (affiliation.status == 'rejected')
        return res.json(error('already rejected'))
    }

    if (action == 'approve') {
      console.log('approve')

      await Affiliation.update({ id }, { status: 'approved' })

      let user = await User.findOne({ id: affiliation.userId })
      console.log({ user })

      // const activated = (affiliation.plan.id == 'standard' || affiliation.plan.id == 'master') ? true : false
      const activated = true

      await User.update(
        { id: user.id },
        {
          affiliated: true,
          activated,
          affiliation_date: new Date(),
          plan: affiliation.plan.id,
          n: affiliation.plan.n,
          affiliation_points: affiliation.plan.affiliation_points,
        }
      )

      console.log(affiliation.plan.id)

      if (affiliation.plan.id != 'basic') {
        console.log('hace red ...')

        tree = await Tree.find({})
        users = await User.find({})

        // if (user.plan == 'default' || user.plan == 'basic') {
        if (!user.tree) {

          // token
          const token = await Token.findOne({ free: true })
          if (!token) return res.json(error('token not available'))

          await Token.update({ value: token.value }, { free: false })

          // const coverage = user.laverage ?? {
          //   id: user.id,
          // }
          // console.log({ coverage })

          await User.update(
            { id: user.id },
            {
              tree: true,
              // coverage: coverage,
              coverage: {
                id: user.id,
              },
              token: token.value,
            }
          )


          // tree
          const parent = await User.findOne({ id: user.parentId })
          // let _id = parent.coverage.id
          let _id = user.laverage?.id || user.parentId
          console.log({ _id })
          const _user = users.find((e) => e.id == _id)
          let node = tree.find((e) => e.id == _id)
          console.log({ node })

          const n = node.childs.length

          if (n == 3) {
            let i = _user.i != null ? _user.i : -1

            i += 1
            if (i == 3) i = 0

            _id = node.childs[i]
              ; (__id = null), (__j = 1000)

            find(_id, 0)

            _id = __id

            await User.update({ id: parent.id }, { i })
          }

          node = tree.find((e) => e.id == _id)
          node.childs.push(user.id)

          await Tree.update({ id: _id }, { childs: node.childs })
          await Tree.insert({ id: user.id, childs: [], parent: _id })
        }

        // pay BONUS

        pays = []

        const bonusValueLevel1 = (affiliation.price || 0) * 0.40
        const bonusValueLevel2 = (affiliation.price || 0) * 0.10

        // Nivel 1: 40%
        await pay_bonus({
          id: user.parentId,
          value: bonusValueLevel1,
          aff_id: affiliation.id,
          _id: user.id,
        })

        // Nivel 2: 10%
        const parentUser = users.find((u) => u.id === user.parentId)
        if (parentUser && parentUser.parentId) {
          const grandParentUser = users.find((u) => u.id === parentUser.parentId)
          if (grandParentUser) {
            const isVirtual = !grandParentUser.activated
            await pay_bonus({
              id: grandParentUser.id,
              value: bonusValueLevel2,
              aff_id: affiliation.id,
              _id: user.id,
              virtual: isVirtual,
            })
          }
        }

        // tree = await Tree.find({})

        // const node = tree.find((e) => e.id == user.id)

        // await pay_bonus({
        //   id: node.parent,
        //   i: 0,
        //   arr: pay[plan],
        //   value: pay[plan][0],
        //   aff_id: affiliation.id,
        //   _id: user.id,
        // })


        affiliation.transactions = affiliation.transactions.concat(pays)

        await Affiliation.update(
          { id },
          { transactions: affiliation.transactions }
        )
      }

      // UPDATE STOCK
      console.log('UPDATE STOCK ...')
      const office_id = affiliation.office
      const products = affiliation.products

      const office = await Office.findOne({ id: office_id })

      products.forEach((p, i) => {
        if (office.products[i]) office.products[i].total -= products[i].total
      })

      await Office.update(
        { id: office_id },
        {
          products: office.products,
        }
      )

      // migrar transaccinoes virtuales
      const transactions = await Transaction.find({
        user_id: user.id,
        virtual: true,
      })

      for (let transaction of transactions) {
        console.log({ transaction })
        await Transaction.update({ id: transaction.id }, { virtual: false })
      }

      // PROFIT OFFICE
      let office_profit_total = office.profit ? office.profit : 0

      office_profit_total += 2 * affiliation.total

      await Office.update(
        { id: office_id },
        {
          profit: office_profit_total,
        }
      )
    }

    if (action == 'reject') {
      await Affiliation.update({ id }, { status: 'rejected' })

      const user = await User.findOne({ id: affiliation.userId })

      // revert transactions
      if (affiliation.transactions) {
        const refunds = await Transaction.find({
          id: { $in: affiliation.transactions },
          type: 'out_profit_aff',
        })
        for (let transactionId of affiliation.transactions) {
          const transactionRefund = refunds.find(
            (el) => el.id === transactionId
          )
          if (transactionRefund) {
            await User.updateInc(
              { id: user.id },
              {
                profit_aff: transactionRefund.value,
              }
            )
          }
          await Transaction.delete({ id: transactionId })
        }
      }
    }

    if (action == 'check') {
      await Affiliation.update({ id }, { delivered: true })
    }

    if (action == 'uncheck') {
      await Affiliation.update({ id }, { delivered: false })
    }

    if (action == 'revert') {
      console.log('revert')

      const user = await User.findOne({ id: affiliation.userId })

      await Affiliation.delete({ id })

      const transactions = affiliation.transactions
      console.log(transactions)

      for (let id of transactions) {
        await Transaction.delete({ id })
      }

      const affiliations = await Affiliation.find({
        userId: user.id,
        status: 'approved',
      })

      if (affiliations.length) {
        affiliation = affiliations[affiliations.length - 1]

        let activatedValue = await activateByConfig(
          platform_configs,
          'activated_default',
          0
        )
        let _activatedValue = await activateByConfig(
          platform_configs,
          '_activated_default',
          0
        )

        await User.update(
          { id: user.id },
          {
            // affiliated: false,
            activated: activatedValue,
            _activated: _activatedValue,
            plan: affiliation.plan.id,
            affiliation_date: affiliation.date,
            affiliation_points: affiliation.plan.affiliation_points,
            n: affiliation.plan.n,
          }
        )
      } else {
        await User.update(
          { id: user.id },
          {
            affiliated: false,
            activated: false,
            _activated: false,
            plan: 'default',
            affiliation_date: null,
            affiliation_points: 0,
            n: 0,
          }
        )
      }

      // UPDATE STOCK
      console.log('UPDATE STOCK ...')
      const office_id = affiliation.office
      const products = affiliation.products

      const office = await Office.findOne({ id: office_id })

      products.forEach((p, i) => {
        if (office.products[i]) office.products[i].total += products[i].total
      })

      await Office.update(
        { id: office_id },
        {
          products: office.products,
        }
      )
    }

    return res.json(success())
  }
}

export default async (req, res) => {
  await midd(req, res)
  return handler(req, res)
}

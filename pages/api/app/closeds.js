import db from '../../../components/db'
import lib from '../../../components/lib'

const { User, Session, Closed } = db
const { error, success, midd } = lib

export default async (req, res) => {
  await midd(req, res)

  let { session } = req.query

  // valid session
  session = await Session.findOne({ value: session })
  if (!session) return res.json(error('invalid session'))

  // check verified
  const user = await User.findOne({ id: session.id })
  // if(!user.verified) return res.json(error('unverified user'))

  const closeds = await Closed.find({})

  const users = await User.find({})

  closeds.forEach(closed => {
    if(closed.aff_transactions) {
      closed.aff_transactions.forEach(aff_transaction => {
        const _user = users.find(u => u.id == aff_transaction._user_id)

        aff_transaction._name = _user.name + ' ' + _user.lastName
        aff_transaction._dni  = _user.dni
      })
    }
  })


  if (req.method == 'GET') {
    // response
    return res.json(
      success({
        name:       user.name,
        lastName:   user.lastName,
        affiliated: user.affiliated,
        activated:  user.activated,
       _activated:  user._activated,
        plan:       user.plan,
        country:    user.country,
        photo:      user.photo,
        tree:       user.tree,

        id: user.id,
        closeds,
      })
    )
  }
}

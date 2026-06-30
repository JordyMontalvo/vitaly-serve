import db  from "../../../components/db"
import lib from "../../../components/lib"

const { User, Session, Transaction } = db
const { error, success, midd, acum } = lib


const handler = async (req, res) => {

  let { session } = req.query

  // valid session
  session = await Session.findOne({ value: session })
  if(!session) return res.json(error('invalid session'))

  // get USER
  const user = await User.findOne({ id: session.id })

  const bonuses = {
    sapphire: [],
    ruby: [],
    gold: [],
    diamond: [],
  }

  // response
  return res.json(success({
    name:       user.name,
    lastName:   user.lastName,
    affiliated: user.affiliated,
    activated:  user.activated,
   _activated:  user._activated,
    plan:       user.plan,
    country:    user.country,
    photo:      user.photo,
    tree:       user.tree,

    pays:    user.pays,
    // bonuses: user.bonuses || bonuses,
  }))
}

export default async (req, res) => { await midd(req, res); return handler(req, res) }

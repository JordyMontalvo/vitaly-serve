
import db  from "../../../components/db"
import lib from "../../../components/lib"

const { User, Session, Tool, ToolsSocial } = db
const { error, success, midd } = lib

const sortByOrder = (a, b) => (Number(a.order || 0) - Number(b.order || 0))

export default async (req, res) => {
  if (await midd(req, res)) return

  let { session } = req.query

  // valid session
  session = await Session.findOne({ value: session })
  if(!session) return res.json(error('invalid session'))

  // get USER
  const user = await User.findOne({ id: session.id })


  if(req.method == 'GET') {
    let tools = (await Tool.find({ active: true })).map((t) => {
      if (t && t._id) delete t._id
      return t
    })
    tools.sort(sortByOrder)

    let socialLinks = { facebookLink: '', tiktokLink: '' }
    try {
      socialLinks = await ToolsSocial.get()
    } catch (e) {
      console.error('app tools social get', e)
    }

    // response
    return res.json(success({
      name:       user.name,
      lastName: user.lastName,
      affiliated: user.affiliated,
      activated:  user.activated,
     _activated:  user._activated,
      plan:       user.plan,
      country:    user.country,
      photo:      user.photo,
      tree:       user.tree,
      tools,
      socialLinks,
    }))
  }
}
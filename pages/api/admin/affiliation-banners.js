import db from "../../../components/db"
import lib from "../../../components/lib"

const { Plan, AffiliationBanner } = db
const { success, midd } = lib

export default async (req, res) => {
  await midd(req, res)

  if (req.method === 'GET') {
    const plans = await Plan.find({})
    const banners = await AffiliationBanner.find({})

    return res.json(success({ plans, banners }))
  }

  if (req.method === 'POST') {
    const { action, id, planId, imgUrl } = req.body

    if (action === 'add') {
      const newBanner = {
        id: lib.rand(),
        planId,
        imgUrl,
      }
      await AffiliationBanner.insert(newBanner)
    }

    if (action === 'delete') {
      await AffiliationBanner.delete({ id })
    }

    return res.json(success())
  }
}

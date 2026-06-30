
import db from '../../../components/db'
import lib from '../../../components/lib'

const { Tool, ToolsSocial } = db
const { midd, success, error, rand } = lib

const sortByOrder = (a, b) => Number(a.order || 0) - Number(b.order || 0)

export default async (req, res) => {
  if (await midd(req, res)) return

  if (req.method == 'GET') {
    const tools = await Tool.find({})
    tools.sort(sortByOrder)
    let socialLinks = { facebookLink: '', tiktokLink: '' }
    try {
      socialLinks = await ToolsSocial.get()
    } catch (e) {
      console.error('admin tools social get', e)
    }
    return res.json(success({ tools, socialLinks }))
  }

  if (req.method == 'POST') {
    let body = req.body
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body)
      } catch (e) {
        body = {}
      }
    }
    const { action, id, data } = body || {}

    if (action == 'add') {
      const tool = {
        id: rand(),
        order: Number(data?.order ?? 0),
        title: data?.title || '',
        description: data?.description || '',
        link: data?.link || '',
        img: data?.img || '',
        active: data?.active !== false,
      }
      await Tool.insert(tool)
      return res.json(success({ tool }))
    }

    if (action == 'edit') {
      const patch = {
        order: Number(data?.order ?? 0),
        title: data?.title || '',
        description: data?.description || '',
        link: data?.link || '',
        img: data?.img || '',
        active: data?.active !== false,
      }
      await Tool.update({ id }, patch)
      return res.json(success({}))
    }

    if (action == 'delete') {
      await Tool.delete({ id })
      return res.json(success({}))
    }

    if (action == 'social') {
      try {
        await ToolsSocial.upsert(data || {})
        const socialLinks = await ToolsSocial.get()
        return res.json(success({ socialLinks }))
      } catch (e) {
        console.error('tools social upsert', e)
        return res.status(500).json(error('no se pudo guardar enlaces sociales'))
      }
    }

    return res.json(error('acción inválida'))
  }

  return res.json(success({}))
}
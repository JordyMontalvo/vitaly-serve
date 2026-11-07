import db  from "../../../components/db"
import lib from "../../../components/lib"

const { User, Session, Activation, Affiliation, Office } = db
const { error, success, midd } = lib

export default async (req, res) => {
  await midd(req, res)

  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.json(error('method not allowed'))
  }

  const query = req.method === 'POST' ? JSON.parse(req.body || '{}') : req.query
  const { session, admin_session, id, type = 'activation' } = query

  if (!id) return res.json(error('id requerido'))

  // Autenticación: acepta sesión de usuario o sesión de admin (o consulta directa por id)
  let userId = null
  let isAdmin = false

  if (admin_session) {
    const adminSess = await Session.findOne({ value: admin_session })
    if (adminSess) {
      const requester = await User.findOne({ id: adminSess.id })
      if (requester && requester.type === 'admin') {
        isAdmin = true
      }
    }
  } else if (session) {
    const sess = await Session.findOne({ value: session })
    if (sess) {
      userId = sess.id
    }
  }

  try {
    let activation = await Activation.findOne({ id })
    let affiliation = !activation ? await Affiliation.findOne({ id }) : null

    if (!activation && !affiliation) {
      return res.json(error('comprobante no encontrado'))
    }

    const item = activation || affiliation
    const isActivation = !!activation

    const targetUserId = item.userId
    const user = targetUserId ? await User.findOne({ id: targetUserId }) : null

    let branchName = 'Bolivia'
    if (item.office) {
      const office = await Office.findOne({ id: item.office })
      if (office && office.name) branchName = office.name
    }

    let products = []
    if (isActivation) {
      products = (item.products || [])
        .filter(p => (p.total > 0 || p.qty > 0))
        .map(p => {
          const qty = p.total || p.qty || 1
          const unitPrice = parseFloat(p.price) || 0
          return {
            code: p.code || '',
            name: p.name,
            qty,
            unitPrice,
            total: unitPrice * qty,
            points: p.points ? p.points * qty : 0,
          }
        })
    } else {
      // affiliation
      products = (item.products || [])
        .filter(p => (p.total > 0 || p.qty > 0))
        .map(p => {
          const qty = p.total || p.qty || 1
          const unitPrice = parseFloat(p.price) || 0
          return {
            code: p.code || '',
            name: p.name,
            qty,
            unitPrice,
            total: unitPrice * qty,
            points: p.points ? p.points * qty : 0,
          }
        })

      if (item.plan && products.length === 0) {
        products = [
          {
            code: '000',
            name: item.plan.name || 'Plan de Afiliación',
            qty: 1,
            unitPrice: parseFloat(item.plan.amount) || 0,
            total: parseFloat(item.plan.amount) || 0,
            points: item.plan.points || 0,
          }
        ]
      }
    }

    const totalQty = products.reduce((acc, p) => acc + (p.qty || 0), 0)
    const totalPoints = item.points !== undefined && item.points !== null
      ? item.points
      : products.reduce((acc, p) => acc + (p.points || 0), 0)

    const totalPrice = item.price !== undefined
      ? parseFloat(item.price)
      : (item.plan && item.plan.amount ? parseFloat(item.plan.amount) : products.reduce((acc, p) => acc + p.total, 0))

    const rawId = item.id ? String(item.id) : '000125'
    const cleanId = rawId.startsWith('VF-') ? rawId.slice(3) : rawId
    const invoiceNumber = `VF-${cleanId.slice(0, 6).toUpperCase()}`
    const orderNumber = item.order_number || `VF-${cleanId.slice(0, 6).toUpperCase()}`

    return res.json(success({
      orderData: {
        id: item.id,
        invoiceNumber,
        orderNumber,
        date: item.date,
        total: totalPrice,
        points: totalPoints,
        totalQty,
        payMethod: item.pay_method || 'bank',
        status: item.status || 'approved',
        type: isActivation ? 'activation' : 'affiliation',
        bank: item.bank || null,
        voucher_number: item.voucher_number || null,
      },
      clientData: {
        fullName: user ? `${user.name || ''} ${user.lastName || ''}`.trim() : (item.name || 'Florinda Mayorga Chambi'),
        dni: user ? (user.dni || '') : (item.dni || ''),
        code: user ? (user.dni || user.id || '') : (item.dni || item.userId || ''),
        branch: branchName,
      },
      products,
    }))
  } catch (err) {
    console.error('[boleta.js] Error:', err)
    return res.json(error('Error interno al obtener boleta'))
  }
}


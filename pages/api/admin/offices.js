import db from "../../../components/db"
import lib from "../../../components/lib"

const { Office, Product, Recharge } = db
const { success, midd } = lib


export default async (req, res) => {
  await midd(req, res)
  console.log('..... 11')

  let offices = await Office.find({})
  let products = await Product.find({})
  let recharges = await Recharge.find({})
  console.log('..... 112')

  for (let office of offices) {
    console.log('..... 13')

    for (let product of products) {
      console.log('..... 14')

      const p = office.products.find(e => e.id == product.id)

      if (!p)
        office.products.push({
          id: product.id,
          total: 0,
        })
    }
  }
  console.log('..... 15')

  if (req.method == 'GET') {
    console.log('..... 1')
    offices = offices.map(office => {
      console.log('..... 2')

      office.products = office.products.map(p => {
        console.log('..... 3')

        const product = products.find(e => e.id == p.id)
        p.name = product?.name

        return p
      })
      console.log('..... 4')

      office.recharges = recharges.filter(r => r.office_id == office.id)

      return office
    })

    console.log('..... 5')

    return res.json(success({ offices }))
  }

  if (req.method == 'POST') {

    const { id, products, office } = req.body
    // console.log({ products })

    if (products) {
      // const office = await Office.findOne({ id })
      const office = offices.find(e => e.id == id)
      // console.log(office)

      products.forEach((p, i) => {
        // console.log({ i , p })
        office.products[i].total += products[i].total
      })

      // console.log(office)

      await Office.update(
        { id },
        { products: office.products }
      )

      await Recharge.insert({
        date: new Date(),
        office_id: id,
        products
      })

    }

    if (req.body.action === 'create') {
      const { office } = req.body
      const newOffice = {
        id: lib.rand(),
        email: office.email || '',
        password: office.password || '',
        name: office.name || '',
        address: office.address || '',
        accounts: office.accounts || '',
        qr_image: office.qr_image || '',
        products: []
      }
      await Office.insert(newOffice)
      return res.json(success())
    }

    if (req.body.action === 'delete') {
      const { id } = req.body
      await Office.delete({ id })
      return res.json(success())
    }

    if (office) {
      console.log(' update office ', office)
      await Office.update(
        { id },
        {
          email: office.email,
          password: office.password,
          name: office.name,
          address: office.address,
          accounts: office.accounts,
          qr_image: office.qr_image !== undefined ? office.qr_image : '',
        }
      )
    }

    return res.json(success())
  }
}

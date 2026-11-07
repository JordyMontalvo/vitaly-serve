import db  from "../../../components/db"
import lib from "../../../components/lib"

const { Activation, Affiliation, User, Office, Product } = db
const { error, success, midd } = lib


const Invoice = async (req, res) => {

  const { id } = JSON.parse(req.body)
  console.log({ id })

  // get activation
  const activation = await Activation.findOne({ id })
  const affiliation = await Affiliation.findOne({ id })
  // console.log(activation)

  // get products
  // let { products } = activation
  // let products = activation ? activation.products : affiliation.plan.products
  let products = activation ? activation.products : affiliation.products
  let date     = activation ? activation.date     : affiliation.date
  let pay_method = activation ? activation.pay_method : affiliation.pay_method
  // console.log(products)

  if(!activation) {
    console.log(products)

    const _products = await Product.find({})

    // products.forEach(group => {
    //   group.list.forEach(product => {

    //     const p = _products.find(p => p.id == product.id)

    //     product.name  = p.name
    //     // product.price = p.price
    //     product.price = 0
    //     console.log(product.name)
    //   })
    // })


    products.forEach(product => {
      const p = _products.find(p => p.id == product.id)

      product.name  = p.name
      product.code  = p.code
      // product.price = p.price
      product.price = 0
      console.log(product.name)
    })

    // products = products[0].list
    products = [{ code: '000', name: affiliation.plan.name, total: 1, price: affiliation.plan.amount }].concat(products)
  }

  products = products.filter(product => product.total > 0)
  // console.log(products)

  // const userId = activation.userId
  const userId = activation ? activation.userId : affiliation.userId
  const user = await User.findOne({ id: userId })
  console.log({ user })


  // const office = await Office.findOne({ id: activation.office })
  const office = activation ? await Office.findOne({ id: activation.office }) : await Office.findOne({ id: affiliation.office })


  const points = activation ? (activation.points || 0) : (affiliation ? (affiliation.points || (affiliation.plan ? affiliation.plan.points : 0)) : 0)
  const price  = activation ? activation.price : (affiliation ? (affiliation.plan ? affiliation.plan.amount : 0) : 0)

  // response
  return res.json(success({
    products,
    user,
    office,
    date,
    pay_method,
    points,
    price,
  }))
}

export default async (req, res) => { await midd(req, res); return Invoice(req, res) }

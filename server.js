const stripe = require('stripe')('sk_test_51HcYc4FbotLHFPNb5D7z1LAWupGJsRItoHn4ugfHgDZuuS0NAmx4fCfuYGVBeyIgpGgQDZdRzQpTghx6E0bjm5cd00Eq88kkqf');
const endpointSecret = 'whsec_Yx7ENY5st3cQg6D16QgcXf3CUvzL3Ti3';

const express = require('express');
const cors = require('cors')
const fileUpload = require('express-fileupload')
const knex = require('knex')


const app = express();
const adminLogin = 'admin'
const adminPass = '123'

const PORT = process.env.PORT;

const frontAdress = 'http://localhost:3000';
const backAdress = 'http://localhost:3001';

console.log(`listening on ${PORT}`)

const db = knex({
  client: 'pg',
  connection: {
    host : process.env.DATABASE_URL,
    ssl : 'true',
  }
});

app.use((req, res, next) => {
  if (req.originalUrl === '/webhook') {
    next();
  } else {
    express.json()(req, res, next);
  }
});
app.use(cors());
app.listen(PORT, () => {
});
app.use('/images', express.static('images'))
app.use(fileUpload());


app.get('/', (req, res) => {
  res.send('check')
})

app.get('/excursions', (req, res) => {  
  const refactorResponse = (data) => {
    const responseData = [];
    data.forEach(e => {
      let excursion = {
        excTitle: e.title,
        mainId: e.id,
        excDate: e.date,
        excPlace: e.place,
        maxCap: e.capacity,
        excDescription: e.description,
        excImageUrl: e.imageurl,
        excPrice: e.price,
        bookedSeats: e.bookedseats
      }
      responseData.push(excursion);
    });
    return responseData
  }
  db
    .select('*')
    .from('excursionlist')
    .then(data => res.json(refactorResponse(data)))
    .catch(res.status(400).json('unable to get excursions'))
})

app.get('/excursion/:id', (req, res) => {
  const refactorResponse = (data) => {
    let e = data[0];
    let excursion = {
      excTitle: e.title,
        mainId: e.id,
        excDate: e.date,
        excPlace: e.place,
        maxCap: e.capacity,
        excDescription: e.description,
        excImageUrl: e.imageurl,
        excPrice: e.price,
        bookedSeats: e.bookedseats
    }
    appendSeats(excursion)
  }

  const appendSeats = (excursion) => {
    db 
    .select('seats')
    .from('users')
    .where('excursion_id', id)
      .then(data => {
      let seats = [];
        data.forEach(o => {          
          seats = seats.concat(o.seats)         
        })
          return seats;
      }).then(seats => {
        excursion = Object.assign(excursion, { bookedSeats: seats });
        res.json(excursion)
      }).catch(res.status(400).json("unable to append seats"))
  }

  const { id } = req.params;  
  db('excursionlist')
    .select('*')
    .where('id', id)
    .then(data => refactorResponse(data))
  
})

app.post(`/login`, (req, res) => {
  const { login, password } = req.body;
  if (login === adminLogin && password === adminPass) {
    res.json(true)
  }
  else {
    res.json('invalid credentials')
  }
}
) 

app.put('/newExcursion', (req, res) => {
  db('excursionlist').insert({
    title: req.body.excTitle,
    date: req.body.excDate,
    place: req.body.excPlace,
    description: req.body.excDescription,
    capacity: req.body.maxCap,
    price: req.body.excPrice,
    imageurl: req.body.excImageUrl,
    bookedseats: JSON.stringify(req.body.bookedSeats)
  }).then(res.json('ok')).catch(
    res.status(400).json('unable to create new excursion')
  )
  
})



app.post('/uploadImage', function(req, res) {
  let eImage = req.files.image
  eImage.mv(`./images/${req.files.image.name}`);
  res.json('check').catch(res.status(400).json('unable to upload image'))
});

app.post('/updateExcursion', (req, res) => {
  db('excursionlist')
    .where({ id: req.body.mainId })
    .update({
      title: req.body.excTitle,
      date: req.body.excDate,
      place: req.body.excPlace,
      description: req.body.excDescription,
      capacity: req.body.maxCap,
      price: req.body.excPrice,
      imageurl: req.body.excImageUrl,
      bookedseats: JSON.stringify(req.body.bookedSeats)
    })
    .then(res.json('ok')).catch(res.status(400).json('unable to update excursion'))
})

app.post('/clients', (req, res) => {
  const id = req.body.id
  db('users')
    .select('*')    
    .where('excursion_id', id)
    .then(data => res.json(data)).catch(res.status(400).json('unable to get clients'))
})

app.post('/deleteClient', (req, res) => {
  const id = req.body.id
  const excursionId = req.body.excursionId
  db('users')        
    .where('id', id)
    .del()
    .then(() => {
      db('users')
        .select('*')
        .where('excursion_id', excursionId)
        .then(data => res.json(data))
    }
    ).catch(res.status(400).json('unable to delete clients'))

})


app.post('/deleteExcursio', (req, res) => {
  db('excursionlist')      
    .where({ id: req.body.mainId })
    .del()
    .then(res.json('ok')).catch(res.status(400).json('unable to delete excursion'))
})

app.post('/create-session', async (req, res) => {
  const excursionId = req.body.excursionId;
  const customerName = req.body.name;
  const customerPhone = req.body.phone;
  const customerEmail = req.body.email;
  const customerSeats = req.body.seats;
  const cancelUrl = req.body.url
  db.select('price', 'title', 'imageurl', 'date')
    .from('excursionlist')
    .where('id', excursionId)
    .then(data => {   
      initialize(data[0].price, data[0].title, data[0].imageurl, data[0].date)
    })
  const initialize = async (price, name, image, date) => {
    const actualPrice = price * 100;
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'czk',
            product_data: {
              name: `${name} - ${date}`,
              images: [`${backAdress}/images/${image}`],
            },
            unit_amount: actualPrice,
          },
          quantity: 1 * customerSeats.length,
        },
      ],
      metadata: {
        excursionId: excursionId,
        customerName: customerName,
        customerPhone: customerPhone,
        customerEmail: customerEmail,
        customerSeats: JSON.stringify(customerSeats)
      },
      mode: 'payment',      
      success_url: `${frontAdress}/paymentsuccess`,
      cancel_url: cancelUrl,
    });
    res.json({ id: session.id });
  }});

  app.post('/webhook', express.raw({type: 'application/json'}), (req, res) => {
    const payload = req.body;
    const sig = req.headers['stripe-signature'];

    let event;
  
    try {
      event = stripe.webhooks.constructEvent(payload, sig, endpointSecret);
    } catch (err) {
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      db('users').insert({
        excursion_id: session.metadata.excursionId,
        email:session.metadata.customerEmail,
        name: session.metadata.customerName,
        phone: session.metadata.customerPhone,
        seats: session.metadata.customerSeats,      
      }).then()
      res.json('ok')
    }
  
    res.status(200);
  });
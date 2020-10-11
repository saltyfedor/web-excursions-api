const express = require('express');
const cors = require('cors')
const fileUpload = require('express-fileupload')
const knex = require('knex')


const app = express();
const adminLogin = 'admin'
const adminPass = 'mama220263'

const db = knex({
  client: 'pg',
  connection: {
    host : '127.0.0.1',
    user : 'postgres',
    password : '08122001f',
    database : 'excursions'
  }
});

app.use(express.json());
app.use(cors());
const PORT = 3001;
app.listen(PORT, () => {
});
app.use('/images', express.static('images'))
app.use(fileUpload());

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
    return excursion
  }
  const { id } = req.params;  
  db
    .select('*')
    .from('excursionlist')
    .where('id', id)
    .then(data => res.json(refactorResponse(data)))
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
  }).then()
  res.json('ok')
})



app.post('/uploadImage', function(req, res) {
  let eImage = req.files.image
  eImage.mv(`./images/${req.files.image.name}`);
  res.json('check')
});

app.post('/deleteExcursion', (req, res) => {
})

app.get('/checkdb', (req, res) => {
  db.select('*').from('excursionlist').then(data => console.log(data))
  res.send('ok')
})

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
    .then(res.json('ok'))
})

app.post('/deleteExcursio', (req, res) => {
  console.log('check')  
  db('excursionlist')      
    .where({ id: req.body.mainId })
    .del()
    .then(res.json('ok'))
})

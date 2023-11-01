const cors = require('cors')
const checkToken = require('./config/checkToken.cjs')
const express = require('express')
const multer = require('multer')
//multer to handle file uploads

//created a express app
const app = express()

//import path to use and manipulate the file paths on our system
const path = require('path')

//import log http requests with morgan
const logger = require('morgan')

//using json packages to communicate with server/clients
app.use(express.json())

//app will use a local object in its responses which can contain info from the requests
app.use((req,res,next)=>{
    res.locals.data = {}
    next()
})

app.use(checkToken)

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/')
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() 
    cb(null, uniqueSuffix + file.originalname)
  }
})

const upload = multer({ storage: storage })

app.post('/upload-image', upload.single('profileImage'), async (req,res)=>{
  console.log(req.body)
  console.log(req.file)
  res.send('uploaded')
})

//use logger to log http requests
app.use(logger('dev'))
app.use(cors())
//check if there is a user in the requests
const ensureLoggedIn  = require('./config/ensureLoggedIn.cjs')


//defining routes(endpoints) of app(api) where req/res can be done 
//and information can be exchanged and check if they need to be logged in
app.use('/api/users',require('./routes/user.cjs'))
app.use('/api/forum',require('./routes/forums.cjs'))
app.use('/api/post',require('./routes/post.cjs'))
app.use('/api/comment',require('./routes/comment.cjs'))


// catch all for wrong routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'))
  })


module.exports = app
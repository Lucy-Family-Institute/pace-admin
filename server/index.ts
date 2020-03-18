import  express from 'express'
import cors from 'cors'
const app = express()
const port = 8000
app.use(cors())
app.use('/pdfs', express.static('../data/pdfs'))
app.use('/thumbnails', express.static('../data/thumbnails'))

app.get('/', (req, res) => res.send('Hello World!'))

app.listen(port, () => console.log(`Example app listening on port ${port}!`))
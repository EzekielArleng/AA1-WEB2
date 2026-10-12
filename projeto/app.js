const express = require('express')
const path = require('path')
const app = express()
const port = 5000

app.use(express.static(path.join(__dirname, 'public')))

app.get('/', (req, res) => {
    res.sendFile(path.resolve(__dirname, './public/html/index.html'))
})

app.post('/main', (req, res) => {
    res.sendFile(path.resolve(__dirname, "./public/html/main.html"))
})

// app.all('*', (req, res) => {
//     res.sendFile(path.resolve(__dirname, './html/error.html'))
// })

app.listen(port, () => {
    console.log(`Listening on port ${port}`)
})
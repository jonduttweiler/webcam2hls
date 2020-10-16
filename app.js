const path = require('path');
const express = require('express')
const app = express()
const port = 8001;

const chunksRouter = require("./routes/chunks");

app.use(express.static('public'));
app.use(chunksRouter);

//TODO: SEND INDEXHTML
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname,"page.html"))
  })

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
})

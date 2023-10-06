const express = require('express')
const crypto = require('node:crypto')
const cors = require('cors')

const movies = require('./movies.json')
const { validateMovie } = require('./schemas/movies')



const app = express()

app.use(express.json()) //esto hace que identifique el request.body (es un middleware)

app.use(cors({
    origin: (origin, callback)=>{
        const ACCEPTED_ORIGINS=[
            'http://localhost:5500',
            'http://localhost:1234'
        ]
        if (ACCEPTED_ORIGINS.includes(origin)){
            return callback(null, true)
        }

        if(!origin){
            return callback(null, true)
        }

        return callback(new Error('Not allowed by CORS'))

    }
}))

app.disable('x-powered-by')

app.get('/', (req, res) =>{
    res.json({message: 'holaa'})
})



//todos los recursos que sean MOVIES se identifica con /movies
app.get('/movies', (req, res) => {
    // const origin = req.header('origin')
    // if(ACCEPTED_ORIGINS.includes(origin) || !origin){
    //     res.header('Access-Control-Allow-Origin', origin)
    // }
    
    const { genre , page , quantity , ratemin , ratemax, order} = req.query

    //asegurar valores para que JS no interprete como string
    const parsedQuantity = parseInt(quantity)
    const parsedPage = parseInt(page)
    const parsedRateMin = parseFloat(ratemin)
    const parsedRateMax = parseFloat(ratemax)

    if(genre){
        const filteredMovies = movies.filter(
            // esto es case sensitive, lo convertiremos a lowercase con some
            //movie => movie.genre.includes(genre)
            movie => movie.genre.some(g => g.toLocaleLowerCase() == genre.toLowerCase())
        )
        return res.json(filteredMovies)
    }

    // paginado y cantidad de objetos
    if(!isNaN(parsedPage) && !isNaN(parsedQuantity)){
        const startIndex = (parsedPage - 1) * parsedQuantity       
        const endIndex = startIndex + parsedQuantity

        const filteredPageQuantity = movies.filter((movie, index) => index >= startIndex && index < endIndex)
        const totalPages = Math.ceil(movies.length / parsedQuantity);

        // Devuelve las películas de la página actual y la información de paginación
        return res.json({
            movies: filteredPageQuantity,
            totalPages,
            currentPage: parsedPage,
            totalMovies: movies.length
        });
    }

    // ordenar ascendiente
    if(order==1){
        const orderAscendent = movies.sort((a,b) => a.rate - b.rate )
        return res.json(orderAscendent)
    }

    // ordenar descendiente
    if(order==2){
        const orderDescendent = movies.sort((a,b) => b.rate - a.rate )
        return res.json(orderDescendent)
    }

    //filtrado por rate minimo y máximo
    if(!isNaN(parsedRateMin) && !isNaN(parsedRateMax)){
        //se debe acceder a la sección a comparar, en este caso "movie.rate"
        const filteredPerRate = movies.filter(movie => movie.rate >= parsedRateMin && movie.rate <= parsedRateMax)
        return res.json(filteredPerRate)
    }

    if(page){
        const startIndex = (page - 1) * 5        
        const endIndex = startIndex + 5

        const filteredPage = movies.filter((item, index) => index >= startIndex && index < endIndex)
        return res.json(filteredPage)
    }
      

    res.json(movies)
})

app.get('/movies/:id', (req, res) => { //path-to-regexp 
    const {id} = req.params
    const movie = movies.find(movie => movie.id == id)
    if(movie) return res.json(movie)

    res.status(404).json({message : 'Movie not found'})
})

app.post('/movies', (req, res) =>{

    const result = validateMovie(req.body)

    if(result.error){
        return res.status(400).json({error: JSON.parse(result.error.message)})
    }

    const newMovie = {
        id: crypto.randomUUID(), //esto crea un UUID v4 (funciona con node:crypto)
        ...result.data
    }
    //esto no sería REST, porque estamos guardando
    //el estado de la aplicación en memoria
    movies.push(newMovie)

    res.status(201).json(newMovie) // actualizar la caché del cliente
})

app.delete('/movies/:id', (req, res)=>{
    const {id} = req.params
    const movieIndex = movies.findIndex(movie => movie.id == id)


    // const origin = req.header('origin')
    // if(ACCEPTED_ORIGINS.includes(origin) || !origin){
    //     res.header('Access-Control-Allow-Origin', origin)
    // }

    if (movieIndex == -1){
        return res.status(404).json({ message: 'Movie not found' })
    } 

    movies.splice(movieIndex, 1)

    return res.json({message: 'Movie deleted'})

})




app.patch('/movies/:id', (req, res) => {
    const { id } = req.params
    const movieIndex = movies.findIndex(movie => movie.id == id)

    if (movieIndex == -1){
        return res.status(404).json({ message: 'Movie not found' })
    } 

    
})

//EL OPTIONS ES SUMAMENTE NECESARIO PARA LAS PETICIONES COMPLEJAS POR EL CORS
//PATCH / PUT / DELETE
// app.options('/movies/:id', (req, res)=>{
//     const origin = req.header('origin')
//     if(ACCEPTED_ORIGINS.includes(origin) || !origin){
//         res.header('Access-Control-Allow-Origin', origin)
//         res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE')
//     }
//     res.send(200)
// })


const PORT = process.env.PORT ?? 1234

app.listen(PORT, ()=>{
    console.log(`server listening in port: http://localhost:${PORT}`);
})
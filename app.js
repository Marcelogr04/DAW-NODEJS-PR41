const express = require('express')
const fs = require('fs').promises
const ejs = require('ejs')
const url = require('url')
const app = express()
const port = 3000
// uuid genera un id aleatorio y multer gestiona la carga de archivos
const multer = require('multer')
const { v4: uuidv4 } = require('uuid')
const storage = multer.memoryStorage() 
const upload = multer({ storage: storage })

var errorMessage = null;
var errorMessage2 = null;

// Configurar el motor de plantilles
app.set('view engine', 'ejs')

// Publicar arxius carpeta ‘public’ 
app.use(express.static('public'))

// Configurar direcció ‘/’ 
app.get('/', getSearch)
async function getSearch (req, res) {
  let query = url.parse(req.url, true).query;
  let noms = []
  try {
      // Llegir el fitxer JSON
      let dadesArxiu = await fs.readFile("./private/productes.json", { encoding: 'utf8'})
      let dades = JSON.parse(dadesArxiu)
      noms = dades.map(coche => { return coche.nom })
      imatges = dades.map(coche => { return coche.image })
      ids = dades.map(coche => { return coche.id }) 
      res.render('sites/index', { llista: noms, llista2: imatges, llista3: ids })

  } catch (error) {
      console.error(error)
      res.send('Error al llegir el fitxer JSON')
  }
}

// Configurar direcció ‘/delete’
app.get('/delete', getCoche)
async function getCoche (req, res) {
    let query = url.parse(req.url, true).query;
    try {
        // Llegir el fitxer JSON
        let dadesArxiu = await fs.readFile("./private/productes.json", { encoding: 'utf8'})
        let dades = JSON.parse(dadesArxiu)
        // Buscar el coche per id
        let infoCoche = dades.find(coche => (coche.id == query.id))
        if (infoCoche) {
            // Retornar la pàgina segons la nau trobada
            res.render('sites/delete', { infoCoche: infoCoche })
        } else {
            res.send('Paràmetres incorrectes')
        }
    } catch (error) {
        console.error(error)
        res.send('Error al llegir el fitxer JSON')
    }
}

// Configurar direcció ‘/actionDelete’
app.get('/actionDelete', getDelete)
async function getDelete (req, res) {
    let query = url.parse(req.url, true).query;
    let noms = []
    try {
        // Llegir el fitxer JSON
        let dadesArxiu = await fs.readFile("./private/productes.json", { encoding: 'utf8'})
        let dades = JSON.parse(dadesArxiu)
        // Encontrar el índice del elemento a eliminar
        const indiceAEliminar = dades.findIndex(coche => coche.id == query.id);

        if (indiceAEliminar !== -1) {
            // Eliminar el elemento del array
            dades.splice(indiceAEliminar, 1);
            // Guardar el array actualizado en el archivo JSON
            await fs.writeFile("./private/productes.json", JSON.stringify(dades));
            res.redirect('/');
        } else {
            res.send('Parámetros incorrectos');
        }
    } catch (error) {
        console.error(error)
        res.send('Error al llegir el fitxer JSON')
    }
}

// Configurar direcció ‘/edit’
app.get('/edit', getEdit)
async function getEdit (req, res) {
    let query = url.parse(req.url, true).query;
    try {
        // Llegir el fitxer JSON
        let dadesArxiu = await fs.readFile("./private/productes.json", { encoding: 'utf8'})
        let dades = JSON.parse(dadesArxiu)
        // Buscar el coche per id
        let infoCoche = dades.find(coche => (coche.id == query.id))
        if (infoCoche) {
            res.render('sites/edit', { infoCoche: infoCoche, error: errorMessage })
        } else {
            res.send('Paràmetres incorrectes')
        }
    } catch (error) {
        console.error(error)
        res.send('Error al llegir el fitxer JSON')
    }
}

// Configurar direcció ‘/actionEdit’
app.post('/actionEdit', upload.array('files'), actionEdit)
async function actionEdit (req, res) {
    let arxiu = "./private/productes.json"
    let postData = await getPostObject(req)
    try {
        // Llegir el fitxer JSON
        let dadesArxiu = await fs.readFile("./private/productes.json", { encoding: 'utf8'})
        let dades = JSON.parse(dadesArxiu)
        if (Object.keys(postData).length - 1 > 0) {
            if (postData.preu) {
                if (typeof postData.preu !== "number") {
                    errorMessage = "Insert only numbers in preu please.";
                    res.redirect(`edit?id=${postData.id}`);
                    return;
                }
            }
            if (postData.files) {
                let fileObj = postData.files[0];
                const fileExtension = fileObj.name.split('.').pop()
                let filePath = `./public/images/${postData.id}.${fileExtension}`
                await fs.writeFile(filePath, fileObj.content);
                // Guardem el nom de l'arxiu a la propietat 'imatge' de l'objecte
                postData.image = `${postData.id}.${fileExtension}`;
                // Eliminem el camp 'files' perquè no es guardi al JSON
                delete postData.files;
            }
            const posicionCoche = dades.findIndex(coche => (coche.id == postData.id));
            for (let key in postData) {
                if (postData.key != postData.id) {
                    dades[posicionCoche][key] = postData[key];
                }
            }
            let textDades = JSON.stringify(dades, null, 4) // Ho transformem a cadena de text (per guardar-ho en un arxiu)
            await fs.writeFile(arxiu, textDades, { encoding: 'utf8'}) // Guardem la informació a l’arxiu
            res.redirect('/');

        } else {
            errorMessage = "The form is empty.";
            res.redirect('/edit?id=' + postData.id);
        }

    } catch (error) {
        console.error(error)
        res.send('Error al llegir el fitxer JSON')
    }
}

app.get('/add', add)
async function add (req, res) {
    res.render('sites/add', { error: errorMessage2 })
}

app.post('/actionAdd', upload.array('files'), actionAdd)
async function actionAdd (req, res) {
    let arxiu = "./private/productes.json"
    let postData = await getPostObject(req)
    try {
        if (!('nom' in postData && 'preu' in postData && 'descripcio' in postData && 'files' in postData)) {
            errorMessage2 = "Fill out all the fields of the form please.";
            res.redirect('/add');
            return;
        }
        if (typeof postData.preu !== "number") {
            errorMessage2 = "Insert only numbers in preu please.";
            res.redirect('/add');
            return;
        }
        // Llegir el fitxer JSON
        let dadesArxiu = await fs.readFile("./private/productes.json", { encoding: 'utf8'})
        let dades = JSON.parse(dadesArxiu)
        let maxNumero = -Infinity
        for (let key in dades) {
            const numeroActual = parseInt(dades[key]['id'].substring(1), 10)
            if (!isNaN(numeroActual) && numeroActual > maxNumero) {
                maxNumero = numeroActual;
            }
        }
        maxNumero += 1;
        const nuevoId = "L" + maxNumero
        postData.id = nuevoId

        let fileObj = postData.files[0];
        const fileExtension = fileObj.name.split('.').pop()
        let filePath = `./public/images/${nuevoId}.${fileExtension}`
        await fs.writeFile(filePath, fileObj.content);
        // Guardem el nom de l'arxiu a la propietat 'imatge' de l'objecte
        postData.image = `${nuevoId}.${fileExtension}`;
        // Eliminem el camp 'files' perquè no es guardi al JSON
        delete postData.files;

        dades.push(postData) // Afegim el nou objecte (que ja té el nou nom d’imatge)
        let textDades = JSON.stringify(dades, null, 4) // Ho transformem a cadena de text (per guardar-ho en un arxiu)
        await fs.writeFile(arxiu, textDades, { encoding: 'utf8'}) // Guardem la informació a l’arxiu
        res.redirect('/');

    } catch (error) {
        console.error(error)
        res.send('Error al afegir les dades')
    }
}

async function getPostObject (req) {
    return new Promise(async (resolve, reject) => {
    let objPost = { };
    // Process files
    if (req.files.length > 0) { objPost.files = [] }
        req.files.forEach(file => {
        objPost.files.push({
        name: file.originalname,
        content: file.buffer
    })
    })
    // Process other form fields
    for (let key in req.body) {
        let value = req.body[key]
    if (!isNaN(value)) { // Check if is a number (example: "2ABC" is not a 2)
        let valueInt = parseInt(value)
        let valueFlt = parseFloat(value)
    if (valueInt && valueFlt) {
        if (valueInt == valueFlt) objPost[key] = valueInt
        else objPost[key] = valueFlt
    }
    } else {
        objPost[key] = value
    }
    }
    resolve(objPost)
    })
}

// Activar el servidor
app.listen(port, appListen)
function appListen () {
  console.log(`Example app listening on: http://localhost:${port}`)
}

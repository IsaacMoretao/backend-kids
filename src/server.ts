import express, { Router } from "express"
import ChildController from "./modules/Controllers/ChildController"
import UsersController from "./modules/Controllers/UsersController"
const app = express()

const port = process.env.PORT || 3333;
const baseURL = 'https://backend-kids.vercel.app';

const cors = require("cors")

app.use(cors())

const router = Router();

router.get('/children', ChildController.index);
router.get('/children/filterByAge', ChildController.filterByAge);
router.post('/children', ChildController.create);
router.put('/children/:id', ChildController.update);
router.delete('/delete/:id', ChildController.delete);
router.post('/register', UsersController.register);
router.post('/login', UsersController.login);

app.get('/', (req, res) => {
  res.send('Hello World');
});

app.use(express.json());
app.use(router);

app.listen(port, () => {
  console.log(`Server is listening at ${baseURL}:${port}`);
});
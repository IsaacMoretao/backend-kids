import express, { Router } from "express"
import ChildController from "./modules/Controllers/ChildController"
import UsersController from "./modules/Controllers/UsersController"
import AdminController from "./modules/Controllers/AdmnController"

const app = express()

const port = process.env.PORT ? Number(process.env.PORT) : 3333;
const baseURL = '0.0.0.0';

const cors = require("cors")

app.use(cors())

const router = Router();

router.get('/children/', ChildController.index);
router.get('/children/filterByAge', ChildController.filterByAge);
router.get('/children/:id', ChildController.getChildById);
router.get('/children/filterById/:id', ChildController.getChildById);

router.post('/children', ChildController.create);
router.post('/created/many/children', ChildController.createManyChildren);

router.post('/addPoint/:idChild/:idUser', ChildController.addPoint);
router.delete('/deletePoint/:id', ChildController.deletePoint);

router.put('/children/:id', ChildController.update);
router.delete('/delete/', ChildController.delete);
router.delete('/reset/all/points', ChildController.resetAllPoints)
router.delete('/reset/all/child', ChildController.resetAllChild)

router.get('/listUsers', UsersController.listUsers);
router.put('/updateUser/:id', UsersController.updateUser);
router.delete('/deleteUser/:id', UsersController.deleteUser);
router.post('/register', UsersController.register);
router.post('/login', UsersController.login);
router.post('/AddPresence/:userId', UsersController.addPresence);
router.delete('/removePresence/:presenceId', UsersController.removePresence);

router.post('/admin', AdminController.setDefaultValues);

app.get('/', (req, res) => {
  res.send('Server is Running');
});

app.use(express.json());
app.use(router);

app.listen(port, baseURL, () => {
  console.log("http server running")
});
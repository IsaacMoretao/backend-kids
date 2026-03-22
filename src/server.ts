import express, { Router } from "express"
import ChildController from "./modules/Controllers/ChildController"
import UsersController from "./modules/Controllers/UsersController"
import AdminController from "./modules/Controllers/AdmnController"
import { upload } from "./Middleware/upload"
import path from 'path'
import ReportController from "./modules/Controllers/ReportController"

import dotenv from "dotenv";
dotenv.config();

const app = express()
const port = process.env.PORT ? Number(process.env.PORT) : 3333;
const baseURL = '0.0.0.0';

const cors = require("cors")

app.use(cors())

app.use(express.json());

app.use(
  "/uploads",
  express.static(path.resolve(__dirname, "uploads"))
);
const router = Router();

router.get('/children/', ChildController.index);
router.get('/children/filterByAge', ChildController.filterByAge);
router.get('/children/:id', ChildController.getChildById);
router.get('/children/filterById/:id', ChildController.getChildById);
router.get('/children/getPoints/:id', ChildController.getPointsById);
router.get('/children/getAllPoints/:id', ChildController.getAllPointsById);

router.post('/children', upload.single("avatar"), ChildController.create);
router.post('/created/many/children', ChildController.createManyChildren);

router.post('/addPoint/:idChild/:idUser', ChildController.addPoint);
router.delete('/deletePoint/:id', ChildController.deletePoint);

router.put('/children/:id', ChildController.update);
router.delete('/delete/', ChildController.delete);
router.delete('/reset/all/points', ChildController.resetAllPoints)
router.delete('/reset/all/child', ChildController.resetAllChild)

router.get('/listUsers', UsersController.listUsers);
router.get('/listUsersForPresence', UsersController.listUsersForPresence);
router.put('/updateUser/:id', upload.single('avatar'), UsersController.updateUser);
router.delete('/deleteUser/:id', UsersController.deleteUser);
router.post('/register', UsersController.register);
router.post('/login', UsersController.login);
router.post('/AddPresence/:userId', UsersController.addPresence);
router.delete('/removePresence/:presenceId', UsersController.removePresence);
router.get('/fix-users', UsersController.fixUsers);
router.post('/admin', AdminController.setDefaultValues);
router.put('/stopUser/:userId', UsersController.stopedUser)



app.use('/report.pdf', ReportController.Presences)
app.use('/report.xls', ReportController.PresencesExcel)

app.get('/', (req, res) => {
  res.send('Server is Running');
});

app.use(router);

app.listen(port, baseURL, () => {
  console.log("http server running")
});
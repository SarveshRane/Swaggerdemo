// importing the dependencies
var express = require('express');
var bodyParser = require('body-parser');
var cron = require('node-cron');
var cors = require('cors');
const path = require('path');
const fs = require('fs');
var compression = require('compression')
const router = express.Router();
var  multer = require('multer');
var pumpDashboard = require('./app/PumpDashboard/controller/pumpdashboard');
var pumpmanager = require('./app/controller/pumpmanager');
var pumpreport = require('./app/controller/pumpreport');
var georgMachine = require('./app/controller/jourgeMachineDashboard')
const { setWssInstance } = require('./app/controller/mqttController');
const http = require('http');
const WebSocket = require('ws');

var loginrouter = require('./app/controller/login');
var insertrouter = require('./app/controller/insertData');
var dashboardrouter = require('./app/controller/dashboard');
var individualdashboardrouter = require('./app/controller/individualDashboard');
var masterrouter = require('./app/controller/masters');
var userMaintenancerouter = require('./app/controller/userMaintenance');
var siteManagerrouter = require('./app/controller/siteManager');
var transformerManager = require('./app/controller/transformerManager');
var notification = require('./app/controller/notification');
var deviceMaster = require('./app/controller/deviceMaster');
var report = require('./app/controller/reports');
var commonrouter = require('./app/controller/common')
var energyMeterManager = require('./app/controller/energyMeterManager');
var feeder = require('./app/controller/feeder');
//var killQueries = require('./app/controller/KillQueries')
var maintenancePlanning = require('./app/controller/maintenanceplanning')
var globalconfig = require('./config/globalconfig');  //read global config file
var verifyToken = require('./app/middleware/verifytoken');
const meterFiles = multer({
    storage: multer.memoryStorage()
});
var PATH = '/var/www/kryfs-apps/api.trafobola.com/uploads/crc';
var PATH1 = '/var/www/kryfs-apps/api.trafobola.com/uploads/firmware';
let storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, PATH);
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname)
  }
});
let storagefirmware = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, PATH1);
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname)
  }
});
let upload = multer({
  storage: storage
});

let uploadfirmware = multer({
  storage: storagefirmware,
  fileFilter: function (req, file, cb) {
    // Disable the content check and accept all files by returning true
    cb(null, true);
  },
  limits: { fileSize: 10 * 1024 * 102}
});
let PATH2 = 'uploads/json';
let storageJSON = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, PATH2);
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname)
  }
});
let uploadJson = multer({
  storage: storageJSON
});

const uploadFolder = path.join(__dirname, 'uploads', 'data_log');

// Configure storage
const storageLogData = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, 'uploads', 'data_log');
    console.log('Upload Path:', uploadPath);

    // Create the base upload folder if it doesn't exist
    if (!fs.existsSync(uploadPath)) {
      console.log('Creating upload folder:', uploadPath);
      fs.mkdirSync(uploadPath, { recursive: true });
    }

    // Handle relative folder structure from client
    const relativePath = file.webkitRelativePath
      ? file.webkitRelativePath.split('/').slice(0, -1).join('/')
      : '';
    console.log('Relative Path:', relativePath);

    const finalPath = path.join(uploadPath, relativePath);
    console.log('Final Path:', finalPath);

    // Create nested folders if needed
    if (!fs.existsSync(finalPath)) {
      console.log('Creating nested folders:', finalPath);
      fs.mkdirSync(finalPath, { recursive: true });
    }

    cb(null, finalPath);
  },
  filename: function (req, file, cb) {
    console.log('Saving file:', file.originalname);
    cb(null, file.originalname);
  }
});

// Multer middleware
const uploadlogdata = multer({ storage: storageLogData });
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./swagger.json');

// defining the Express app
var app = express();
app.use(compression());
// using bodyParser to parse JSON bodies into JS objects
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
// enabling CORS for all requests
app.use(cors());
app.use(express.json({limit: "50mb",  extended: true}));
app.use(express.urlencoded({limit: "50mb", extended: true, parameterLimit:50000}));

app.post('/api/v1/login', loginrouter.logincheck)
app.post('/api/v1/connection', insertrouter.connection)
app.post('/api/v1/saveData', insertrouter.saveData)
app.post('/api/v1/emsSaveData', verifyToken,insertrouter.emsSaveData)
app.post('/api/v1/pumpsaveData', insertrouter.savepumpData)
app.post('/api/v1/saveTransformerDataUsingQueue', insertrouter.saveTransformerDataUsingQueue)
app.get('/api/v1/readQueueData', insertrouter.readQueueData)
app.post('/api/v1/saveMachineData', insertrouter.saveMachineData);
app.get('/api/v1/readMachineData', insertrouter.readMachineData);

/* Georg Machine */
app.get('/api/v1/getLastData',georgMachine.getLastData)
app.get('/api/v1/getDailyGeorgMachineDuration',georgMachine.getDailyGeorgMachineDuration)
app.post('/api/v1/getGeorgMachineReport',georgMachine.getGeorgMachineReport)
app.post('/api/v1/getGeorgMachineWorkingReport',georgMachine.getGeorgMachineWorkingReport)

/* Notification API */
app.post('/api/v1/notification', verifyToken, notification.notificationData)
app.post('/api/v1/updatenotification', verifyToken, notification.updatenotification)
/* Dashboard API */
app.get('/api/v1/myendpoint', dashboardrouter.serversendData)
app.post('/api/v1/filteredTransformers', verifyToken, dashboardrouter.filteredTransformerList)
app.post('/api/v1/loadProfile', verifyToken, dashboardrouter.loadProfile)
app.post('/api/v1/alertCount', verifyToken, dashboardrouter.alertCount)
app.post('/api/v1/transformerCount', verifyToken, dashboardrouter.transformerCount)
app.post('/api/v1/transformerTileData', verifyToken, dashboardrouter.transformerTileData)
app.get('/api/v1/getParameterConfig', verifyToken, dashboardrouter.getParameterConfig)
app.post('/api/v1/getTransformerDowntime', dashboardrouter.getTransformerDowntime)
app.post('/api/v1/getLatestAlerts', dashboardrouter.getLatestAlerts)
app.post('/api/v1/getLastUpdatedAlertsData', dashboardrouter.getLastUpdatedAlertsData)
app.get('/api/v1/getSimData', dashboardrouter.getSimData)
app.post('/api/v1/getHealthStatus', dashboardrouter.gethealthSatus)
app.get('/api/v1/getTapPositionData', dashboardrouter.getTapPositionData)
app.get('/api/v1/getRenewalDate', dashboardrouter.getRenewalDate)
app.get('/api/v1/updateUserRenewalDate', dashboardrouter.updateUserRenewalDate)
app.post('/api/v1/watchTranformers', dashboardrouter.watchTranformers)
app.post('/api/v1/getAlertsGraphCount', dashboardrouter.getAlertsGraphCount)
app.post('/api/v1/getWeekKwh', dashboardrouter.getWeekKwh);
app.post('/api/v1/getDayKwh', dashboardrouter.getDayKwh);
app.post('/api/v1/getMonthKwh', dashboardrouter.getMonthKwh);
app.post('/api/v1/getDeviceConnectionStatus', dashboardrouter.getDeviceConnectionStatus);
app.post('/api/v1/getTransformerLatestData', dashboardrouter.getTransformerLatestData);

/* Individual Dashboard */
app.post('/api/v1/loadIndividualDashboard', verifyToken, individualdashboardrouter.loadIndividualDashboard)
app.post('/api/v1/getTransformerActiveAlert', verifyToken, individualdashboardrouter.getTransformerActiveAlert)
app.post('/api/v1/aiModule',individualdashboardrouter.aiModule);

/* PUMP DASSHBOARD */
app.post('/api/v1/getPumpIdsArray',pumpDashboard.getPumpIdsArray);
app.post('/api/v1/getPumpData',pumpDashboard.pumpDashboardData);
app.post('/api/v1/getPumpDataTile',pumpDashboard.getPumpDataTile);
app.post('/api/v1/getSelectedPumpData',pumpDashboard.getSelectedPumpData);
app.post('/api/v1/getPumpAlerts',pumpDashboard.getPumpAlerts);

/* PUMP MANAGER */
app.get('/api/v1/getPumpData', pumpmanager.getPumpData);
app.get('/api/v1/getPumpids', pumpmanager.getPumpids);
app.post('/api/v1/addUpdatePump', pumpmanager.addUpdatePump);
app.post('/api/v1/deletePump', pumpmanager.addUpdatePump);
app.get('/api/v1/getPumpDetails', pumpmanager.getPumpDetails);
app.get('/api/v1/getTransformerIds', pumpmanager.getTransformerIds)

/*PUMP REPORT*/
app.post('/api/v1/pumpgatewayReport',pumpreport.gatewayReport);
app.post('/api/v1/alertReport',pumpreport.alertReport);


/* User Maintenance API */
app.get('/api/v1/getUserList', verifyToken, userMaintenancerouter.getUserList)
app.post('/api/v1/userscreate',  userMaintenancerouter.createUser)
app.put('/api/v1/user', verifyToken, userMaintenancerouter.updatedUser)
app.delete('/api/v1/user', verifyToken, userMaintenancerouter.deleteUser)
app.post('/api/v1/usersData', userMaintenancerouter.getUserAdmin)
app.get('/api/v1/getLoginUserData', verifyToken, userMaintenancerouter.getLoginUserData)

/* Maintenance Planning */
app.post('/api/v1/saveMaintainancePlanningData',maintenancePlanning.saveMaintainancePlanningData)
app.post('/api/v1/getMaintenancePlanningData',maintenancePlanning.getMaintenancePlanningData)
app.get('/api/v1/getMaintenanceParameters',maintenancePlanning.getMaintenanceParameters)
app.post('/api/v1/deleteMaintenancePlanningData',maintenancePlanning.deleteMaintenancePlanningData)
app.post('/api/v1/addResolutionData',maintenancePlanning.addResolutionData)
app.post('/api/v1/getResolutionData',maintenancePlanning.getResolutionData)
app.post('/api/v1/deleteMaintenancePlanningResolutionData',maintenancePlanning.deleteMaintenancePlanningResolutionData)



/* Common */
app.get('/api/v1/firmware',commonrouter.getFirmwareFile);
app.get('/api/v1/crc',commonrouter.getCrcFile);
app.get('/api/v1/FOTAJsonFile',commonrouter.getFirmwareJsonFile);
app.get('/api/v1/pushOnEvent',commonrouter.pushOnEvent);
app.post('/api/v1/pushOnEventAlerts',commonrouter.pushOnEventAlerts);
app.get('/api/v1/excelData',commonrouter.excelData);
app.post('/api/v1/testingData',commonrouter.testingData);
app.post('/api/v1/getRenewalInvoice',commonrouter.getRenewalInvoice);
app.post('/api/v1/generateProformaInvoice',commonrouter.generateProformaInvoice);
app.post('/api/v1/updateUTRNumber',commonrouter.updateUTRNumber);
app.post('/api/v1/checkForRegisteredEmailId',commonrouter.checkForRegisteredEmailId);
app.post('/api/v1/verifyOtp',commonrouter.verifyOtp);
app.post('/api/v1/resetPassword',commonrouter.resetPassword);
app.post('/api/v1/feedback',commonrouter.feedback);
app.post('/api/v1/tataPowerDeviceData_backup',commonrouter.tataPowerDeviceData);
app.post('/api/v1/tataPowerDeviceDataForFirstTime_backup',commonrouter.tataPowerDeviceDataForFirstTime);
app.post('/api/v1/PushOnEventG',commonrouter.PushOnEventG);
app.post('/api/v1/objectAndIntrusionDetectionReport',commonrouter.objectAndIntrusionDetectionReport);
app.get('/api/v1/getTodaysReport',commonrouter.getTodaysReport);
app.get('/api/v1/getDailyConsumptionReport',commonrouter.getDailyConsumptionReport);
app.post('/api/v1/sendAlertsforannouncator',commonrouter.sendAlertsforannouncator);
app.get('/api/v1/onDemand',commonrouter.onDemand);
app.get('/api/v1/getDataOnDemand',commonrouter.getDataOnDemand);
app.get('/api/v1/updateAppVersion',commonrouter.updateAppVersion);
app.get('/api/v1/getAppVersion',commonrouter.getAppVersion);
app.post('/api/v1/readMeterDetails',meterFiles.single('file'),commonrouter.readMeterDetails);
app.post('/api/v1/uploadlogfolder', uploadlogdata.array('files',2000), commonrouter.handleFileUpload);
app.get('/api/v1/saveFileData', commonrouter.saveFileData); 
app.get('/api/v1/getTestingData',commonrouter.getTestingData);


/* EMS Manager API */
app.post('/api/v1/addUpdateEnergyMeter',verifyToken,energyMeterManager.emsAddUpdateData);
app.get('/api/v1/getEnergyMeterData',verifyToken,energyMeterManager.getEnergyMeterData);
app.get('/api/v1/getEnergyMeterDetails',energyMeterManager.getEnergyMeterDetails);
app.post('/api/v1/getKWHDATA',energyMeterManager.getKWHDATA);
app.get('/api/v1/getEMSDeviceId',energyMeterManager.getEMSDeviceId);
app.get('/api/v1/getEnergyMeters',energyMeterManager.getEnergyMeters);
app.post('/api/v1/getEnergyMeterReportData',energyMeterManager.getEnergyMeterReportData);
app.get('/api/v1/getEnergyMeterList',verifyToken,siteManagerrouter.getEnergyMeterList);
app.get('/api/v1/getMeterCount',energyMeterManager.getMeterCount);
app.get('/api/v1/getEmsParameterConfig',energyMeterManager.getParameterConfig);
app.post('/api/v1/getCurrentMonthKwh',energyMeterManager.getCurrentMonthKwh);
app.post('/api/v1/getCurrentMonthAveragePF',energyMeterManager.getCurrentMonthAveragePF);
app.post('/api/v1/getMonthwiseAveragePF',energyMeterManager.getMonthwiseAveragePF);
app.post('/api/v1/getMonthwiseConsumptionData',energyMeterManager.getMonthwiseConsumptionData);
app.post('/api/v1/getDailyConsumptionData',energyMeterManager.getDailyConsumptionData);
app.post('/api/v1/getHourlyConsumptionData',energyMeterManager.getHourlyConsumptionData);
app.post('/api/v1/getYesterdayHourlyConsumptionData',energyMeterManager.getYesterdayHourlyConsumptionData);
app.post('/api/v1/getLastMonthDailyConsumptionData',energyMeterManager.getLastMonthDailyConsumptionData);
app.post('/api/v1/getCurrentAndPreviousMonthsKwhData',energyMeterManager.getCurrentAndPreviousMonthsKwhData);
app.post('/api/v1/getCurrentAndPreviousDaysKwhData',energyMeterManager.getCurrentAndPreviousDaysKwhData);
app.post('/api/v1/getTotalMonthlyData',energyMeterManager.getTotalMonthlyData);
app.post('/api/v1/getLastUpdatedAlert',energyMeterManager.getLastUpdatedAlert);
app.post('/api/v1/getEMSLiveAlerts',energyMeterManager.getEMSLiveAlerts);
app.post('/api/v1/getLastUpdatedEMSAlertsData',energyMeterManager.getLastUpdatedEMSAlertsData);
app.post('/api/v1/getLiveEMSAlertsData',energyMeterManager.getLiveEMSAlertsData);
app.post('/api/v1/gethoverdatatree',energyMeterManager.gethoverdatatree);
app.post('/api/v1/getAlertData',energyMeterManager.getAlertData);
app.post('/api/v1/getIndividualMeterMonthData',energyMeterManager.getIndividualMeterMonthData);
app.post('/api/v1/getIndividualEnergyMeterAlerts',energyMeterManager.getIndividualEnergyMeterAlerts);
app.post('/api/v1/getAlertDataReport',energyMeterManager.getAlertDataReport);
app.post('/api/v1/getMonthwieIndividualMeterPF',energyMeterManager.getMonthwieIndividualMeterPF);
app.post('/api/v1/getIndividualMeterConsumption',energyMeterManager.getIndividualMeterConsumption);
app.post('/api/v1/getEnergyMeterIds',energyMeterManager.getEnergyMeterIds);
app.post('/api/v1/meterStatus',energyMeterManager.meterStatus);
app.post('/api/v1/alertSections',energyMeterManager.alertSections);
app.post('/api/v1/getemsmonthdata',energyMeterManager.getemsmonthdata);

/* Site Manager API */
app.get('/api/v1/getSiteList', verifyToken, siteManagerrouter.getSiteList)
app.post('/api/v1/sitemanager', verifyToken, siteManagerrouter.createSite)
app.put('/api/v1/sitemanager', verifyToken, siteManagerrouter.updateSite)
app.get('/api/v1/getTransformerList', verifyToken, siteManagerrouter.getTransformerList)
app.get('/api/v1/getUserListSite', verifyToken, siteManagerrouter.getUserListSite)
app.delete('/api/v1/deleteSite', verifyToken, siteManagerrouter.deleteSite)

/* Transformer Manager API */
app.get('/api/v1/remoteControllerStatus', transformerManager.getRemoteControllerForTransformer);
app.post('/api/v1/addUpdateTransformer', transformerManager.addUpdateTransformer);
app.post('/api/v1/updateTransformer', transformerManager.addUpdateTransformer);
app.post('/api/v1/deleteTransformer', transformerManager.addUpdateTransformer);
app.get('/api/v1/getTransformerData', transformerManager.getTransformerData);
app.get('/api/v1/getTransformerDetails', transformerManager.getTransformerDetails);
app.get('/api/v1/getDeviceddl', transformerManager.getDeviceddl)
app.get('/api/v1/testschedule', transformerManager.nodeSchedular)
app.get('/api/v1/testschedulesms', transformerManager.sendSMS)
app.get('/api/v1/getHealthIndex', transformerManager.getHealthIndex);

/* Device Master API */
app.get('/api/v1/getAllDevice', deviceMaster.getAllDevice);
app.post('/api/v1/addDevice', deviceMaster.addDevice);
app.post('/api/v1/deleteDevice', deviceMaster.deleteDevice);
app.post('/api/v1/updateDevice', deviceMaster.updateDevice);
app.get('/api/v1/getDeviceById', deviceMaster.getDeviceById);

/* Reports API */

app.post('/api/v1/getReport1', report.getReport1);
app.post('/api/v1/getAlertsReport', report.getAlertsReport);
app.get('/api/v1/getDistinctTransformerId', report.getDistinctTransformerId);
app.get('/api/v1/getDistinctSite', report.getDistinctSite);
app.get('/api/v1/getAlertsData', report.getAlertsData);
app.post('/api/v1/getHVLVReport', report.getHVLVReport);
app.post('/api/v1/getThresholdValue', report.getThresholdValue);

// app.post('/api/v1/getParams', report.getParams);

/* Masters API */
app.get('/api/v1/globalMaster', verifyToken, masterrouter.globalMaster)
app.get('/api/v1/getCountryCode', verifyToken, masterrouter.getCountryCode)
app.get('/api/v1/getStateList', verifyToken, masterrouter.getStateList)
app.get('/api/v1/getCityList', verifyToken, masterrouter.getCityList)
app.get('/api/v1/getSiteLocationList', verifyToken, masterrouter.getSiteLocationList)
app.get('/api/v1/getZoneList', verifyToken, masterrouter.getZoneList)

//Feeder API

app.post('/api/v1/saveFeederData',feeder.saveFeederData);
app.post('/api/v1/getFeeders', feeder.getFeeders);
app.post('/api/v1/getFeederData', feeder.getFeederData);
app.post('/api/v1/getFeederTileData', feeder.getFeederTileData);
app.post('/api/v1/getFeederAlertParamStatus', feeder.getFeederAlertParamStatus);
app.post('/api/v1/getFeederManagerInfo', feeder.getFeederManagerInfo);
app.post('/api/v1/getAlertFeederReport', feeder.getAlertFeederReport);
app.post('/api/v1/getFeederAlertTileData', feeder.getFeederAlertTileData);
app.post('/api/v1/getFeederPopupTileData', feeder.getFeederPopupTileData);
app.post('/api/v1/addUpdateFeeder', feeder.addUpdateFeeder);
app.post('/api/v1/getFeederDetails', feeder.getFeederDetails);


app.post('/api/v1/crc', upload.single('image'), function (req, res) {

  if (!req.file) {
    console.log("No file is available!");
    return res.send({
      success: false
    });

  } else {
    console.log('File is available!');

    return res.send({
      success: true
    })
  }
});

app.post('/api/v1/firmware', uploadfirmware.single('image'), function (req, res) {
  if (!req.file) {
    console.log("No file is available!");
    return res.send({
      success: false
    });

  } else {
    console.log('File is available!');
    return res.send({
      success: true
    })
  }
});

app.post('/api/v1/fotaJson', uploadJson.single('image'), function (req, res) {
  if (!req.file) {
    console.log("No file is available!");
    return res.send({
      success: false
    });

  } else {
    console.log('File is available!');
    return res.send({
      success: true
    })
  }
});
app.get('/api/v1/checking', (req, res) => {
  res.send('Working!');
});

app.post('/return-url', (req, res) => {
  // Handle the response from CCAvenue and update your database accordingly
  console.log(req.body);
  res.send('Payment response received');
});
/* Swagger DOCUMENT API */
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));


const task = () => {
  commonrouter.getTodaysReport();
};
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
  console.log('🔌 WebSocket client connected');

  ws.on('error', (err) => {
    console.error('❌ WebSocket Error:', err);
  });
});

setWssInstance(wss);

server.listen(globalconfig.port, globalconfig.ip, () => {
  console.log('listening on port 8080');
});

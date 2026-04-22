const Device = require("./Device");
const Alert = require("./Alert");
const User = require("./User");
const DeviceCheck = require("./DeviceCheck");
const CheckResult = require("./CheckResult");
const SystemSettings = require("./SystemSettings"); 

Alert.belongsTo(Device, {
  foreignKey: "deviceId",
  as: "deviceInfo",
});
Device.hasMany(Alert, {
  foreignKey: "deviceId",
  as: "alerts",
});

Device.hasMany(DeviceCheck, {
  foreignKey: "deviceId",
  as: "checks",
});
DeviceCheck.belongsTo(Device, {
  foreignKey: "deviceId",
  as: "device",
});

DeviceCheck.hasMany(CheckResult, {
  foreignKey: "deviceCheckId",
  as: "results",
});
CheckResult.belongsTo(DeviceCheck, {
  foreignKey: "deviceCheckId",
  as: "check",
});

const models = {
  Device,
  Alert,
  User,
  DeviceCheck,
  CheckResult,
  SystemSettings,
};

Object.keys(models).forEach((modelName) => {
  if (models[modelName].associate) {
    models[modelName].associate(models);
  }
});

module.exports = {
  Device,
  Alert,
  User,
  DeviceCheck,
  CheckResult,
  SystemSettings, 
  Notification
};
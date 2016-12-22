var winston = require('winston');
require('winston-daily-rotate-file');
var path = require('path');

winston.emitErrs = true;

var logger = new winston.Logger({
  transports: [
    new winston.transports.DailyRotateFile({
      filename: path.join(__dirname, "../", "logs/log_file.log"),
      datePattern: 'yyyy-MM-dd.',
      handleExceptions: true,
      json: false,
      prepend: true,
      level: 'info' //'process.env.ENV === 'development' ? 'debug' : 'info''
    }),
    new winston.transports.Console({
      level: 'debug',
      handleExceptions: true,
      colorize: true
    })
  ],
  exitOnError: false
});

module.exports = logger;
module.exports.stream = {
  write: function(message, encoding){
      logger.info(message);
  }
};
const express = require('express')
const fs = require('fs')
const path = require('path')
const app = express()
var bodyParser = require('body-parser');
app.use(bodyParser.json());

// To serve static files (images, CSS, JS)
app.use(express.static(path.join(__dirname, 'public')))

// Configuring the database
const dbConfig = require('./config/database.config.js');
const mongoose = require('mongoose');
const GPSData = require('./app/models/gpsdata.model.js');

mongoose.Promise = global.Promise;

// Connecting to the database
mongoose.connect(dbConfig.url)
.then(() => {
    console.log("Successfully connected to the database");    
}).catch(err => {
    console.log('Could not connect to the database. Exiting now...');
    process.exit();
});

if(!String.prototype.startsWith){
    String.prototype.startsWith = function (str) {
        return !this.indexOf(str);
    }
}

function parseGPRMCData (gprmcdata) {
    gprmc = {};
    var nmea = gprmcdata.split(",");

    gprmc["status"] = (nmea[2] == "A" ? "Ok!" : "Warning");
    gprmc["latDeg"] = parseInt(nmea[3].substring(0, 2));
    gprmc["latMin"] = nmea[3].substring(2);
    gprmc["lat"] = gprmc["latDeg"] + (gprmc["latMin"]/60);
    gprmc["latDirection"] = nmea[4];

    gprmc["lngDeg"] = parseInt(nmea[5].substring(0, 3));
    gprmc["lngMin"] = nmea[5].substring(3);
    gprmc["lng"] = gprmc["lngDeg"] + (gprmc["lngMin"]/60);
    gprmc["lngDirection"] = nmea[6];
    gprmc["url"] = "http://www.google.com/maps/place/" + gprmc["lat"] + ",-" + gprmc["lng"] + "/@" + gprmc["lat"] + ",-" + gprmc["lng"] + ",17z";

    //console.log(status + " " + lat + "" + latDirection + " " + lng + "" + lngDirection);
    console.log("http://www.google.com/maps/place/" + gprmc["lat"] + ",-" + gprmc["lng"] + "/@" + gprmc["lat"] + ",-" + gprmc["lng"] + ",17z");
    return gprmc;
}

function parseGPGGAData (gpggadata) {
    gpgga = {};
    var nmea = gpggadata.split(",");

    gpgga["latDeg"] = parseInt(nmea[2].substring(0, 2));
    gpgga["latMin"] = nmea[2].substring(2);
    gpgga["lat"] = gpgga["latDeg"] + (gpgga["latMin"]/60);
    gpgga["latDirection"] = nmea[3];

    gpgga["lngDeg"] = parseInt(nmea[4].substring(0, 3));
    gpgga["lngMin"] = nmea[4].substring(3);
    gpgga["lng"] = gpgga["lngDeg"] + (gpgga["lngMin"]/60);
    gpgga["lngDirection"] = nmea[5];

    gpgga["satelites"] = parseInt(nmea[7]);
    gpgga["alt"] = nmea[9];
    gpgga["url"] = "http://www.google.com/maps/place/" + gpgga["lat"] + ",-" + gpgga["lng"] + "/@" + gpgga["lat"] + ",-" + gpgga["lng"] + ",17z";
    return gpgga;
}

app.get('/', function(req, res) {
    res.end('hello')
});

app.post('/gpsdata', function(req, res) {
    const data = req.body;
    console.log("req.query.data = ", data);
    //res.end("ok");
});

app.get('/gpsdata', function(req, res) {
    const gps_data = req.query.gps;
    console.log("req.query.gps = ", gps_data);
    let len = gps_data.length;
    console.log("len = ", len);
    if (gps_data && len > 0 ) {
        var parts = gps_data.split("::");
        var guid = parts[0].split(":")[1];
        console.log('guid = ', guid);
        var simid = parts[1].split(":")[1];
        console.log('simid = ', simid);
        var temp = parts[2];
        var str = temp.substr(7,len-14);
        console.log("raw = ", str);
        var pos1 = str.indexOf("$");
        var pos2 = str.indexOf("$", pos1+1);
        var pos3 = str.indexOf("$", pos2+1);
        var pos4 = str.indexOf("$", pos3+1);
        var arr = [];
        arr.push(str.substr(pos1,pos2-1));
        arr.push(str.substr(pos2,pos3-1));
        arr.push(str.substr(pos3));
        /*var str1 = str.substr(pos1,pos2-1);
        var str2 = str.substr(pos2,pos3-1);
        var str3 = str.substr(pos3);*/
        console.log(arr[0]);
        console.log(arr[1]);
        console.log(arr[2]);

        var gprmc_data = null;
        var gpgga_data = null;
        for (var i = 0; i < arr.length; i++) {
            if (arr[i].startsWith("$GPRMC")) {
                gprmc_data = parseGPRMCData(arr[i]);
            } else if (arr[i].startsWith("$GPGGA")) {
                gpgga_data = parseGPGGAData(arr[i]);
            }
        }

        // parse gps data tp extract relevant info
        const gd = new GPSData({
            guid: guid?guid:"testguid12345", //req.params.guid
            iccid: simid?simid:"21312432352356346", //req.params.imei
            gpsdata: gps_data,
            gprmc: gprmc_data, //req.params.lat
            gpgga: gpgga_data  //req.params.lng
        });

        gd.save()
        .then(data => {
            res.end("ok");
        }).catch(err => {
            res.status(500).send({
                message: err.message || "Some error occurred while creating new entry"
            });
        });
    } else {
        res.end("ok");
    }
});

// Require GPSData routers
//require('./app/routes/gpsdata.routes.js')(app);

app.listen(80, function () {
    console.log('Listening on port 3000!')
});
